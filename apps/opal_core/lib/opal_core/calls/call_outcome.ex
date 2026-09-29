defmodule OpalCore.Calls.CallOutcome do
  @moduledoc """
  Evidence that a call produced an operational plan change.
  This is lineage for the call. It is not long-term memory and not a summary.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @types ~w(plan_time_proposal activity_proposal plan_time_accepted activity_accepted)

  schema "call_outcomes" do
    field :call_id, :binary_id
    field :conversation_id, :binary_id
    field :source_segment_ids, {:array, :binary_id}, default: []
    field :outcome_type, :string
    field :entity_id, :string

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def types, do: @types

  def changeset(outcome \\ %__MODULE__{}, attrs) do
    outcome
    |> cast(attrs, [:call_id, :conversation_id, :source_segment_ids, :outcome_type, :entity_id])
    |> validate_required([:call_id, :outcome_type])
    |> validate_inclusion(:outcome_type, @types)
  end
end
