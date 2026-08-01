defmodule OpalCore.SocialFlow.ApprovedContactRequest do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "approved_contact_requests" do
    field :requested_contact_user_id, :binary_id
    field :reason, :string
    field :requested_capability, :string, default: "bounded_chat"
    field :status, :string, default: "pending"
    field :scope, :string
    field :expires_at, :utc_datetime_usec
    field :reviewed_by_user_id, :binary_id
    field :reviewed_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :youth_user, OpalCore.Accounts.User, foreign_key: :youth_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :family_id,
      :youth_user_id,
      :requested_contact_user_id,
      :reason,
      :requested_capability,
      :status,
      :scope,
      :expires_at,
      :reviewed_by_user_id,
      :reviewed_at,
      :idempotency_key
    ])
    |> validate_required([
      :family_id,
      :youth_user_id,
      :requested_contact_user_id,
      :reason,
      :status,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key)
  end
end
