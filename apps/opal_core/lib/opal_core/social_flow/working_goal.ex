defmodule OpalCore.SocialFlow.WorkingGoal do
  @moduledoc """
  Repair #18 adoption wave 1, 4.C10 - a durable goal the owner is
  working toward ("See Dad monthly", "Olivia's birthday, handled
  early"). A goal outlives any single plan. This row stores only the
  owner's words and the ids of the plans they linked; the status line
  is derived at read time from those linked plans (see
  `OpalCore.GraphPeople`) - Opal may summarize real activity, it never
  stores or invents progress.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "working_goals" do
    field :owner_user_id, :binary_id
    field :title, :string
    field :linked_plan_ids, {:array, :binary_id}, default: []

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(goal, attrs) do
    goal
    |> cast(attrs, [:title, :linked_plan_ids])
    |> validate_required([:title])
    |> validate_length(:title, min: 1, max: 160)
  end
end
