defmodule OpalCore.Consent do
  @moduledoc """
  Authoritative consent loading, grant/revoke, and validation.

  Client-supplied consent status is never trusted.
  """

  require Logger

  import Ecto.Query

  alias OpalCore.Consent.ConsentProof
  alias OpalCore.Repo

  @type validation_error ::
          :not_found
          | :capability_mismatch
          | :user_mismatch
          | :conversation_mismatch
          | :not_granted
          | :expired
          | :revoked
          | :denied
          | :policy_version_rejected

  @type grant_error ::
          :unknown_capability
          | :expires_at_required
          | :invalid_expires_at
          | :user_id_required
          | :changeset_invalid

  @doc """
  Act-on-behalf capabilities registered for grant/revoke.

  Product labels → registry tokens (snake_case law):
  - calls:outbound → calls_outbound
  - bookings:reserve → bookings_reserve
  - messaging:business → messaging_business (execution ABSENT — no send path)
  """
  def act_on_behalf_capabilities, do: ~w(calls_outbound bookings_reserve messaging_business)

  def capability_label_map do
    %{
      "calls:outbound" => "calls_outbound",
      "bookings:reserve" => "bookings_reserve",
      "messaging:business" => "messaging_business"
    }
  end

  @doc """
  Execution readiness for a registered act-on-behalf capability.

  `:gated` — real path exists and is consent-gated.
  `:absent` — capability is grantable but no execution path ships (no stub).
  `:unknown` — not an act-on-behalf capability.
  """
  def execution_status(cap) when is_binary(cap) do
    case normalize_capability(cap) do
      "calls_outbound" -> :gated
      "bookings_reserve" -> :gated
      "messaging_business" -> :absent
      _ -> :unknown
    end
  end

  @doc """
  Loads the authoritative consent proof by id and validates it for the job.

  User-wide proofs (`conversation_id` nil) authorize any conversation_id.
  Conversation-scoped proofs require an exact match.
  """
  @spec validate_for_job(map()) :: {:ok, ConsentProof.t()} | {:error, validation_error()}
  def validate_for_job(%{
        consent_proof_id: consent_proof_id,
        capability: capability,
        user_id: user_id,
        conversation_id: conversation_id
      }) do
    case Repo.get(ConsentProof, consent_proof_id) do
      nil ->
        {:error, :not_found}

      %ConsentProof{} = proof ->
        now = DateTime.utc_now()
        accepted = Application.fetch_env!(:opal_core, :accepted_policy_versions)

        cond do
          proof.capability != capability ->
            {:error, :capability_mismatch}

          proof.user_id != user_id ->
            {:error, :user_mismatch}

          conversation_mismatch?(proof.conversation_id, conversation_id) ->
            {:error, :conversation_mismatch}

          proof.policy_version not in accepted ->
            {:error, :policy_version_rejected}

          proof.status == "denied" ->
            {:error, :denied}

          proof.status == "revoked" or not is_nil(proof.revoked_at) ->
            {:error, :revoked}

          proof.status == "expired" ->
            {:error, :expired}

          not is_nil(proof.expires_at) and DateTime.compare(proof.expires_at, now) != :gt ->
            {:error, :expired}

          # Immortal grants are rejected at validate time even if status slipped through.
          is_nil(proof.expires_at) ->
            {:error, :expired}

          proof.status != "granted" ->
            {:error, :not_granted}

          true ->
            {:ok, proof}
        end
    end
  end

  @doc """
  Issue a server-side ConsentProof. Status is always "granted" — never client-supplied.

  opts (keyword or map):
  - `:conversation_id` — nil for user-wide grants
  - `:expires_at` — **required** DateTime (no immortal grants)
  - `:policy_version` — defaults to first accepted policy version
  - `:evidence_type` / `:evidence_reference` — defaults to server_grant provenance
  """
  @spec grant(String.t(), String.t(), keyword() | map()) ::
          {:ok, ConsentProof.t()} | {:error, grant_error() | term()}
  def grant(user_id, capability, opts \\ [])

  def grant(user_id, capability, opts) when is_binary(user_id) and is_binary(capability) do
    opts = normalize_opts(opts)
    capability = normalize_capability(capability)

    cond do
      capability not in ConsentProof.capabilities() ->
        {:error, :unknown_capability}

      true ->
        case fetch_expires_at(opts) do
          {:error, reason} ->
            {:error, reason}

          {:ok, expires_at} ->
            now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
            policy = opts[:policy_version] || opts["policy_version"] || current_policy_version()

            attrs = %{
              user_id: user_id,
              conversation_id: opts[:conversation_id] || opts["conversation_id"],
              capability: capability,
              status: "granted",
              granted_at: now,
              expires_at: expires_at,
              revoked_at: nil,
              policy_version: policy,
              evidence_type: opts[:evidence_type] || opts["evidence_type"] || "server_grant",
              evidence_reference:
                opts[:evidence_reference] || opts["evidence_reference"] ||
                  "consent.grant/#{user_id}/#{capability}"
            }

            %ConsentProof{}
            |> ConsentProof.changeset(attrs)
            |> Repo.insert()
            |> case do
              {:ok, proof} -> {:ok, proof}
              {:error, %Ecto.Changeset{} = cs} -> {:error, {:changeset_invalid, cs}}
              {:error, other} -> {:error, other}
            end
        end
    end
  end

  def grant(_, _, _), do: {:error, :user_id_required}

  @doc """
  Revoke a proof. Only the owning user_id may revoke.
  Status is set server-side — client status is ignored.
  """
  @spec revoke(String.t(), String.t()) ::
          {:ok, ConsentProof.t()} | {:error, :not_found | :user_mismatch | term()}
  def revoke(proof_id, user_id) when is_binary(proof_id) and is_binary(user_id) do
    case Repo.get(ConsentProof, proof_id) do
      nil ->
        {:error, :not_found}

      %ConsentProof{user_id: ^user_id} = proof ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        proof
        |> ConsentProof.changeset(%{status: "revoked", revoked_at: now})
        |> Repo.update()

      %ConsentProof{} ->
        {:error, :user_mismatch}
    end
  end

  def revoke(_, _), do: {:error, :not_found}

  @doc """
  Gate an act-on-behalf action. Returns `{:ok, proof}` or `{:error, {:consent, reason}}`.
  Never trusts client-supplied status.
  """
  def require_for_action(user_id, capability, conversation_id, attrs)
      when is_binary(user_id) and is_binary(capability) do
    attrs = stringify_map(attrs || %{})
    proof_id = attrs["consent_proof_id"]
    capability = normalize_capability(capability)

    result =
      cond do
        not is_binary(proof_id) or proof_id == "" ->
          {:error, :not_found}

        true ->
          validate_for_job(%{
            consent_proof_id: proof_id,
            capability: capability,
            user_id: user_id,
            conversation_id: conversation_id
          })
      end

    case result do
      {:ok, proof} ->
        {:ok, proof}

      {:error, reason} ->
        Logger.warning(
          "consent gate blocked user_id=#{user_id} capability=#{capability} reason=#{inspect(reason)}"
        )

        {:error, {:consent, reason}}
    end
  end

  def get_proof(id), do: Repo.get(ConsentProof, id)

  def list_for_user(user_id) do
    from(p in ConsentProof, where: p.user_id == ^user_id)
    |> Repo.all()
  end

  def current_policy_version do
    Application.fetch_env!(:opal_core, :accepted_policy_versions) |> List.first()
  end

  defp conversation_mismatch?(nil, _job_conversation_id), do: false

  defp conversation_mismatch?(proof_conversation_id, job_conversation_id) do
    proof_conversation_id != job_conversation_id
  end

  defp fetch_expires_at(opts) do
    case opts[:expires_at] || opts["expires_at"] do
      %DateTime{} = dt ->
        {:ok, DateTime.truncate(dt, :microsecond)}

      iso when is_binary(iso) ->
        case DateTime.from_iso8601(iso) do
          {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
          _ -> {:error, :invalid_expires_at}
        end

      nil ->
        {:error, :expires_at_required}

      _ ->
        {:error, :invalid_expires_at}
    end
  end

  defp normalize_capability(cap) when is_binary(cap) do
    Map.get(capability_label_map(), cap, cap)
  end

  defp normalize_opts(opts) when is_list(opts), do: Map.new(opts)
  defp normalize_opts(opts) when is_map(opts), do: opts
  defp normalize_opts(_), do: %{}

  defp stringify_map(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
