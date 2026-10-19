defmodule OpalCore.SocialFlow.RelationshipIntention do
  @moduledoc """
  Repair #18 adoption wave 1, ST-A - a durable relationship intention.

  An intention is the OWNER's own stated rhythm with a person, in the
  owner's words ("See Maya every month"). It is its own kind in Graphs
  alongside plans - never a plan state. Its progress is derived at
  read time from the one plan projection (see `OpalCore.GraphPeople`);
  this row stores only what the owner said, never a derived fact and
  never anything about the other person.

  Guardrail (product law): an intention describes the owner's rhythm
  only. No field here, and no projection of it, may hold a score,
  grade, or metric about the subject.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "relationship_intentions" do
    field :owner_user_id, :binary_id
    field :subject_user_id, :binary_id
    field :title, :string
    field :cadence_days, :integer
    field :missed_surfaced_for_plan_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(intention, attrs) do
    intention
    |> cast(attrs, [:title, :cadence_days, :missed_surfaced_for_plan_id])
    |> validate_required([:title])
    |> validate_length(:title, min: 1, max: 160)
    |> validate_number(:cadence_days, greater_than: 0, less_than_or_equal_to: 366)
  end
end
