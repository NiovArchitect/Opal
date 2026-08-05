defmodule OpalCore.SocialFlow.DynamicIntelligence.CollectiveFit do
  @moduledoc """
  Collective-fit ranking for synthetic venues.

  Hard constraints are never averaged away.
  Private constraints affect eligibility but never enter shared explanations.
  """

  @price_rank %{"$" => 1, "$$" => 2, "$$$" => 3, "$$$$" => 4}
  @max_options 3

  @doc """
  Rank venues for the participant set.

  Returns `{valid_options, preferred | nil}` where options are privacy-safe maps.
  """
  def rank(venues, participants, time_window) when is_list(venues) and is_list(participants) do
    hard = aggregate_hard_constraints(participants, time_window)
    soft = aggregate_soft_preferences(participants)

    scored =
      venues
      |> Enum.map(&normalize_venue/1)
      |> Enum.filter(&hard_pass?(&1, hard))
      |> Enum.map(fn venue ->
        score = soft_score(venue, soft)
        {score, venue, hard}
      end)
      |> Enum.sort_by(fn {score, venue, _} -> {-score, venue["id"]} end)

    options =
      scored
      |> Enum.take(@max_options)
      |> Enum.map(fn {score, venue, hard_used} ->
        %{
          "id" => venue["id"],
          "display_name" => venue["display_name"],
          "fit_score_internal" => score,
          "hard_constraints_satisfied" => true,
          "group_safe_explanation" => group_safe_explanation(venue, hard_used, soft)
        }
      end)

    preferred = List.first(options)
    {options, preferred}
  end

  def rank(_, _, _), do: {[], nil}

  def max_options, do: @max_options

  def aggregate_hard_constraints(participants, time_window) do
    quiet_required =
      Enum.any?(participants, fn p ->
        get_in(stringify(p), ["shared_preferences", "quiet"]) == true
      end)

    max_price =
      participants
      |> Enum.map(fn p -> get_in(stringify(p), ["private_constraints", "max_price_band"]) end)
      |> Enum.reject(&is_nil/1)
      |> Enum.min_by(&price_rank/1, fn -> nil end)

    earliest =
      participants
      |> Enum.map(fn p -> stringify(p)["available_after"] end)
      |> Enum.reject(&is_nil/1)
      |> Enum.max(fn -> Map.get(stringify(time_window || %{}), "earliest") end)

    %{
      "require_quiet" => quiet_required,
      "max_price_band" => max_price,
      "earliest_available" => earliest
    }
  end

  def aggregate_soft_preferences(participants) do
    %{
      "prefer_novelty" =>
        Enum.any?(participants, fn p ->
          get_in(stringify(p), ["shared_preferences", "open_to_new"]) == true
        end),
      "prefer_balanced_travel" => true
    }
  end

  def hard_pass?(venue, hard) do
    venue = normalize_venue(venue)
    hard = stringify(hard)

    quiet_ok =
      if hard["require_quiet"] == true do
        venue["quiet"] == true
      else
        true
      end

    price_ok =
      case hard["max_price_band"] do
        nil -> true
        band -> price_rank(venue["price_band"]) <= price_rank(band)
      end

    time_ok =
      case hard["earliest_available"] do
        nil -> true
        earliest -> time_gte?(venue["available_at"], earliest)
      end

    quiet_ok and price_ok and time_ok
  end

  def soft_score(venue, soft) do
    venue = normalize_venue(venue)
    soft = stringify(soft)
    score = 1.0

    score =
      if venue["quiet"] == true do
        score + 0.35
      else
        score
      end

    score =
      if soft["prefer_novelty"] and venue["similar_to_past"] != true do
        score + 0.05
      else
        score
      end

    score =
      if soft["prefer_balanced_travel"] do
        case venue["travel_friction"] do
          "short" -> score + 0.2
          "balanced" -> score + 0.15
          "long" -> score - 0.25
          _ -> score
        end
      else
        score
      end

    score =
      if venue["similar_to_past"] == true do
        score + 0.1
      else
        score
      end

    # Prefer moderate price among valid options without naming budget.
    score + max(0.0, 0.15 - price_rank(venue["price_band"]) * 0.03)
  end

  def group_safe_explanation(venue, hard, soft) do
    venue = normalize_venue(venue)
    hard = stringify(hard)
    soft = stringify(soft)

    parts = ["It fits everyone’s timing and what has been shared"]

    parts =
      if hard["require_quiet"] == true and venue["quiet"] == true do
        parts ++ ["Quieter than the other options"]
      else
        parts
      end

    parts =
      if venue["travel_friction"] in ["short", "balanced"] do
        parts ++ ["Convenient for the people involved"]
      else
        parts
      end

    parts =
      if venue["similar_to_past"] == true do
        parts ++ ["Similar to places this group has enjoyed"]
      else
        if soft["prefer_novelty"] do
          parts ++ ["A fresh option for the group"]
        else
          parts
        end
      end

    Enum.join(parts, ". ") <> "."
  end

  def strip_internal_scores(options) when is_list(options) do
    Enum.map(options, fn opt ->
      opt
      |> stringify()
      |> Map.drop(["fit_score_internal", "private_reasons", "budget_reason"])
    end)
  end

  def strip_internal_scores(_), do: []

  defp normalize_venue(v), do: stringify(v)

  defp price_rank(band), do: Map.get(@price_rank, to_string(band || "$$"), 2)

  defp time_gte?(available, earliest)
       when is_binary(available) and is_binary(earliest) do
    available >= earliest
  end

  defp time_gte?(_, _), do: true

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_value(v)}
      {k, v} -> {to_string(k), stringify_value(v)}
    end)
  end

  defp stringify(other), do: other

  defp stringify_value(v) when is_map(v), do: stringify(v)
  defp stringify_value(v), do: v
end
