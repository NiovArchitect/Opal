defmodule OpalCore.SocialFlow.VerifiedCommunicationIdentifier do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "verified_communication_identifiers" do
    field :verification_state, :string, default: "active"
    field :verified_at, :utc_datetime_usec
    field :verification_expires_at, :utc_datetime_usec
    field :provider_reference, :string
    field :ownership_version, :integer, default: 1
    field :last_reviewed_at, :utc_datetime_usec
    field :detached_at, :utc_datetime_usec
    field :idempotency_key, :string

    belongs_to :communication_identifier, OpalCore.SocialFlow.CommunicationIdentifier
    belongs_to :human_account, OpalCore.Accounts.User, foreign_key: :human_account_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(v, attrs) do
    v
    |> cast(attrs, [
      :communication_identifier_id,
      :human_account_id,
      :verification_state,
      :verified_at,
      :verification_expires_at,
      :provider_reference,
      :ownership_version,
      :last_reviewed_at,
      :detached_at,
      :idempotency_key
    ])
    |> validate_required([
      :communication_identifier_id,
      :human_account_id,
      :verification_state,
      :verified_at,
      :idempotency_key
    ])
    |> validate_inclusion(:verification_state, ~w(active detached superseded quarantined))
    |> unique_constraint(:idempotency_key)
  end
end
