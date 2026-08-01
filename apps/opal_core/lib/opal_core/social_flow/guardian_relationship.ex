defmodule OpalCore.SocialFlow.GuardianRelationship do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "guardian_relationships" do
    field :authority_class, :string, default: "primary"
    field :status, :string, default: "active"
    field :authority_version, :integer, default: 1
    field :revoked_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :guardian_user, OpalCore.Accounts.User, foreign_key: :guardian_user_id
    belongs_to :youth_user, OpalCore.Accounts.User, foreign_key: :youth_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(g, attrs) do
    g
    |> cast(attrs, [
      :family_id,
      :guardian_user_id,
      :youth_user_id,
      :authority_class,
      :status,
      :authority_version,
      :revoked_at,
      :idempotency_key
    ])
    |> validate_required([
      :family_id,
      :guardian_user_id,
      :youth_user_id,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:status, ~w(active revoked suspended))
    |> validate_inclusion(:authority_class, ~w(primary co_guardian limited))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = g) do
    %{
      "id" => g.id,
      "family_id" => g.family_id,
      "guardian_user_id" => g.guardian_user_id,
      "youth_user_id" => g.youth_user_id,
      "authority_class" => g.authority_class,
      "status" => g.status,
      "authority_version" => g.authority_version
    }
  end
end
