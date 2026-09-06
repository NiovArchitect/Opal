defmodule OpalCore.DecisionIntelligence.DecisionContext do
  @moduledoc """
  Authoritative DecisionContext — Elixir/Postgres truth for P4.

  Graph/Journey are referenced, never duplicated. Kafka is not source of truth.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @scope_types ~w(solo dyad group family graph journey)
  @statuses ~w(active invalidated settled)
  @privacy_defaults ~w(private_user relationship shared_group)

  schema "decision_contexts" do
    field :revision, :integer, default: 1
    field :scope_type, :string
    field :scope_ids, {:array, :binary_id}, default: []
    field :participant_ids, {:array, :binary_id}, default: []
    field :intent, :string
    field :status, :string, default: "active"
    field :graph_id, :binary_id
    field :journey_id, :binary_id
    field :time_context, :map, default: %{}
    field :location_context, :map, default: %{}
    field :availability_context, :map, default: %{}
    field :budget_context, :map, default: %{}
    field :preference_context, :map, default: %{}
    field :provider_context, :map, default: %{}
    field :hard_constraints, :map, default: %{}
    field :soft_preferences, :map, default: %{}
    field :unknowns, {:array, :string}, default: []
    field :conflicts, {:array, :map}, default: []
    field :invalidation_conditions, {:array, :map}, default: []
    field :correlation_id, :string
    field :privacy_default, :string, default: "shared_group"

    belongs_to :initiator_user, OpalCore.Accounts.User, foreign_key: :initiator_user_id
    has_many :evidences, OpalCore.DecisionIntelligence.DecisionEvidence, foreign_key: :decision_id

    timestamps(type: :utc_datetime_usec)
  end

  def scope_types, do: @scope_types
  def statuses, do: @statuses

  def create_changeset(attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :initiator_user_id,
      :scope_type,
      :scope_ids,
      :participant_ids,
      :intent,
      :status,
      :graph_id,
      :journey_id,
      :time_context,
      :location_context,
      :availability_context,
      :budget_context,
      :preference_context,
      :provider_context,
      :hard_constraints,
      :soft_preferences,
      :unknowns,
      :conflicts,
      :invalidation_conditions,
      :correlation_id,
      :privacy_default
    ])
    |> put_change(:revision, 1)
    |> put_change(:status, Map.get(attrs, :status) || Map.get(attrs, "status") || "active")
    |> validate_required([:initiator_user_id, :scope_type, :intent])
    |> validate_inclusion(:scope_type, @scope_types)
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:privacy_default, @privacy_defaults)
    |> validate_invalidation_conditions()
  end

  def update_changeset(%__MODULE__{} = ctx, attrs, next_revision) when is_integer(next_revision) do
    ctx
    |> cast(attrs, [
      :scope_type,
      :scope_ids,
      :participant_ids,
      :intent,
      :status,
      :graph_id,
      :journey_id,
      :time_context,
      :location_context,
      :availability_context,
      :budget_context,
      :preference_context,
      :provider_context,
      :hard_constraints,
      :soft_preferences,
      :unknowns,
      :conflicts,
      :invalidation_conditions,
      :correlation_id,
      :privacy_default
    ])
    |> put_change(:revision, next_revision)
    |> validate_inclusion(:scope_type, @scope_types)
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:privacy_default, @privacy_defaults)
    |> validate_invalidation_conditions()
  end

  defp validate_invalidation_conditions(cs) do
    conds = get_field(cs, :invalidation_conditions) || []

    if Enum.all?(conds, &valid_predicate?/1) do
      cs
    else
      add_error(cs, :invalidation_conditions, "contains invalid predicate")
    end
  end

  @predicate_types ~w(
    participant_availability provider_availability time_window_validity
    budget_maximum location_radius participant_membership weather_dependency
    graph_revision journey_revision explicit_reject
  )

  defp valid_predicate?(%{"type" => type, "version" => v}) when is_binary(type) and is_integer(v) do
    type in @predicate_types and v >= 1
  end

  defp valid_predicate?(%{type: type, version: v}) when is_binary(type) and is_integer(v) do
    type in @predicate_types and v >= 1
  end

  defp valid_predicate?(_), do: false
end
