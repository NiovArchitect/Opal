defmodule OpalCore.DecisionIntelligence.DecisionResult do
  @moduledoc """
  Authoritative DecisionResult — provisional until accepted/earned truth.

  High confidence ≠ confirmation. Gold is never set from confidence alone.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(provisional accepted invalidated settled)
  @truth_states ~w(provisional accepted ready reserved confirmed invalidated settled)
  @confidence ~w(high)
  @modes ~w(high)

  schema "decision_results" do
    field :based_on_context_revision, :integer
    field :result_revision, :integer, default: 1
    field :mode, :string, default: "high"
    field :scope_type, :string
    field :answer_type, :string, default: "place"
    field :answer_entity_type, :string, default: "place"
    field :answer_entity_id, :string
    field :answer_payload, :map, default: %{}
    field :truth_state, :string, default: "provisional"
    field :confidence_class, :string, default: "high"
    field :confidence_factors, :map, default: %{}
    field :provider_state, :string, default: "unverified"
    field :evidence_refs, {:array, :binary_id}, default: []
    field :invalidation_conditions, {:array, :map}, default: []
    field :explanation_private, :map, default: %{}
    field :explanation_shareable, :map, default: %{}
    field :actions, {:array, :map}, default: []
    field :candidate_source, :string, default: "fixture_catalog"
    field :policy_version, :string, default: "p4.2.high.v1"
    field :model_version, :string
    field :status, :string, default: "provisional"
    field :correlation_id, :string
    field :graph_id, :binary_id
    field :accepted_at, :utc_datetime_usec

    belongs_to :decision, OpalCore.DecisionIntelligence.DecisionContext, foreign_key: :decision_id

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def create_changeset(attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :decision_id,
      :based_on_context_revision,
      :result_revision,
      :mode,
      :scope_type,
      :answer_type,
      :answer_entity_type,
      :answer_entity_id,
      :answer_payload,
      :truth_state,
      :confidence_class,
      :confidence_factors,
      :provider_state,
      :evidence_refs,
      :invalidation_conditions,
      :explanation_private,
      :explanation_shareable,
      :actions,
      :candidate_source,
      :policy_version,
      :model_version,
      :status,
      :correlation_id,
      :graph_id,
      :accepted_at
    ])
    |> validate_required([
      :decision_id,
      :based_on_context_revision,
      :scope_type,
      :answer_entity_id,
      :confidence_class,
      :candidate_source,
      :policy_version,
      :status
    ])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:truth_state, @truth_states)
    |> validate_inclusion(:confidence_class, @confidence)
    |> validate_inclusion(:mode, @modes)
    |> unique_constraint([:decision_id, :based_on_context_revision, :result_revision],
      name: :decision_results_decision_ctx_rev_uniq
    )
  end

  def accept_changeset(%__MODULE__{} = r, graph_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    r
    |> change(%{
      status: "accepted",
      truth_state: "accepted",
      graph_id: graph_id,
      accepted_at: now
    })
  end
end
