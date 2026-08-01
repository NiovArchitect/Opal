defmodule OpalCore.SocialFlow.FamilyMembership do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "family_memberships" do
    field :role, :string
    field :account_kind, :string, default: "adult"
    field :status, :string, default: "active"
    field :display_name, :string
    field :idempotency_key, :string
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :family_id,
      :user_id,
      :role,
      :account_kind,
      :status,
      :display_name,
      :idempotency_key
    ])
    |> validate_required([:family_id, :user_id, :role, :account_kind, :status, :idempotency_key])
    |> validate_inclusion(:role, ~w(guardian co_guardian youth))
    |> validate_inclusion(:account_kind, ~w(adult guardian_managed_youth))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "family_id" => m.family_id,
      "user_id" => m.user_id,
      "role" => m.role,
      "account_kind" => m.account_kind,
      "status" => m.status,
      "display_name" => m.display_name
    }
  end
end
