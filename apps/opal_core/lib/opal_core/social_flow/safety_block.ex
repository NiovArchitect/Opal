defmodule OpalCore.SocialFlow.SafetyBlock do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "safety_blocks" do
    field :scope, :string, default: "relationship"
    field :conversation_id, :binary_id
    field :family_id, :binary_id
    field :status, :string, default: "active"
    field :reason_class, :string
    field :suspended_contact_id, :binary_id
    field :idempotency_key, :string
    field :revoked_at, :utc_datetime_usec
    belongs_to :blocker_user, OpalCore.Accounts.User, foreign_key: :blocker_user_id
    belongs_to :blocked_user, OpalCore.Accounts.User, foreign_key: :blocked_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(b, attrs) do
    b
    |> cast(attrs, [
      :blocker_user_id,
      :blocked_user_id,
      :scope,
      :conversation_id,
      :family_id,
      :status,
      :reason_class,
      :suspended_contact_id,
      :idempotency_key,
      :revoked_at
    ])
    |> validate_required([:blocker_user_id, :blocked_user_id, :scope, :status, :idempotency_key])
    |> validate_inclusion(:scope, ~w(relationship conversation account))
    |> validate_inclusion(:status, ~w(active revoked))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = b) do
    %{
      "id" => b.id,
      "blocker_user_id" => b.blocker_user_id,
      "blocked_user_id" => b.blocked_user_id,
      "scope" => b.scope,
      "status" => b.status,
      "no_behavior_score" => true
    }
  end
end
