defmodule OpalCore.DecisionIntelligence.DecisionResult do
  @moduledoc """
  Authoritative DecisionResult — high answer, medium one-question, or low one-tradeoff.

  High confidence ≠ confirmation. Medium = one human-necessary question.
  Low = one real human tradeoff (never hard-constraint violation as an option).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(provisional accepted invalidated settled awaiting_answer answered superseded awaiting_tradeoff tradeoff_resolved)
  @truth_states ~w(provisional accepted ready reserved confirmed invalidated settled)
  @confidence ~w(high medium low)
  @modes ~w(high medium low)
  @question_statuses ~w(open answered superseded settled)
  @tradeoff_statuses ~w(open selected superseded settled)

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
    field :question_id, :string
    field :question_dimension, :string
    field :question_payload, :map, default: %{}
    field :question_status, :string
    field :question_target_user_id, :binary_id
    field :conflict_id, :string
    field :conflict_type, :string
    field :tradeoff_axis, :string
    field :tradeoff_payload, :map, default: %{}
    field :tradeoff_status, :string
    field :tradeoff_selected, :string

    belongs_to :decision, OpalCore.DecisionIntelligence.DecisionContext, foreign_key: :decision_id

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def question_statuses, do: @question_statuses
  def tradeoff_statuses, do: @tradeoff_statuses

  def create_changeset(attrs) do
    mode = Map.get(attrs, :mode) || Map.get(attrs, "mode") || "high"

    required =
      case mode do
        "medium" ->
          [
            :decision_id,
            :based_on_context_revision,
            :scope_type,
            :confidence_class,
            :candidate_source,
            :policy_version,
            :status,
            :question_id,
            :question_dimension
          ]

        "low" ->
          [
            :decision_id,
            :based_on_context_revision,
            :scope_type,
            :confidence_class,
            :candidate_source,
            :policy_version,
            :status,
            :conflict_id,
            :tradeoff_axis
          ]

        _ ->
          [
            :decision_id,
            :based_on_context_revision,
            :scope_type,
            :answer_entity_id,
            :confidence_class,
            :candidate_source,
            :policy_version,
            :status
          ]
      end

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
      :accepted_at,
      :question_id,
      :question_dimension,
      :question_payload,
      :question_status,
      :question_target_user_id,
      :conflict_id,
      :conflict_type,
      :tradeoff_axis,
      :tradeoff_payload,
      :tradeoff_status,
      :tradeoff_selected
    ])
    |> validate_required(required)
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:truth_state, @truth_states)
    |> validate_inclusion(:confidence_class, @confidence)
    |> validate_inclusion(:mode, @modes)
    |> maybe_validate_question_status()
    |> maybe_validate_tradeoff_status()
    |> unique_constraint([:decision_id, :based_on_context_revision, :result_revision],
      name: :decision_results_decision_ctx_rev_uniq
    )
  end

  defp maybe_validate_question_status(cs) do
    case get_field(cs, :question_status) do
      nil -> cs
      _ -> validate_inclusion(cs, :question_status, @question_statuses)
    end
  end

  defp maybe_validate_tradeoff_status(cs) do
    case get_field(cs, :tradeoff_status) do
      nil -> cs
      _ -> validate_inclusion(cs, :tradeoff_status, @tradeoff_statuses)
    end
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

  def answer_question_changeset(%__MODULE__{} = r) do
    r
    |> change(%{
      question_status: "answered",
      status: "answered"
    })
  end

  def supersede_question_changeset(%__MODULE__{} = r) do
    r
    |> change(%{
      question_status: "superseded",
      status: "superseded"
    })
  end

  def select_tradeoff_changeset(%__MODULE__{} = r, selected) when is_binary(selected) do
    r
    |> change(%{
      tradeoff_status: "selected",
      tradeoff_selected: selected,
      status: "tradeoff_resolved"
    })
  end

  def supersede_tradeoff_changeset(%__MODULE__{} = r) do
    r
    |> change(%{
      tradeoff_status: "superseded",
      status: "superseded"
    })
  end
end

