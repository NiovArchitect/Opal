defmodule OpalCore.SocialFlow.CommunicationIdentifier do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "communication_identifiers" do
    field :identifier_type, :string, default: "phone_number"
    field :lookup_digest, :string
    field :secure_ref, :string
    field :region, :string, default: "US"
    field :status, :string, default: "unverified"
    field :ownership_version, :integer, default: 1
    field :detached_at, :utc_datetime_usec
    field :quarantined_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec
    field :idempotency_key, :string
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :identifier_type,
      :lookup_digest,
      :secure_ref,
      :region,
      :status,
      :ownership_version,
      :detached_at,
      :quarantined_at,
      :superseded_at,
      :idempotency_key
    ])
    |> validate_required([
      :identifier_type,
      :lookup_digest,
      :secure_ref,
      :region,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(
      :status,
      ~w(unverified active verification_expired reassignment_suspected quarantined detached replaced)
    )
    |> unique_constraint(:idempotency_key)
    |> unique_constraint(:lookup_digest)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "identifier_type" => c.identifier_type,
      "status" => c.status,
      "region" => c.region,
      "ownership_version" => c.ownership_version,
      "no_raw_identifier" => true,
      "not_legal_identity" => true
    }
  end
end
