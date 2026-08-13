defmodule OpalCore.SocialFlow.PlaceOptionComposition do
  @moduledoc """
  Compose place options from Shared Reality + episode evidence + relationship memory.

  Precedence (default):
  1. Explicit current evidence / current_intent
  2. Episode preference (e.g. Italian tonight)
  3. Relevant relationship memory
  4. Generic defaults

  Memory assists ranking. It does not settle place authority.
  Private prefs never become shared presentation labels.
  Fixed events / known WHERE → memory is irrelevant for restaurant lists.
  """

  alias OpalCore.SocialFlow.RealWorld.Place.{Catalog, PreferenceMemory}

  @doc """
  Compose ranked place options.

  Options map keys (string or atom):
  - candidates (optional list)
  - what / category / place_gap_label
  - current_intent ("lively" | "quiet" | nil)
  - relationship_prefs (PreferenceMemory facts)
  - episode_prefs (PreferenceMemory facts for this episode)
  - relationship_id
  - fixed_event? / where_known? / where
  - party_size
  """
  def compose(opts) when is_map(opts) do
    o = stringify(opts)

    cond do
      o["fixed_event"] == true or o["fixed_event?"] == true ->
        irrelevant("fixed_event")

      present?(o["where"]) or o["where_known"] == true or o["where_known?"] == true ->
        irrelevant("where_already_known")

      true ->
        do_compose(o)
    end
  end

  def compose(_), do: irrelevant("invalid")

  @doc "Extract episode category from place_gap_label / explicit category / what."
  def episode_category(opts) when is_map(opts) do
    o = stringify(opts)
    label = o["place_gap_label"] || ""
    cat = o["category"] || o["current_category"]

    cond do
      is_binary(cat) and String.trim(cat) != "" ->
        String.downcase(cat)

      Regex.match?(~r/italian/i, label) ->
        "italian"

      Regex.match?(~r/sushi/i, label) ->
        "sushi"

      Regex.match?(~r/coffee/i, label) or o["what"] == "Coffee" ->
        "coffee"

      true ->
        nil
    end
  end

  def episode_category(_), do: nil

  @doc """
  Detect current_intent from free text (episode/current moment).
  Does not delete relationship memory.
  """
  def detect_current_intent(text) when is_binary(text) do
    cond do
      Regex.match?(~r/\blively|loud|energetic|busy|nightlife\b/i, text) -> "lively"
      Regex.match?(~r/\bquiet|chill|calm|intimate|hear each other\b/i, text) -> "quiet"
      true -> nil
    end
  end

  def detect_current_intent(_), do: nil

  defp do_compose(o) do
    category = episode_category(o)
    intent = o["current_intent"]
    party = o["party_size"] || 2

    candidates =
      (o["candidates"] || Catalog.list_candidates(category: "dinner", capacity_min: party))
      |> Enum.map(&stringify/1)

    rel_prefs = List.wrap(o["relationship_prefs"])
    ep_prefs = List.wrap(o["episode_prefs"])

    # Episode category as soft preference fact (not identity rewrite)
    ep_prefs =
      if category do
        [
          %{
            "preference" => category,
            "polarity" => "prefer",
            "weight_class" => "explicit_current",
            "scope" => "personal",
            "confidence" => 0.9,
            "revoked" => false
          }
          | ep_prefs
        ]
      else
        ep_prefs
      end

    ranked0 =
      PreferenceMemory.rank_candidates(candidates, rel_prefs ++ ep_prefs, %{
        "current_intent" => intent,
        "current_category" => category,
        "relationship_id" => o["relationship_id"]
      })

    ranked =
      ranked0
      |> boost_category(category)
      |> Enum.sort_by(& &1["score"], :desc)
      |> Enum.take(3)

    reasons =
      Map.new(ranked, fn c ->
        {c["id"] || c["display_name"], reason_list(c, category, intent, rel_prefs)}
      end)

    %{
      "ranked" => ranked,
      "reasons" => reasons,
      "privacy" => "private_viewer",
      "authority" => "candidate_only",
      "suppressed" => suppressed(candidates, ranked, category),
      "current_intent" => intent,
      "episode_category" => category
    }
  end

  defp boost_category(candidates, nil), do: candidates

  defp boost_category(candidates, category) do
    cat = String.downcase(category)

    Enum.map(candidates, fn c ->
      cuisine = String.downcase(c["cuisine"] || "")
      area = String.downcase(c["area_label"] || c["area"] || "")
      name = String.downcase(c["display_name"] || c["name"] || "")

      adj =
        cond do
          cuisine == cat or String.contains?(name, cat) -> 1.0
          cat == "italian" and (area =~ ~r/little italy|north park/ or cuisine == "italian") ->
            0.7

          true ->
            -0.35
        end

      Map.put(c, "score", Float.round((c["score"] || 0) + adj, 3))
    end)
  end

  defp reason_list(c, category, intent, rel_prefs) do
    []
    |> then(fn r ->
      if category && String.downcase(c["cuisine"] || "") == category,
        do: ["#{category} matches current evidence" | r],
        else: r
    end)
    |> then(fn r ->
      if intent == "lively" and c["quiet"] == false,
        do: ["lively fits what you said tonight" | r],
        else: r
    end)
    |> then(fn r ->
      if intent == "quiet" and c["quiet"] == true,
        do: ["quiet fits what you said tonight" | r],
        else: r
    end)
    |> then(fn r ->
      if intent != "lively" and c["quiet"] == true and
           Enum.any?(rel_prefs, fn p -> stringify(p)["preference"] =~ ~r/quiet/i end),
         do: ["fits relationship preference (private)" | r],
         else: r
    end)
    |> Enum.reverse()
  end

  defp suppressed(all, ranked, category) do
    ranked_ids = MapSet.new(Enum.map(ranked, & &1["id"]))

    all
    |> Enum.reject(&MapSet.member?(ranked_ids, &1["id"]))
    |> Enum.take(3)
    |> Enum.map(fn c ->
      reason =
        cond do
          category && String.downcase(c["cuisine"] || "") != category ->
            "category mismatch"

          true ->
            "lower fit"
        end

      %{"id" => c["id"], "reason" => reason}
    end)
  end

  defp irrelevant(reason) do
    %{
      "ranked" => [],
      "reasons" => %{},
      "privacy" => "private_viewer",
      "authority" => "candidate_only",
      "suppressed" => [%{"reason" => reason}],
      "irrelevant" => true
    }
  end

  defp present?(nil), do: false
  defp present?(""), do: false
  defp present?(s) when is_binary(s), do: String.trim(s) != ""
  defp present?(_), do: true

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: other
end
