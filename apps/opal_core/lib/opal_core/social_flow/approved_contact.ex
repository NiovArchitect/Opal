defmodule OpalCore.SocialFlow.ApprovedContact do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "approved_contacts" do
    field :contact_user_id, :binary_id
    field :scope, :string, default: "project"
    field :status, :string, default: "active"
    field :capabilities, {:array, :string}, default: []
    field :conversation_id, :binary_id
    field :expires_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :revoked_by_user_id, :binary_id
    field :idempotency_key, :string
    field :no_location_sharing, :boolean, default: true
    field :no_contact_forwarding, :boolean, default: true
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :youth_user, OpalCore.Accounts.User, foreign_key: :youth_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :family_id,
      :youth_user_id,
      :contact_user_id,
      :scope,
      :status,
      :capabilities,
      :conversation_id,
      :expires_at,
      :revoked_at,
      :revoked_by_user_id,
      :idempotency_key,
      :no_location_sharing,
      :no_contact_forwarding
    ])
    |> validate_required([
      :family_id,
      :youth_user_id,
      :contact_user_id,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:status, ~w(active expired revoked))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "youth_user_id" => c.youth_user_id,
      "contact_user_id" => c.contact_user_id,
      "scope" => c.scope,
      "status" => c.status,
      "expires_at" => c.expires_at && DateTime.to_iso8601(c.expires_at),
      "no_location_sharing" => c.no_location_sharing,
      "no_contact_forwarding" => c.no_contact_forwarding,
      "no_public_discovery" => true
    }
  end
end
