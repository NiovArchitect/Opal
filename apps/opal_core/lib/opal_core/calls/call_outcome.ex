defmodule OpalCore.Calls.CallOutcome do
  @moduledoc """
  Structured conversation outcome lineage.

  This records what is now true, proposed, kept, or left open because of
  conversational evidence. It is event lineage — never SharedPlan authority,
  never a prose summary, and never long-term personal memory.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Internal engineering names stay precise. User-facing copy is separate.
  @types ~w(
    plan_time_proposed
    plan_time_changed
    plan_time_kept
    plan_activity_proposed
    plan_activity_changed
    plan_activity_kept
    plan_place_proposed
    plan_place_changed
    plan_place_kept
    unresolved_decision
    commitment_created
    commitment_updated
    commitment_revoked
    contribution_assigned
    contribution_updated
    open_question_created
    open_question_resolved
    waiting_on_created
    waiting_on_resolved
    booking_authorized
    booking_submitted
    booking_confirmed
    booking_failed
  )

  @statuses ~w(recorded superseded revoked)

  schema "call_outcomes" do
    field :call_id, :binary_id
    field :conversation_id, :binary_id
    field :source_type, :string
    field :source_segment_ids, {:array, :binary_id}, default: []
    field :outcome_type, :string
    field :entity_type, :string
    field :entity_id, :string
    field :before_value, :string
    field :after_value, :string
    field :proposer_user_id, :binary_id
    field :accepter_user_id, :binary_id
    field :actor_user_id, :binary_id
    field :status, :string, default: "recorded"
    field :plan_id, :binary_id
    field :plan_version, :integer
    field :proposal_key, :string
    field :idempotency_key, :string
    field :provenance, :map, default: %{}

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def types, do: @types
  def statuses, do: @statuses

  def changeset(outcome \\ %__MODULE__{}, attrs) do
    outcome
    |> cast(attrs, [
      :call_id,
      :conversation_id,
      :source_type,
      :source_segment_ids,
      :outcome_type,
      :entity_type,
      :entity_id,
      :before_value,
      :after_value,
      :proposer_user_id,
      :accepter_user_id,
      :actor_user_id,
      :status,
      :plan_id,
      :plan_version,
      :proposal_key,
      :idempotency_key,
      :provenance
    ])
    |> validate_required([:outcome_type, :source_type])
    |> validate_inclusion(:outcome_type, @types)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:idempotency_key, name: :call_outcomes_idempotency_key_uniq)
  end
end
