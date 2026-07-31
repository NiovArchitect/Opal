defmodule OpalCore.Consent do
  @moduledoc """
  Authoritative consent loading and validation.

  Client-supplied consent status is never trusted.
  """

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

  @doc """
  Loads the authoritative consent proof by id and validates it for the job.
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

          proof.conversation_id != conversation_id ->
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

          proof.status != "granted" ->
            {:error, :not_granted}

          true ->
            {:ok, proof}
        end
    end
  end

  def get_proof(id), do: Repo.get(ConsentProof, id)

  def list_for_user(user_id) do
    from(p in ConsentProof, where: p.user_id == ^user_id)
    |> Repo.all()
  end
end
