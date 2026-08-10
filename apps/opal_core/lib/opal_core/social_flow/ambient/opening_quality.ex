defmodule OpalCore.SocialFlow.Ambient.OpeningQuality do
  @moduledoc """
  Opening quality — internal grade of a social opening.

  Not a public score. Not heat. Not a feed rank.

  Alignment Loop Parts 2–3:
  - social possibility can be partial
  - surface when uncertainty collapsed AND the opening is strong enough
    to pay for interruption

  Bands (private):
  absent | thin | solid | strong | exceptional

  Proactive ambient only considers solid+.
  Thin openings may answer an explicit human ask; they do not interrupt.
  """

  @bands ~w(absent thin solid strong exceptional)

  def bands, do: @bands

  @doc """
  Assess quality of a detected or candidate social opening.

  Accepts either SocialOpening.detect output or raw formation attrs.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)

    exists? = a["exists"] == true or opening_signals?(a)

    if exists? do
      {:ok, grade_opening(a)}
    else
      {:ok, absent()}
    end
  end

  def assess(_), do: {:ok, absent()}

  defp grade_opening(a) do
    signals = quality_signals(a)
    points = Enum.count(Map.values(signals), & &1)
    band = band_for(points, signals, a)

    # valid ≠ worth interrupting
    ladder = ladder_level(band, signals, a)

    debt =
      OpalCore.SocialFlow.Ambient.InterruptionDebt.evaluate(%{
        "quality_band" => band,
        "this_got_easy" => a["this_got_easy"] == true or a["became_easy"] == true,
        "effort_removed" => a["effort_removed"] || effort_estimate(signals, a),
        "uncertainty_removed" => a["uncertainty_removed"] || uncertainty_estimate(signals, a),
        "interruption_cost" => a["interruption_cost"],
        "mediocre" => a["mediocre"] == true or a["world_heat_only"] == true,
        "option_count" => a["option_count"] || 1,
        "meaningful_tradeoff" => a["meaningful_tradeoff"] == true,
        "confidence" => a["confidence"] || points / 10.0,
        "static_repeat" => a["static_repeat"] == true,
        "humans_already_solved" => a["humans_already_solved"] == true,
        "topic_changed" => a["topic_changed"] == true,
        "human_asked" => a["human_asked"] == true,
        "popularity_only" => a["popularity_only"] == true,
        "world_heat_only" => a["world_heat_only"] == true
      })

    surface? =
      band in ~w(solid strong exceptional) and a["blocked"] != true and
        debt["repays_debt"] == true

    %{
      "band" => band,
      "ladder" => ladder,
      "valid_opening" => ladder in ~w(valid good strong actionable),
      "good_opening" => ladder in ~w(good strong actionable),
      "strong_opening" => ladder in ~w(strong actionable),
      "actionable_opening" => ladder == "actionable",
      "points" => points,
      "signals" => signals,
      "proactive_surface_ok" => surface?,
      "thin_only_if_asked" => band == "thin",
      "pays_for_interruption" => surface?,
      "interruption_debt" => debt,
      "partial_group_ok" => signals["quorum"] == true,
      "required_present" => signals["required"],
      "not_public_score" => true,
      "not_heat" => true,
      "popularity_is_not_quality" => true,
      "authorizes_set" => false,
      "private" => true
    }
  end

  # Behavioral ladder (not public product states): valid → good → strong → actionable
  defp ladder_level("absent", _, _), do: "none"
  defp ladder_level("thin", _, _), do: "valid"

  defp ladder_level("solid", signals, _a) do
    if signals["fresh"] and signals["willingness"], do: "good", else: "valid"
  end

  defp ladder_level("strong", signals, a) do
    if a["this_got_easy"] == true or signals["low_effort_to_act"],
      do: "strong",
      else: "good"
  end

  defp ladder_level("exceptional", signals, a) do
    if a["provider_ready"] == true or a["execution_ready"] == true or
         signals["native_memory"],
       do: "actionable",
       else: "strong"
  end

  defp ladder_level(_, _, _), do: "valid"

  defp effort_estimate(signals, a) do
    n =
      Enum.count(
        [
          signals["time_strong"],
          signals["proximity"],
          signals["native_memory"],
          signals["low_effort_to_act"],
          a["option_count"] in [1, 2, 3]
        ],
        & &1
      )

    n / 5.0
  end

  defp uncertainty_estimate(signals, a) do
    if a["this_got_easy"] == true, do: 0.7, else: Enum.count(Map.values(signals), & &1) / 12.0
  end

  @doc "Whether proactive ambient may interrupt for this opening quality."
  def proactive_ok?(attrs) when is_map(attrs) do
    case assess(attrs) do
      {:ok, q} -> q["proactive_surface_ok"] == true
      _ -> false
    end
  end

  def proactive_ok?(_), do: false

  defp quality_signals(a) do
    all = List.wrap(a["participant_ids"])
    viable = List.wrap(a["viable_participant_ids"] || a["in_ids"] || all)
    required = List.wrap(a["required_ids"])
    n = count(all)
    v = count(viable)
    min_v = to_i(a["min_viable"]) || default_min(n)

    required_ok =
      required == [] or Enum.all?(required, &(&1 in viable))

    # time_ok alone (bare 1h window) is not "strong"
    time_strong? =
      a["time_compatible"] == true or to_f(a["opening_hours"]) >= 2.0 or
        a["time_resolved"] == true

    # proximity_optional allows opening to exist; it does not raise quality
    proximity? =
      a["proximity_ok"] == true or a["travel_burden_low"] == true or n <= 1

    willingness? = a["willingness_ok"] != false
    quorum? = v >= min_v or n <= 1

    # Coverage: how complete the viable set is (not perfection-required)
    coverage_ok? = n <= 1 or v / max(n, 1) >= 0.66 or v >= min_v + 1

    low_effort? =
      a["low_effort_to_act"] == true or
        ((a["proximity_ok"] == true or a["travel_burden_low"] == true) and
           (a["near_term"] == true or a["execution_ready"] == true))

    %{
      "time_strong" => time_strong?,
      "willingness" => willingness?,
      "required" => required_ok,
      "quorum" => quorum?,
      "proximity" => proximity?,
      "coverage" => coverage_ok?,
      "relationship_context" => a["relationship_context"] not in [nil, ""],
      "native_memory" => a["native_commitments_known"] == true,
      "low_effort_to_act" => low_effort?,
      "fresh" => a["fresh_enough"] != false and a["stale"] != true
    }
  end

  defp band_for(points, signals, a) do
    cond do
      not signals["required"] or not signals["quorum"] ->
        "thin"

      points >= 9 and signals["native_memory"] and signals["low_effort_to_act"] ->
        "exceptional"

      points >= 7 and signals["time_strong"] and signals["proximity"] ->
        "strong"

      points >= 5 and signals["willingness"] and signals["time_strong"] ->
        "solid"

      # Explicit human-initiated coordination can use a thinner opening
      a["human_asked"] == true and points >= 3 ->
        "thin"

      points >= 3 ->
        "thin"

      true ->
        "absent"
    end
  end

  defp opening_signals?(a) do
    a["social_opening"] == true or a["time_compatible"] == true or
      a["willingness_ok"] == true or List.wrap(a["viable_participant_ids"]) != []
  end

  defp absent do
    %{
      "band" => "absent",
      "points" => 0,
      "proactive_surface_ok" => false,
      "thin_only_if_asked" => false,
      "pays_for_interruption" => false,
      "not_public_score" => true,
      "not_heat" => true,
      "authorizes_set" => false,
      "private" => true
    }
  end

  defp count(list), do: Enum.reduce(list, 0, fn _, acc -> acc + 1 end)

  defp default_min(n) when n <= 1, do: 1
  defp default_min(n) when n == 2, do: 2
  defp default_min(n) when n >= 5, do: 3
  defp default_min(n), do: max(2, div(n, 2))

  defp to_i(nil), do: nil
  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: nil

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
