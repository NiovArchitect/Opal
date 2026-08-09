defmodule OpalCore.SocialFlow.PurposeBoundShare do
  @moduledoc """
  Smallest clean foundation for purpose-bound availability sharing.

  Purposes:
  - share this time
  - share for this conversation
  - share for this plan
  - share until expiry
  - revoke

  Doctrine preserved:
  - private fact ≠ shared fact
  - shared fact ≠ permission to reveal derived conclusion
  - no generic enterprise permissions matrix
  """

  @purposes ~w(this_time this_conversation this_plan until_expiry)
  @schema "0.1.0"

  @doc "Allowed purpose tokens."
  def purposes, do: @purposes

  @doc """
  Build a purpose-bound share request (not yet applied).

  Elixir availability share still performs the durable write; this contract
  attaches purpose/expiry/scope metadata for future policy checks.
  """
  def build_request(attrs) when is_map(attrs) do
    a = stringify(attrs)
    purpose = a["purpose"] || "this_conversation"

    cond do
      purpose not in @purposes ->
        {:error, :unknown_purpose}

      not is_binary(a["owner_user_id"]) ->
        {:error, :owner_required}

      not is_binary(a["conversation_id"]) ->
        {:error, :conversation_required}

      purpose == "until_expiry" and is_nil(a["expires_at"]) ->
        {:error, :expires_at_required}

      true ->
        {:ok,
         %{
           "schema_version" => @schema,
           "owner_user_id" => a["owner_user_id"],
           "conversation_id" => a["conversation_id"],
           "window_ids" => List.wrap(a["window_ids"] || []),
           "purpose" => purpose,
           "plan_id" => a["plan_id"],
           "expires_at" => a["expires_at"],
           "reveal_derived_conclusion" => false,
           "shared_safe_only" => true,
           "revocable" => true
         }}
    end
  end

  def build_request(_), do: {:error, :invalid_request}

  @doc """
  Policy check: a shared fact never implies permission to reveal private reasons
  or derived conclusions beyond the shared-safe range.
  """
  def may_reveal_derived_conclusion?(share_request) when is_map(share_request) do
    s = stringify(share_request)
    s["reveal_derived_conclusion"] == true
  end

  def may_reveal_derived_conclusion?(_), do: false

  @doc """
  Whether a purpose-bound grant is still live.
  """
  def active?(share_request, now \\ DateTime.utc_now())

  def active?(share_request, now) when is_map(share_request) do
    s = stringify(share_request)

    cond do
      s["revoked"] == true ->
        false

      s["purpose"] == "until_expiry" ->
        case parse_dt(s["expires_at"]) do
          {:ok, exp} -> DateTime.compare(exp, now) == :gt
          _ -> false
        end

      true ->
        true
    end
  end

  def active?(_, _), do: false

  @doc "Revocation marker (pure)."
  def revoke(share_request) when is_map(share_request) do
    share_request
    |> stringify()
    |> Map.put("revoked", true)
    |> Map.put("revoked_at", DateTime.utc_now() |> DateTime.to_iso8601())
  end

  def revoke(_), do: {:error, :invalid_request}

  defp parse_dt(%DateTime{} = dt), do: {:ok, dt}

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, dt}
      _ -> :error
    end
  end

  defp parse_dt(_), do: :error

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
