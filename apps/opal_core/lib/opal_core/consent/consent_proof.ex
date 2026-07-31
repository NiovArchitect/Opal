defmodule OpalCore.Consent.ConsentProof do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @capabilities ~w(
    ai_echo
    safe_drafting
    transcription
    translation
    commitment_candidate_extraction
  )
  @statuses ~w(granted denied revoked expired)

  schema "consent_proofs" do
    field :capability, :string
    field :status, :string
    field :granted_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :policy_version, :string
    field :evidence_type, :string
    field :evidence_reference, :string
    field :schema_version, :string, default: "0.1.0"

    belongs_to :user, OpalCore.Accounts.User
    belongs_to :conversation, OpalCore.Messaging.Conversation

    timestamps(type: :utc_datetime_usec)
  end

  def capabilities, do: @capabilities
  def statuses, do: @statuses

  def changeset(proof, attrs) do
    proof
    |> cast(attrs, [
      :id,
      :user_id,
      :conversation_id,
      :capability,
      :status,
      :granted_at,
      :expires_at,
      :revoked_at,
      :policy_version,
      :evidence_type,
      :evidence_reference,
      :schema_version
    ])
    |> validate_required([
      :user_id,
      :conversation_id,
      :capability,
      :status,
      :policy_version,
      :evidence_type,
      :evidence_reference
    ])
    |> validate_inclusion(:capability, @capabilities)
    |> validate_inclusion(:status, @statuses)
  end

  def to_contract(%__MODULE__{} = proof) do
    %{
      "schema_version" => proof.schema_version,
      "id" => proof.id,
      "user_id" => proof.user_id,
      "conversation_id" => proof.conversation_id,
      "capability" => proof.capability,
      "status" => proof.status,
      "granted_at" => datetime_or_nil(proof.granted_at),
      "expires_at" => datetime_or_nil(proof.expires_at),
      "revoked_at" => datetime_or_nil(proof.revoked_at),
      "policy_version" => proof.policy_version,
      "evidence_type" => proof.evidence_type,
      "evidence_reference" => proof.evidence_reference,
      "created_at" => DateTime.to_iso8601(proof.inserted_at)
    }
  end

  defp datetime_or_nil(nil), do: nil
  defp datetime_or_nil(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
end
