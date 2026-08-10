defmodule OpalCore.SocialFlow.Execution.MemoryFit do
  @moduledoc """
  Apply trusted memory to eliminate questions and candidates.

  Headline metric: questions eliminated by trusted memory.
  Does not expose “Based on your preferences…” unless useful.
  No global favor-novelty or favor-familiar; use context.
  """

  alias OpalCore.SocialFlow.Ambient.AlignmentLoop
  alias OpalCore.SocialFlow.Execution.MemoryStore

  @doc """
  Given context + optional candidate list, apply memory compression.
  """
  def apply(context, opts \\ [])

  def apply(context, opts) when is_map(context) do
    c = stringify(context)
    candidates = opt(opts, :candidates) || c["candidates"] || []
    bag = MemoryStore.retrieve(c)
    memories = bag["memories"]

    eliminated_questions = question_eliminations(c, memories)
    {kept, rejected} = filter_candidates(candidates, memories, c)

    known =
      Enum.reduce(memories, %{}, fn m, acc ->
        Map.put(acc, m["dimension"], m["value"])
      end)

    should_ask =
      Enum.map(eliminated_questions, fn q ->
        AlignmentLoop.should_ask?(
          Map.merge(c, %{
            "topic" => q["topic"],
            "opal_already_knows" => true
          })
        )
      end)

    %{
      "memories_used" => length(memories),
      "known_dimensions" => known,
      "questions_eliminated" => length(eliminated_questions),
      "questions_eliminated_detail" => eliminated_questions,
      "should_ask_results" => should_ask,
      "candidates_in" => length(candidates),
      "candidates_out" => length(kept),
      "candidates_eliminated" => length(rejected),
      "eliminated_candidates" => rejected,
      "kept_candidates" => kept,
      "explanation" => explanation(c, eliminated_questions, length(rejected)),
      "based_on_your_preferences" => false,
      "authorizes_set" => false,
      "private" => true
    }
  end

  def apply(_, _), do: %{"questions_eliminated" => 0}

  @doc "Topics that memory can safely answer without re-asking."
  def topics_answered_by_memory(memories) when is_list(memories) do
    memories
    |> Enum.flat_map(fn m ->
      case m["dimension"] do
        "noise_level" -> ["quiet_or_lively", "vibe"]
        "cost" -> ["budget", "price"]
        "travel_burden" -> ["how_far", "distance"]
        "formality" -> ["casual_or_formal", "vibe"]
        "parking" -> ["parking"]
        "timing" -> ["when", "confirm_time"]
        "hard_avoid" -> ["avoid_place"]
        "cuisine" -> ["food_type"]
        "accessibility" -> ["accessibility"]
        d when is_binary(d) -> [d]
        _ -> []
      end
    end)
    |> Enum.uniq()
  end

  def topics_answered_by_memory(_), do: []

  defp question_eliminations(c, memories) do
    answered = topics_answered_by_memory(memories)
    pending = List.wrap(c["pending_questions"] || c["would_ask"] || [])

    pending
    |> Enum.map(fn
      q when is_binary(q) -> %{"topic" => q}
      q when is_map(q) -> stringify(q)
      _ -> %{}
    end)
    |> Enum.filter(fn q ->
      topic = q["topic"] || q["question_topic"]
      topic in answered or memory_answers?(topic, memories)
    end)
    |> Enum.map(fn q ->
      %{
        "topic" => q["topic"] || q["question_topic"],
        "eliminated_by_memory" => true,
        "reason" => "trusted_memory"
      }
    end)
  end

  defp memory_answers?(topic, memories) when is_binary(topic) do
    topic in topics_answered_by_memory(memories)
  end

  defp memory_answers?(_, _), do: false

  defp filter_candidates(candidates, memories, ctx) when is_list(candidates) do
    avoids = avoid_signals(memories)
    prefers = prefer_signals(memories)

    Enum.split_with(candidates, fn cand ->
      cand = stringify(cand)

      not eliminated_by_avoid?(cand, avoids) and
        (prefers == %{} or matches_prefer?(cand, prefers) or ctx["allow_unmatched"] == true)
    end)
    |> then(fn {kept, rejected} ->
      # If prefers would kill everyone, keep all non-avoided (memory is prior, not hard rule for soft prefs)
      if kept == [] and candidates != [] and prefers != %{} do
        non_avoid =
          Enum.reject(candidates, fn cand ->
            eliminated_by_avoid?(stringify(cand), avoids)
          end)

        {Enum.map(non_avoid, &stringify/1), Enum.map(candidates -- non_avoid, &stringify/1)}
      else
        {Enum.map(kept, &stringify/1), Enum.map(rejected, &stringify/1)}
      end
    end)
  end

  defp filter_candidates(_, _, _), do: {[], []}

  defp avoid_signals(memories) do
    memories
    |> Enum.filter(fn m ->
      m["dimension"] in ~w(hard_avoid noise_level cost travel_burden) and
        negative?(m["value"])
    end)
    |> Enum.map(&{&1["dimension"], &1["value"]})
    |> Map.new()
  end

  defp prefer_signals(memories) do
    memories
    |> Enum.filter(fn m ->
      m["dimension"] in ~w(noise_level formality cuisine zone) and not negative?(m["value"])
    end)
    |> Enum.map(&{&1["dimension"], &1["value"]})
    |> Map.new()
  end

  defp negative?(v) when is_binary(v) do
    t = String.downcase(v)

    String.contains?(t, "too ") or String.contains?(t, "never") or String.contains?(t, "hate") or
      String.contains?(t, "loud") or String.contains?(t, "expensive") or
      String.contains?(t, "far") or
      String.contains?(t, "avoid")
  end

  defp negative?(_), do: false

  defp eliminated_by_avoid?(cand, avoids) do
    Enum.any?(avoids, fn
      {"noise_level", _} ->
        cand["loud"] == true or cand["noise"] == "loud" or cand["vibe"] == "lively"

      {"cost", _} ->
        cand["expensive"] == true or cand["price_tier"] in ["$$$$", "luxury"]

      {"travel_burden", _} ->
        cand["far"] == true or (is_number(cand["travel_minutes"]) and cand["travel_minutes"] > 45)

      {"hard_avoid", v} when is_binary(v) ->
        place = cand["place"] || cand["name"] || ""
        String.contains?(String.downcase(place), String.downcase(v))

      _ ->
        false
    end)
  end

  defp matches_prefer?(cand, prefers) do
    Enum.all?(prefers, fn
      {"noise_level", v} ->
        if quiet?(v), do: cand["loud"] != true and cand["vibe"] != "lively", else: true

      {"formality", v} ->
        if casual?(v), do: cand["formal"] != true, else: true

      {"cuisine", v} when is_binary(v) ->
        cuisine = cand["cuisine"] || ""
        String.contains?(String.downcase(cuisine), String.downcase(v))

      {"zone", v} when is_binary(v) ->
        zone = cand["zone"] || cand["area"] || ""
        String.contains?(String.downcase(zone), String.downcase(v))

      _ ->
        true
    end)
  end

  defp quiet?(v) when is_binary(v), do: String.contains?(String.downcase(v), "quiet")
  defp quiet?(_), do: false
  defp casual?(v) when is_binary(v), do: String.contains?(String.downcase(v), "casual")
  defp casual?(_), do: false

  defp explanation(c, eliminated_q, eliminated_c) do
    cond do
      c["force_explain_memory"] == true and eliminated_q != [] ->
        "Using what you already told us."

      true ->
        # Default: silent — no "based on your preferences"
        nil
    end
    |> then(fn text ->
      %{
        "text" => text,
        "questions_saved" => length(eliminated_q),
        "candidates_saved_from_browse" => eliminated_c,
        "announce_memory" => false
      }
    end)
  end

  defp opt(opts, key) when is_list(opts), do: Keyword.get(opts, key)
  defp opt(opts, key) when is_map(opts), do: Map.get(opts, key) || Map.get(opts, to_string(key))
  defp opt(_, _), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
