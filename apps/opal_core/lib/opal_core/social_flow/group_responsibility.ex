defmodule OpalCore.SocialFlow.GroupResponsibility do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_responsibilities" do
    field :description, :string
    field :status, :string
    field :visibility, :string, default: "shared"
    field :accepted_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :plan, OpalCore.SocialFlow.GroupSharedPlan
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :plan_id,
      :owner_user_id,
      :description,
      :status,
      :visibility,
      :accepted_at,
      :completed_at,
      :idempotency_key
    ])
    |> validate_required([:plan_id, :owner_user_id, :description, :status, :idempotency_key])
    |> validate_inclusion(:status, ~w(proposed accepted completed cancelled))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "plan_id" => r.plan_id,
      "owner_user_id" => r.owner_user_id,
      "description" => r.description,
      "status" => r.status,
      "visibility" => r.visibility
    }
  end
end
