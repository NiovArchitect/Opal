defmodule OpalCore.DecisionIntelligence.DependencyIndex do
  @moduledoc """
  Entity → active decision index for P4.5 recomposition fan-in.

  Avoids O(all decisions) scans on world events.
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.DecisionIntelligence.DecisionResult
  alias OpalCore.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @entity_types ~w(provider_place participant graph journey decision)

  schema "decision_dependencies" do
    field :decision_id, :binary_id
    field :entity_type, :string
    field :entity_id, :string
    field :context_revision, :integer

    timestamps(type: :utc_datetime_usec)
  end

  def entity_types, do: @entity_types

  def changeset(%__MODULE__{} = row, attrs) do
    row
    |> cast(attrs, [:decision_id, :entity_type, :entity_id, :context_revision])
    |> validate_required([:decision_id, :entity_type, :entity_id, :context_revision])
    |> validate_inclusion(:entity_type, @entity_types)
    |> unique_constraint([:decision_id, :entity_type, :entity_id],
      name: :decision_dependencies_decision_entity_uniq
    )
  end

  @doc "Upsert dependencies for a persisted High/Medium/Low result."
  def upsert_for_result(%DecisionContext{} = ctx, %DecisionResult{} = result) do
    rows =
      []
      |> maybe_dep(ctx.id, "provider_place", result.answer_entity_id, ctx.revision)
      |> maybe_deps(
        ctx.id,
        "participant",
        ctx.participant_ids || [],
        ctx.revision
      )
      |> maybe_dep(ctx.id, "graph", ctx.graph_id || result.graph_id, ctx.revision)
      |> maybe_dep(ctx.id, "journey", ctx.journey_id, ctx.revision)
      |> maybe_dep(ctx.id, "decision", ctx.id, ctx.revision)

    Enum.reduce_while(rows, {:ok, []}, fn attrs, {:ok, acc} ->
      case upsert(attrs) do
        {:ok, row} -> {:cont, {:ok, [row | acc]}}
        {:error, cs} -> {:halt, {:error, cs}}
      end
    end)
  end

  def upsert(attrs) when is_map(attrs) do
    attrs = atomize_or_string(attrs)

    %__MODULE__{}
    |> changeset(attrs)
    |> Repo.insert(
      on_conflict: {:replace, [:context_revision, :updated_at]},
      conflict_target: [:decision_id, :entity_type, :entity_id],
      returning: true
    )
  end

  @doc "Find active decision ids dependent on an entity."
  def find_decision_ids(entity_type, entity_id)
      when is_binary(entity_type) and is_binary(entity_id) do
    from(d in __MODULE__,
      where: d.entity_type == ^entity_type and d.entity_id == ^entity_id,
      select: d.decision_id,
      distinct: true
    )
    |> Repo.all()
  end

  def find_decision_ids(_, _), do: []

  @doc "Load active contexts+latest results for an entity event."
  def find_active_bundles(entity_type, entity_id) do
    ids = find_decision_ids(entity_type, entity_id)

    Enum.flat_map(ids, fn decision_id ->
      case Repo.get(DecisionContext, decision_id) do
        %DecisionContext{status: "active"} = ctx ->
          result =
            from(r in DecisionResult,
              where: r.decision_id == ^decision_id,
              where: r.status not in ^~w(superseded settled invalidated),
              order_by: [desc: r.result_revision, desc: r.inserted_at],
              limit: 1
            )
            |> Repo.one()

          if result, do: [%{context: ctx, result: result}], else: []

        _ ->
          []
      end
    end)
  end

  defp maybe_dep(acc, _decision_id, _type, nil, _rev), do: acc
  defp maybe_dep(acc, _decision_id, _type, "", _rev), do: acc

  defp maybe_dep(acc, decision_id, type, entity_id, rev) when is_binary(entity_id) do
    [
      %{
        decision_id: decision_id,
        entity_type: type,
        entity_id: entity_id,
        context_revision: rev
      }
      | acc
    ]
  end

  defp maybe_deps(acc, decision_id, type, ids, rev) when is_list(ids) do
    Enum.reduce(ids, acc, fn id, a -> maybe_dep(a, decision_id, type, id, rev) end)
  end

  defp atomize_or_string(attrs) do
    %{
      decision_id: attrs[:decision_id] || attrs["decision_id"],
      entity_type: attrs[:entity_type] || attrs["entity_type"],
      entity_id: to_string(attrs[:entity_id] || attrs["entity_id"]),
      context_revision: attrs[:context_revision] || attrs["context_revision"]
    }
  end
end
