defmodule OpalCore.SocialFlow.Ambient.AlignmentCompression do
  @moduledoc """
  Alignment compression — many private/world variables → few human decisions.

  Canonical goal (behavioral OS Part 4):

  MANY FACTS BELOW → FEW DECISIONS ABOVE

  0–3 output rule:
  - often 0
  - if strong: 1
  - if meaningful human tradeoff: 2–3
  - never default to browse

  Preserve meaningful choice. Remove meaningless comparison.
  AI does more work; user experiences less software.
  """

  @doc """
  Measure compression from underlying variable count to human-facing choices.
  """
  def measure(attrs) when is_map(attrs) do
    a = stringify(attrs)

    under =
      to_i(a["underlying_variables"] || a["complexity_count"]) ||
        estimate_underlying(a)

    human_choices = max(to_i(a["human_choices"] || a["option_count"] || 1), 0)
    questions = to_i(a["questions_asked"] || 0)

    # Perfect: many vars → 0–1 question + ≤3 options
    ratio =
      if human_choices + questions == 0 do
        under * 1.0
      else
        under / max(human_choices + questions, 1)
      end

    strong? = under >= 5 and human_choices <= 3 and questions <= 1

    {:ok,
     %{
       "underlying_variables" => under,
       "human_choices" => human_choices,
       "questions_asked" => questions,
       "compression_ratio" => Float.round(ratio * 1.0, 2),
       "strong_compression" => strong?,
       "smallest_decision" => a["smallest_decision"] || default_decision(human_choices),
       "authorizes_set" => false,
       "user_experiences_less_software" => strong?
     }}
  end

  def measure(_), do: {:ok, %{"strong_compression" => false}}

  @doc """
  Compress ranked options to 0–3 using dominance + meaningful tradeoff.

  - One option dominates → return 1 (AI removed meaningless comparison)
  - Nearby casual vs farther special (or similar axes) → keep 2–3
  - Mediocre pile with no meaningful difference → keep 1 best only
  """
  def compress_to_human_options(options) when is_list(options) do
    compress_to_human_options(options, %{})
  end

  def compress_to_human_options(options, attrs) when is_list(options) and is_map(attrs) do
    a = stringify(attrs)
    opts = Enum.take(options, 12)

    case opts do
      [] ->
        %{
          "options" => [],
          "option_count" => 0,
          "rule" => "0",
          "meaningful_tradeoff" => false,
          "browse_rejected" => true
        }

      [only] ->
        %{
          "options" => [only],
          "option_count" => 1,
          "rule" => "1_only",
          "meaningful_tradeoff" => false,
          "browse_rejected" => true
        }

      [first | rest] = all ->
        top = Enum.take(all, 3)
        tradeoff? = meaningful_tradeoff?(top, a)
        dominant? = dominates_rest?(first, rest)

        selected =
          cond do
            # Meaningful subjective tradeoff wins over pure score dominance
            tradeoff? ->
              Enum.take(top, 3)

            dominant? ->
              [first]

            # Equal mediocrity: do not dump a menu
            equal_mediocrity?(top) ->
              [first]

            true ->
              Enum.take(top, 2)
          end

        %{
          "options" => selected,
          "option_count" => length(selected),
          "rule" => rule_for(selected, tradeoff?, dominant?),
          "meaningful_tradeoff" => tradeoff? and length(selected) > 1,
          "dominance_applied" => dominant? and length(selected) == 1,
          "browse_rejected" => true,
          "humans_retain_preference" => tradeoff? and length(selected) > 1
        }
    end
  end

  def compress_to_human_options(_, _),
    do: %{"options" => [], "option_count" => 0, "browse_rejected" => true}

  defp meaningful_tradeoff?([x, y | _], a) do
    # Explicit product signal or axis difference (casual nearby vs special farther)
    a["meaningful_tradeoff"] == true or a["preserve_choice"] == true or axes_differ?(x, y)
  end

  defp meaningful_tradeoff?(_, _), do: false

  defp axes_differ?(a, b) when is_map(a) and is_map(b) do
    a = stringify(a)
    b = stringify(b)

    travel_gap =
      abs(
        to_f(a["travel_minutes"] || a["distance_minutes"]) -
          to_f(b["travel_minutes"] || b["distance_minutes"])
      )

    vibe_gap =
      a["vibe"] != b["vibe"] and a["vibe"] not in [nil, ""] and b["vibe"] not in [nil, ""]

    special? =
      (a["special"] == true and b["special"] != true) or
        (b["special"] == true and a["special"] != true)

    price_gap = abs(to_f(a["price_band"] || a["price"]) - to_f(b["price_band"] || b["price"]))

    # Nearby casual vs slightly farther special — keep both
    (travel_gap >= 12 and special?) or vibe_gap or (travel_gap >= 15 and price_gap >= 1.0)
  end

  defp axes_differ?(_, _), do: false

  defp dominates_rest?(top, rest) when is_map(top) do
    st = score(top)
    # Strong lead: clear gap vs next options (not just a slightly better mediocre pick)
    Enum.all?(rest, fn o -> st - score(o) >= 0.35 end) and st >= 0.75
  end

  defp dominates_rest?(_, _), do: false

  defp equal_mediocrity?([_, _ | _] = opts) do
    scores = Enum.map(opts, &score/1)
    max_s = Enum.max(scores)
    min_s = Enum.min(scores)
    max_s - min_s < 0.25 and max_s < 0.7
  end

  defp equal_mediocrity?(_), do: false

  defp score(o) when is_map(o) do
    o = stringify(o)
    to_f(o["score"] || o["rating"] || o["fit"] || 0.0)
  end

  defp score(_), do: 0.0

  defp rule_for(selected, tradeoff?, dominant?) do
    cond do
      selected == [] -> "0"
      length(selected) == 1 and dominant? -> "1_dominant"
      length(selected) == 1 -> "1_strong"
      tradeoff? -> "2_3_meaningful_tradeoff"
      true -> "2_max_compressed"
    end
  end

  defp estimate_underlying(a) do
    [
      length(List.wrap(a["participant_ids"])),
      to_i(a["schedule_constraints"] || 0),
      to_i(a["locations"] || 0),
      to_i(a["venues_considered"] || a["candidate_count"] || 0),
      to_i(a["events"] || 0),
      if(a["travel_computed"], do: 1, else: 0),
      if(a["private_budgets"], do: 1, else: 0),
      if(a["weather"], do: 1, else: 0),
      if(a["optional_participant"], do: 1, else: 0),
      if(a["provider_call"], do: 1, else: 0)
    ]
    |> Enum.sum()
  end

  defp default_decision(n) when n > 1, do: "which_of_these"
  defp default_decision(1), do: "want_it"
  defp default_decision(_), do: "confirm"

  defp to_i(nil), do: 0
  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
