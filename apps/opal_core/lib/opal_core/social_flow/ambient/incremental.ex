defmodule OpalCore.SocialFlow.Ambient.Incremental do
  @moduledoc """
  Path-aware recompute: when one input changes, recompute only dependents.

  Same philosophy as CI path filters — no full-stack recompute storms.
  """

  @impacts %{
    "participant_affirmation" => ~w(group_viability actionability surface),
    "required_role" => ~w(group_viability role_dependency surface),
    "provider_inventory" => ~w(execution_readiness capacity_gap booking),
    "location_expired" => ~w(travel place_feasibility density surface),
    "preference_correction" => ~w(collective_fit ranking),
    "slot_expired" => ~w(execution_readiness expiry surface),
    "plan_time_changed" => ~w(feasibility travel actionability surface),
    "hard_constraint" => ~w(group_viability surface),
    "topic_changed" => ~w(all)
  }

  @doc "Which subsystems to recompute for a change kind."
  def recompute_targets(change_kind) when is_binary(change_kind) do
    Map.get(@impacts, change_kind, ~w(surface))
  end

  def recompute_targets(_), do: ~w(surface)

  @doc """
  Given a set of change kinds, union of recompute targets.
  Returns {:full, targets} if 'all' present, else {:partial, targets}.
  """
  def plan(change_kinds) when is_list(change_kinds) do
    targets =
      change_kinds
      |> Enum.flat_map(&recompute_targets/1)
      |> Enum.uniq()

    if "all" in targets do
      {:full, ~w(group_viability role_dependency travel place_feasibility collective_fit ranking
                 execution_readiness capacity_gap booking expiry actionability density surface)}
    else
      {:partial, targets}
    end
  end

  def plan(_), do: {:partial, ~w(surface)}

  @doc "Whether conversation intent / native commitments need rebuild (usually no)."
  def preserves_context?(change_kind) do
    change_kind not in ~w(topic_changed plan_cancelled)
  end
end
