defmodule OpalCore.SocialFlow.YouthCapabilityPolicy do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "youth_capability_policies" do
    field :capability, :string
    field :mode, :string, default: "denied"
    field :status, :string, default: "active"
    field :idempotency_key, :string
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :youth_user, OpalCore.Accounts.User, foreign_key: :youth_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :family_id,
      :youth_user_id,
      :capability,
      :mode,
      :status,
      :idempotency_key
    ])
    |> validate_required([
      :family_id,
      :youth_user_id,
      :capability,
      :mode,
      :status,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key)
  end
end
