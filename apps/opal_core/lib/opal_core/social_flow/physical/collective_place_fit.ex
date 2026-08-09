defmodule OpalCore.SocialFlow.Physical.CollectivePlaceFit do
  @moduledoc """
  WHAT FITS THESE PEOPLE — not what a provider ranked.

  Hard vs soft constraints. Private budget never leaks.
  Relationship-specific context. Dominated options eliminated.
  """

  alias OpalCore.SocialFlow.Physical.CandidateSource
  alias OpalCore.SocialFlow.RealWorld.Cognition.DecisionCompression

  @doc """
  Rank candidates for participants.

  context keys:
  - intent, quiet_required, max_price_band (private aggregate)
  - travel_by_place
  - relationship_context (:date | :friends | :study | :community)
  """
  def rank(candidates, context \\ %{}) when is_list(candidates) do
    ctx = normalize_context(context)

    scored =
      candidates
      |> Enum.map(&CandidateSource.normalize_place/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.filter(&hard_pass?(&1, ctx))
      |> Enum.map(fn p ->
        travel = Map.get(ctx["travel_by_place"] || %{}, p["provider_place_id"], 20)
        score = soft_score(p, ctx, travel)

        p
        |> Map.put("score", Float.round(score, 3))
        |> Map.put("travel", travel)
        |> Map.put("cost", price_rank(p["price_level"]))
        |> Map.put("id", p["provider_place_id"])
        |> Map.put("display_name", p["name"])
      end)

    DecisionCompression.compress(scored)
    |> Map.put("fit_engine", "collective_place_fit")
    |> Map.put("provider_is_not_authority", true)
    |> Map.put("private_budget_leaked", false)
    |> Map.put("authorizes_set", false)
    |> Map.put("max_options", 3)
  end

  @doc "Acquire candidates then fit — acquisition ≠ fit."
  def recommend(opts \\ []) do
    ctx = opts_to_context(opts)

    with {:ok, candidates} <- CandidateSource.fetch(opts) do
      {:ok, rank(candidates, ctx)}
    end
  end

  defp hard_pass?(p, ctx) do
    open? = p["open_at_plan_time"] != false
    quiet_ok = not (ctx["quiet_required"] == true) or p["quiet"] == true
    travel = Map.get(ctx["travel_by_place"] || %{}, p["provider_place_id"], 0)
    reachable? = travel <= (ctx["max_travel_minutes"] || 60)

    budget_ok =
      case ctx["max_price_band"] do
        nil -> true
        max -> price_rank(p["price_level"]) <= price_rank(max)
      end

    open? and quiet_ok and reachable? and budget_ok
  end

  defp soft_score(p, ctx, travel) do
    base = to_float(p["rating"])
    quiet_bonus = if ctx["quiet_required"] and p["quiet"], do: 0.4, else: 0.0
    rel = relationship_bonus(p, ctx["relationship_context"])
    travel_pen = travel / 100.0
    base + quiet_bonus + rel - travel_pen
  end

  defp relationship_bonus(p, "date"), do: if(p["quiet"], do: 0.3, else: -0.2)
  defp relationship_bonus(p, "friends"), do: if(p["quiet"], do: 0.0, else: 0.1)
  defp relationship_bonus(p, "study"), do: if(p["quiet"], do: 0.4, else: -0.3)
  defp relationship_bonus(_, _), do: 0.0

  defp price_rank("$"), do: 1
  defp price_rank("$$"), do: 2
  defp price_rank("$$$"), do: 3
  defp price_rank("$$$$"), do: 4
  defp price_rank(_), do: 2

  defp to_float(n) when is_number(n), do: n * 1.0
  defp to_float(_), do: 3.5

  defp opts_to_context(opts) when is_list(opts) do
    %{
      "quiet_required" => Keyword.get(opts, :quiet_required, false),
      "max_price_band" => Keyword.get(opts, :max_price_band),
      "travel_by_place" => Keyword.get(opts, :travel_by_place, %{}),
      "max_travel_minutes" => Keyword.get(opts, :max_travel_minutes, 60),
      "relationship_context" => to_string(Keyword.get(opts, :relationship_context, "general")),
      "intent" => Keyword.get(opts, :intent)
    }
  end

  defp normalize_context(ctx) when is_list(ctx), do: opts_to_context(ctx)
  defp normalize_context(ctx) when is_map(ctx), do: stringify(ctx)
  defp normalize_context(_), do: %{}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
