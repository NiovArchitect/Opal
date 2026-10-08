defmodule OpalCore.SocialMemory.PlanMemory do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @roles ~w(lead participant observer)
  @statuses ~w(active completed cancelled)

  schema "plan_memories" do
    field :account_id, :binary_id
    field :plan_id, :binary_id
    field :user_role, :string, default: "participant"
    field :user_commitments, {:array, :map}, default: []
    field :related_conversation_ids, {:array, :binary_id}, default: []
    field :status, :string, default: "active"
    field :plan_label, :string
    field :time_label, :string
    field :place_label, :string
    field :start_at, :utc_datetime_usec
    field :end_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :plan_id,
      :user_role,
      :user_commitments,
      :related_conversation_ids,
      :status,
      :plan_label,
      :time_label,
      :place_label,
      :start_at,
      :end_at
    ])
    |> validate_required([:account_id, :plan_id])
    |> validate_inclusion(:user_role, @roles)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:account_id, :plan_id], name: :plan_memories_account_plan_index)
  end
end
