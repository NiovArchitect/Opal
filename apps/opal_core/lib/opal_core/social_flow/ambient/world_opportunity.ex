defmodule OpalCore.SocialFlow.Ambient.WorldOpportunity do
  @moduledoc """
  Provider-neutral acquisition: WHAT EXISTS?

  Pipeline:
  bounds → OpportunitySource contract → hard filters → optional heat
  → candidates for CollectiveFit / OpeningQuality / SmallestOutput

  Not CollectiveFit (what fits). Not Ambient surface (whether to interrupt).
  Not a feed. Fixtures by default; real providers plug in via source contract.

  World Heat is optional enrichment, never objective from stars/reviews alone.
  """

  alias OpalCore.SocialFlow.Ambient.{Heat, ProviderResultGate, ProviderTier}
  alias OpalCore.SocialFlow.Physical.{HardCandidateFilter, OpportunitySource, WorldFact}

  @experience_types ~w(
    restaurant coffee park concert market sports community church
    museum class experience pop_up activity outdoor event dinner drinks
  )

  def experience_types, do: @experience_types

  @doc """
  Acquire candidates in a zone with staged filters.

  Composes ProviderTier (do not query when worthless) + source contract.
  """
  def acquire(attrs) when is_map(attrs) do
    a = stringify(attrs)
    area = a["area_label"] || a["primary_area"]
    mode = a["coordination_mode"] || horizon_mode(a)
    available_min = to_i(a["available_minutes"] || a["opening_minutes"] || 0)

    tier =
      ProviderTier.authorize(%{
        "social_opening" => a["social_opening"] != false,
        "opening_exists" => a["opening_exists"] != false,
        "quality_band" => a["quality_band"] || "solid",
        "time_compatible" => a["time_compatible"] != false,
        "participants_viable" => a["participants_viable"] != false,
        "category" => a["category"] || a["experience_type"],
        "place_category_constrained" => (a["category"] || a["experience_type"]) not in [nil, ""],
        "area_label" => area,
        "zone_known" => is_binary(area),
        "actionable" => a["actionable"] == true,
        "need_live_inventory" => a["need_live_inventory"] == true,
        "weak_intent" => a["weak_intent"] == true,
        "fresh_enough" => a["fresh_enough"] != false,
        "humans_already_solved" => a["humans_already_solved"] == true,
        "topic_changed" => a["topic_changed"] == true
      })

    if tier["world_acquire_ok"] do
      query = build_query(a, area, mode, tier)

      with {:ok, acquired} <- OpportunitySource.acquire(query) do
        if acquired["skipped"] do
          {:ok, Map.merge(acquired, %{"provider_tier" => tier["tier"]})}
        else
          {:ok, post_process(acquired, a, available_min, mode, tier)}
        end
      end
    else
      {:ok, skip_result(tier["reason"] || "provider_tier_low", tier)}
    end
  end

  def acquire(_), do: {:ok, %{"candidates" => [], "candidate_count" => 0}}

  @doc "Filter for duration and open-now realism (legacy helper)."
  def valid_candidate?(c, available_min, mode) when is_map(c) do
    c = stringify(c)
    open? = c["open_at_plan_time"] != false and c["open_now"] != false
    dur = to_i(c["duration_minutes"] || default_duration(c["categories"]))

    duration_ok? = available_min <= 0 or dur <= 0 or dur <= available_min
    spontaneous_ok? = mode not in ~w(already_out tonight now) or open?

    open? and duration_ok? and spontaneous_ok?
  end

  def valid_candidate?(_, _, _), do: false

  defp build_query(a, area, mode, tier) do
    source =
      cond do
        (a["category"] || "") in ~w(event concert market community sports outdoor) -> "events"
        a["source"] in ["events", :events] -> "events"
        true -> "catalog"
      end

    %{
      "area_label" => area,
      "primary_area" => area,
      "category" => a["category"] || a["experience_type"],
      "experience_type" => a["experience_type"],
      "source" => source,
      "coordination_mode" => mode,
      "party_size" => a["party_size"],
      "plan_version" => a["plan_version"],
      "time_window" => a["time_window"],
      "weak_intent" => a["weak_intent"] == true,
      "humans_already_solved" => a["humans_already_solved"] == true,
      "topic_changed" => a["topic_changed"] == true,
      "actionability_probability" => a["actionability_probability"] || default_prob(tier),
      "live" => tier["live_provider_ok"] == true and a["need_live_inventory"] == true,
      "retrieval_mode" =>
        if(tier["tier"] == "higher", do: "live_query", else: "fixture_or_cache"),
      "max_candidates" => a["max_candidates"] || 20
    }
  end

  defp default_prob(%{"tier" => "higher"}), do: 0.8
  defp default_prob(%{"tier" => "medium"}), do: 0.55
  defp default_prob(%{"tier" => "transactional"}), do: 0.9
  defp default_prob(_), do: 0.3

  defp post_process(acquired, a, available_min, mode, tier) do
    raw = List.wrap(acquired["candidates"])

    enriched =
      raw
      |> Enum.map(&enrich_experience/1)
      |> Enum.filter(&valid_candidate?(&1, available_min, mode))

    hard =
      HardCandidateFilter.filter(enriched, %{
        "coordination_mode" => mode,
        "available_minutes" => available_min,
        "party_size" => a["party_size"],
        "max_travel_minutes" => a["max_travel_minutes"],
        "travel_by_place" => a["travel_by_place"] || %{},
        "accessibility_required" => a["accessibility_required"] == true,
        "max_price_band" => a["max_price_band"],
        "age_restricted_ok" => a["age_restricted_ok"] != false
      })

    filtered = hard["candidates"]

    # Optional gate: if caller supplies plan version fingerprint, enforce
    admit =
      ProviderResultGate.admit?(%{
        "result_plan_version" => acquired["plan_version"] || a["plan_version"],
        "active_plan_version" => a["active_plan_version"] || a["plan_version"],
        "result_fingerprint" => acquired["query_fingerprint"],
        "active_fingerprint" => acquired["query_fingerprint"],
        "claim_type" => "fit",
        "observed_at" => DateTime.utc_now()
      })

    candidates = if admit["admit"], do: filtered, else: []

    world_heat = compute_heat(candidates, a)
    authentic_heat? = authentic_heat?(world_heat, candidates, a)

    %{
      "candidates" => candidates,
      "candidate_count" => length(candidates),
      "hard_rejected" => hard["rejected"],
      "hard_rejected_count" => hard["rejected_count"],
      "world_heat" => world_heat,
      "authentic_world_heat" => authentic_heat?,
      "heat_optional" => true,
      "popularity_is_not_heat" => true,
      "area_label" => a["area_label"] || a["primary_area"],
      "query_fingerprint" => acquired["query_fingerprint"],
      "provider_tier" => tier["tier"],
      "live_provider_ok" => tier["live_provider_ok"],
      "provider_queries_avoided" => tier["provider_queries_avoided"] == true,
      "provider_is_not_authority" => true,
      "feed" => false,
      "map_ui" => false,
      "acquisition_only" => true,
      "answers" => "what_exists",
      "does_not_answer" => "what_should_users_do",
      "authorizes_set" => false,
      "result_admitted" => admit["admit"]
    }
  end

  defp compute_heat(candidates, a) do
    live_activity =
      Enum.any?(candidates, fn c ->
        facts = List.wrap(c["facts"])
        Enum.any?(facts, &(&1["kind"] == "activity_signal"))
      end)

    # Stars alone must not feed world heat as live demand
    fake_trending =
      Enum.any?(candidates, fn c ->
        WorldFact.popularity_is_not_live_heat?(c) and a["treat_rating_as_heat"] == true
      end)

    venue_demand =
      if fake_trending do
        0.0
      else
        to_f(a["venue_demand"] || 0.0)
      end

    case Heat.compute(%{
           "local_activity" =>
             if(live_activity, do: 0.6, else: min(length(candidates) / 8.0, 0.35)),
           "event_happening" =>
             Enum.any?(candidates, &("event" in List.wrap(&1["categories"]))) or
               a["event_happening"] == true,
           "venues_open" => Enum.any?(candidates, &(&1["open_at_plan_time"] != false)),
           "venue_demand" => venue_demand,
           "authoritative_public_activity" =>
             a["authoritative_public_activity"] == true or live_activity
         }) do
      {:ok, h} -> h
      _ -> %{}
    end
  end

  defp authentic_heat?(world_heat, candidates, a) do
    world = to_f(world_heat["world"])

    live_evidence =
      a["authoritative_public_activity"] == true or
        a["event_happening"] == true or
        Enum.any?(candidates, fn c ->
          Enum.any?(List.wrap(c["facts"]), &(&1["kind"] in ~w(activity_signal inventory_low)))
        end)

    world > 0.3 and live_evidence
  end

  defp skip_result(reason, tier) do
    %{
      "candidates" => [],
      "candidate_count" => 0,
      "skipped" => true,
      "reason" => reason,
      "provider_tier" => tier["tier"],
      "provider_queries_avoided" => true,
      "provider_is_not_authority" => true,
      "authorizes_set" => false,
      "feed" => false
    }
  end

  defp horizon_mode(a) do
    hours = a["hours_until_candidate"]

    cond do
      a["coordination_mode"] -> a["coordination_mode"]
      is_number(hours) and hours <= 3 -> "now"
      is_number(hours) and hours <= 12 -> "tonight"
      is_number(hours) and hours > 48 -> "planning_ahead"
      true -> "tonight"
    end
  end

  defp enrich_experience(p) do
    p = stringify(p)
    cats = List.wrap(p["categories"])

    p
    |> Map.put("duration_minutes", p["duration_minutes"] || default_duration(cats))
    |> Map.put("experience_kind", experience_kind(cats))
  end

  defp default_duration(cats) do
    cond do
      "coffee" in cats -> 45
      "concert" in cats or "event" in cats -> 180
      "park" in cats or "outdoor" in cats -> 90
      "dinner" in cats -> 120
      "drinks" in cats -> 90
      true -> 90
    end
  end

  defp experience_kind(cats) do
    cond do
      "event" in cats or "concert" in cats -> "event"
      "coffee" in cats -> "coffee"
      "park" in cats -> "park"
      "dinner" in cats -> "restaurant"
      true -> "experience"
    end
  end

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
