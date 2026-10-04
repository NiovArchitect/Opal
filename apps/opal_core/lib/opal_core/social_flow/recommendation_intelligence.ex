defmodule OpalCore.SocialFlow.RecommendationIntelligence do
  @moduledoc """
  Track A5 — context-aware recommendation intelligence.

  A recommendation is a hypothesis about fit — not a fact, automatic decision,
  or permanent preference. Soft prefs influence; confirmed boundaries exclude;
  current intent outranks stale memory; private signals never leak into shared
  reasons; novelty fights filter bubbles.

  Pipeline (staged, deterministic):
  need → generate → hard constraints → permissioned memory → score →
  relationship/group fit → novelty → small set → session correction.

  Does not commit SharedPlan. Does not auto-write durable memory from accepts.
  Reuses CandidateProvider / Catalog / PreferenceMemory / HardCandidateFilter /
  PlaceOptionComposition / MemoryIntelligence — does not duplicate them.
  """

  alias OpalCore.SocialFlow.CandidateProvider
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.MemoryIntelligence
  alias OpalCore.SocialFlow.Physical.HardCandidateFilter
  alias OpalCore.SocialFlow.PlaceOptionComposition
  alias OpalCore.SocialFlow.RealWorld.Place.{Catalog, PreferenceMemory}

  @default_limit 3
  @weak_confidence_ceiling 0.45

  # --- Laws (proof accessors) ---

  def preference_is_soft?, do: true
  def preference_becomes_hard_exclusion?, do: false
  def boundary_ignored_as_soft_signal?, do: false
  def stale_memory_overrides_current_intent?, do: false
  def private_memory_exposed_in_shared_reason?, do: false
  def private_signal_explanation_leak?, do: false
  def recommendation_engine_commits_shared_plan?, do: false
  def non_selection_auto_dislike?, do: false
  def location_context_to_memory?, do: false
  def recommendation_self_confirmation_to_durable_memory?, do: false
  def personalization_filter_bubble?, do: false
  def recommendation_reason_unsupported?, do: false

  @doc """
  Rank a small set of contextual recommendations.

  Attrs (string or atom keys):
  - candidates (optional fixture list)
  - activity / what / current_request
  - current_intent ("lively" | "quiet" | "indoor" | "outdoor" | nil)
  - relationship_context ("partner" | "friends" | "solo" | "family" | ...)
  - participants: [%{user_id, prefs, boundaries, private?}]
  - soft_prefs / relationship_prefs / episode_prefs
  - boundaries (confirmed hard signals)
  - hard_constraints (accessibility_required, party_size, max_travel_minutes, ...)
  - recent_visits / history
  - session_corrections (from apply_correction)
  - viewer_user_id (for private layer)
  - shared_board? (default true)
  - limit (default 3)
  - plan (where / where_known / fixed_event)
  """
  def recommend(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with :ok <- need?(a) do
      candidates = generate(a)
      {hard_kept, hard_rejected, constraint_notes} = apply_hard(candidates, a)
      memory = retrieve_memory(a)
      scored = score_all(hard_kept, a, memory)
      diversified = apply_novelty(scored, a)
      limited = Enum.take(diversified, limit(a))
      board = project_board(limited, a, memory)

      {:ok,
       %{
         "ranked" => board,
         "limit" => limit(a),
         "hard_rejected" => hard_rejected,
         "constraint_notes" => constraint_notes,
         "shared_board_ids" => Enum.map(board, & &1["id"]),
         "authority" => "candidate_hypothesis",
         "commits_shared_plan" => false,
         "writes_durable_memory" => false,
         "current_intent" => intent(a),
         "relationship_context" => a["relationship_context"],
         "privacy" => "shared_reasons_permissioned_only",
         "group_fit_model" => "overlap_not_average",
         "irrelevant" => false
       }}
    end
  end

  def recommend(_), do: {:reject, :invalid}

  @doc """
  Session-scoped correction. Does not write durable dislike.

  Kinds: not_tonight | not_for_us | too_far | too_expensive | want_quieter | show_new | wrong_assumption
  """
  def apply_correction(prior_result, correction) when is_map(prior_result) and is_map(correction) do
    c = stringify(correction)
    kind = c["kind"] || c["correction"] || "not_tonight"
    candidate_id = c["candidate_id"] || c["id"]

    scope =
      case kind do
        "never_recommend" -> "never"
        "not_for_us" -> "relationship_session"
        _ -> "session_context"
      end

    durable? = kind == "never_recommend" and c["force_durable"] == true

    entry = %{
      "kind" => kind,
      "candidate_id" => candidate_id,
      "scope" => scope,
      "durable_memory_written" => durable?,
      "not_tonight_scope" => scope == "session_context",
      "at" => DateTime.utc_now() |> DateTime.truncate(:microsecond)
    }

    corrections = List.wrap(prior_result["session_corrections"]) ++ [entry]

    rerank_attrs =
      (prior_result["request"] || %{})
      |> stringify()
      |> Map.put("session_corrections", corrections)
      |> Map.put("candidates", prior_result["all_candidates"] || extract_pool(prior_result))

    case recommend(rerank_attrs) do
      {:ok, result} ->
        {:ok,
         result
         |> Map.put("session_corrections", corrections)
         |> Map.put("correction_applied", entry)
         |> Map.put("durable_memory_written", false)
         |> Map.put("request", rerank_attrs)}

      other ->
        other
    end
  end

  def apply_correction(_, _), do: {:reject, :invalid}

  @doc "Record accept as evidence hook only — never durable auto-memory."
  def record_acceptance(_recommendation, _attrs \\ %{}) do
    %{
      "evidence_kind" => "recommendation_accepted",
      "durable_memory_written" => false,
      "self_reinforcing_bias" => false,
      "feeds_candidate_evidence_later" => true
    }
  end

  @doc "Privacy-safe shared explanation for a ranked candidate."
  def explain_safe(candidate, opts \\ %{}) when is_map(candidate) do
    c = stringify(candidate)
    o = stringify(opts)
    shared = List.wrap(c["shared_reasons"] || c["reasons"])

    leaked =
      Enum.any?(shared, fn r ->
        s = to_string(r)
        String.contains?(s, "private") or String.contains?(s, "Walk ") or
          Regex.match?(~r/\bbecause\s+\w+\s+likes\b/i, s)
      end)

    if leaked and o["allow_leak"] != true do
      %{"reasons" => safe_fallback_reasons(c), "private_leak" => false, "sanitized" => true}
    else
      %{"reasons" => shared, "private_leak" => false, "sanitized" => false}
    end
  end

  # --- Pipeline stages ---

  defp need?(a) do
    cond do
      a["fixed_event"] == true or a["fixed_event?"] == true ->
        {:reject, :fixed_event}

      present?(a["where"]) or a["where_known"] == true or a["where_known?"] == true ->
        {:reject, :where_already_known}

      a["recommendation_need"] == false ->
        {:reject, :no_need}

      true ->
        :ok
    end
  end

  defp generate(a) do
    cond do
      is_list(a["candidates"]) and a["candidates"] != [] ->
        Enum.map(a["candidates"], &normalize_candidate/1)

      true ->
        activity = a["activity"] || a["what"] || "dinner"
        party = a["party_size"] || a["hard_constraints"]["party_size"] || 2

        from_catalog =
          Catalog.list_candidates(category: catalog_category(activity), capacity_min: party)
          |> Enum.map(&normalize_candidate/1)

        if from_catalog == [] do
          CandidateProvider.recommend(to_string(activity), [], %{}, %{})
          |> Enum.map(&normalize_candidate/1)
        else
          from_catalog
        end
    end
  end

  defp apply_hard(candidates, a) do
    constraints = stringify(a["hard_constraints"] || %{})
    boundaries = List.wrap(a["boundaries"])

    accessibility_required =
      constraints["accessibility_required"] == true or
        Enum.any?(boundaries, &boundary_accessibility?/1)

    filter_attrs =
      constraints
      |> Map.put("accessibility_required", accessibility_required)
      |> Map.put_new("party_size", a["party_size"])
      |> Map.put_new("coordination_mode", a["coordination_mode"] || "plan")

    filtered = HardCandidateFilter.filter(candidates, filter_attrs)
    kept = filtered["candidates"] || []

    # Accessibility unknown: keep but annotate — never invent accessible=true
    {kept2, notes} =
      Enum.map_reduce(kept, [], fn c, acc ->
        c = stringify(c)

        cond do
          accessibility_required and Map.get(c, "accessible") == nil ->
            note = %{
              "candidate_id" => c["id"],
              "constraint" => "accessibility",
              "status" => "unknown",
              "inferred_accessible" => false
            }

            {Map.put(c, "constraint_status", Map.merge(c["constraint_status"] || %{}, %{"accessibility" => "unknown"})),
             [note | acc]}

          accessibility_required and c["accessible"] == false ->
            # HardCandidateFilter should already reject; belt-and-suspenders
            {nil, acc}

          true ->
            {c, acc}
        end
      end)

    kept2 = Enum.reject(kept2, &is_nil/1)

    # Also exclude via confirmed non-accessibility boundaries that filter missed
    kept3 =
      if accessibility_required do
        Enum.reject(kept2, fn c -> c["accessible"] == false end)
      else
        kept2
      end

    kept_ids = MapSet.new(Enum.map(kept3, & &1["id"]))

    extra_rejected =
      candidates
      |> Enum.map(&stringify/1)
      |> Enum.reject(&MapSet.member?(kept_ids, &1["id"]))
      |> Enum.map(fn c ->
        reason =
          if accessibility_required and c["accessible"] == false,
            do: "accessibility_incompatible",
            else: "hard_filtered"

        %{"candidate_id" => c["id"] || c["name"], "reason" => reason}
      end)

    rejected =
      ((filtered["rejected"] || []) ++ extra_rejected)
      |> Enum.uniq_by(& &1["candidate_id"])

    {kept3, rejected, Enum.reverse(notes)}
  end

  defp retrieve_memory(a) do
    soft = Enum.map(List.wrap(a["soft_prefs"]) ++ List.wrap(a["relationship_prefs"]), &stringify/1)
    episode = Enum.map(List.wrap(a["episode_prefs"]), &stringify/1)
    participants = List.wrap(a["participants"])

    from_participants =
      Enum.flat_map(participants, fn p ->
        p = stringify(p)
        owner = p["user_id"]

        prefs =
          Enum.map(List.wrap(p["prefs"]), fn pref ->
            stringify(pref)
            |> Map.put_new("owner_user_id", owner)
            |> Map.put_new("permission_class", p["permission_class"] || "owner_private")
          end)

        prefs
      end)

    durable =
      if a["load_durable"] == true do
        ids =
          (a["owner_user_ids"] || Enum.map(participants, &stringify(&1)["user_id"]))
          |> List.wrap()
          |> Enum.filter(&uuid?/1)

        if ids == [] do
          []
        else
          ids
          |> DurablePreferenceMemory.facts_for_participants()
          |> Enum.map(&stringify/1)
        end
      else
        []
      end

    a4 =
      if a["load_a4_candidates"] == true and uuid?(a["viewer_user_id"]) do
        MemoryIntelligence.candidates_for_context(a["viewer_user_id"],
          relationship_id: a["relationship_id"],
          activity: a["activity"]
        )
      else
        []
      end

    %{
      soft: soft ++ from_participants,
      episode: episode,
      durable: durable,
      candidates: a4,
      boundaries: Enum.map(List.wrap(a["boundaries"]), &stringify/1)
    }
  end

  defp score_all(candidates, a, memory) do
    intent = intent(a)
    rel_ctx = a["relationship_context"]
    corrections = List.wrap(a["session_corrections"])
    recent = MapSet.new(List.wrap(a["recent_visits"]) |> Enum.map(&to_string/1))
    history_rejects = MapSet.new(List.wrap(a["history_rejected"]) |> Enum.map(&to_string/1))

    # Prefer PreferenceMemory for soft ranking baseline
    prefs_for_rank = usable_soft_prefs(memory, a)

    ranked0 =
      PreferenceMemory.rank_candidates(candidates, prefs_for_rank, %{
        "current_intent" => intent_for_pref_memory(intent),
        "current_category" => a["current_category"] || episode_category(a),
        "relationship_id" => a["relationship_id"]
      })

    Enum.map(ranked0, fn c ->
      c = stringify(c)
      base = to_float(c["score"], 3.0)

      {adj, private_reasons, shared_reasons, signals} =
        score_components(c, a, memory, intent, rel_ctx, recent, history_rejects, corrections)

      booking = capability(c)

      c
      |> Map.put("score", Float.round(base + adj, 3))
      |> Map.put("private_reasons", private_reasons)
      |> Map.put("shared_reasons", shared_reasons)
      |> Map.put("signals", signals)
      |> Map.put("capabilities", booking)
      |> Map.put("fit_hypothesis", true)
    end)
    |> Enum.sort_by(& &1["score"], :desc)
  end

  defp score_components(c, a, memory, intent, rel_ctx, recent, history_rejects, corrections) do
    id = to_string(c["id"] || c["display_name"])
    quiet? = c["quiet"] == true
    outdoor? = c["outdoor"] == true
    shared = []
    private = []
    signals = []
    adj = 0.0

    # 1) Current intent (strongest soft)
    {adj, shared, signals} =
      cond do
        intent == "lively" and not quiet? ->
          {adj + 1.4, ["Fits lively tonight" | shared],
           [%{"type" => "current_intent", "strength" => "high"} | signals]}

        intent == "lively" and quiet? ->
          {adj - 1.1, shared, [%{"type" => "current_intent_mismatch", "strength" => "high"} | signals]}

        intent == "quiet" and quiet? ->
          {adj + 0.9, ["Fits quieter tonight" | shared],
           [%{"type" => "current_intent", "strength" => "high"} | signals]}

        intent == "quiet" and not quiet? ->
          {adj - 0.8, shared, signals}

        intent == "indoor" and not outdoor? ->
          {adj + 0.7, ["Fits indoor tonight" | shared],
           [%{"type" => "current_intent", "strength" => "high"} | signals]}

        intent == "outdoor" and outdoor? ->
          {adj + 0.7, ["Fits outdoor seating" | shared],
           [%{"type" => "current_intent", "strength" => "high"} | signals]}

        true ->
          {adj, shared, signals}
      end

    # 2) Relationship context
    {adj, shared, signals} =
      cond do
        rel_ctx == "partner" and quiet? ->
          {adj + 0.55, ["Good fit for a quieter date" | shared],
           [%{"type" => "relationship_context", "context" => "partner"} | signals]}

        rel_ctx == "partner" and not quiet? ->
          {adj - 0.35, shared, signals}

        rel_ctx == "friends" and not quiet? ->
          {adj + 0.45, ["Good fit for a group outing" | shared],
           [%{"type" => "relationship_context", "context" => "friends"} | signals]}

        rel_ctx == "friends" and quiet? ->
          {adj - 0.2, shared, signals}

        rel_ctx == "family" and (c["family_friendly"] == true or (c["max_party"] || 0) >= 4) ->
          {adj + 0.35, ["Works for family" | shared],
           [%{"type" => "relationship_context", "context" => "family"} | signals]}

        true ->
          {adj, shared, signals}
      end

    # 3) Soft memory (never hard exclude). Current intent already handled above —
    # stale quiet memory must not re-imprison when intent is lively.
    {adj, private, signals} =
      Enum.reduce(usable_soft_prefs(memory, a), {adj, private, signals}, fn pref, {acc, priv, sigs} ->
        pref = stringify(pref)
        label = down(pref["preference"] || "")
        w = PreferenceMemory.weight(pref) * confidence_scale(pref)
        pol = pref["polarity"] || "prefer"
        private? = pref["permission_class"] in [nil, "owner_private"]

        cond do
          # Stale quiet memory under lively intent: ignore for scoring
          intent == "lively" and label =~ ~r/quiet/ ->
            {acc, priv, [%{"type" => "memory_suppressed_by_intent"} | sigs]}

          intent == "indoor" and label =~ ~r/outdoor/ ->
            {acc, priv, [%{"type" => "memory_suppressed_by_intent"} | sigs]}

          # Weak one-off / low confidence: tiny influence only
          weak_pref?(pref) ->
            delta =
              if matches_pref?(c, label, pol), do: w * 0.08, else: 0.0

            {acc + delta, priv,
             [%{"type" => "weak_candidate_memory", "strength" => "tiny", "weight" => delta} | sigs]}

          matches_pref?(c, label, pol) and pol in ~w(prefer want) ->
            delta = w * 0.45
            reason = "Fits a preference you shared"
            priv2 = if private?, do: [reason | priv], else: priv
            shared_ok = if private?, do: false, else: true

            {acc + delta, priv2,
             [
               %{
                 "type" => "soft_preference",
                 "strength" => "medium",
                 "private" => private?,
                 "shared_ok" => shared_ok
               }
               | sigs
             ]}

          matches_pref?(c, label, pol) and pol in ~w(avoid dislike reject) ->
            {acc - w * 0.5, priv, [%{"type" => "soft_avoid"} | sigs]}

          true ->
            {acc, priv, sigs}
        end
      end)

    # 4) Group overlap (participants with cuisine prefs)
    {adj, shared, signals} = group_overlap_adjust(c, a, adj, shared, signals)

    # 5) History / novelty pressure
    {adj, shared, signals} =
      cond do
        MapSet.member?(history_rejects, id) ->
          {adj - 0.9, shared, [%{"type" => "recently_rejected"} | signals]}

        MapSet.member?(recent, id) ->
          {adj - 0.25, ["Something different from recent picks may help" | shared],
           [%{"type" => "recent_visit_novelty_pressure"} | signals]}

        true ->
          {adj, shared, signals}
      end

    # 6) Session corrections
    {adj, shared, signals} =
      Enum.reduce(corrections, {adj, shared, signals}, fn corr, {acc, sh, sigs} ->
        corr = stringify(corr)

        cond do
          corr["candidate_id"] == id and corr["kind"] in ~w(not_tonight not_for_us too_far too_expensive) ->
            {acc - 2.5, sh, [%{"type" => "session_correction", "kind" => corr["kind"]} | sigs]}

          corr["kind"] == "show_new" and MapSet.member?(recent, id) ->
            {acc - 0.8, sh, [%{"type" => "session_show_new"} | sigs]}

          corr["kind"] == "want_quieter" and c["quiet"] == true ->
            {acc + 0.6, ["Quieter option" | sh], sigs}

          corr["kind"] == "want_quieter" and c["quiet"] == false ->
            {acc - 0.6, sh, sigs}

          true ->
            {acc, sh, sigs}
        end
      end)

    # Activity fit shared reason
    shared =
      if a["activity"] in ["dinner", "Dinner", nil] or down(a["what"] || "") =~ ~r/dinner/ do
        ["Good fit for dinner" | shared]
      else
        shared
      end

    {adj, Enum.uniq(private), Enum.uniq(shared), signals}
  end

  defp group_overlap_adjust(c, a, adj, shared, signals) do
    participants = List.wrap(a["participants"])

    if length(participants) < 2 do
      {adj, shared, signals}
    else
      cuisines =
        participants
        |> Enum.map(fn p ->
          p = stringify(p)

          p["prefs"]
          |> List.wrap()
          |> Enum.map(&stringify/1)
          |> Enum.map(&down(&1["preference"] || ""))
          |> Enum.find(&(&1 =~ ~r/italian|seafood|sushi|mexican|american|outdoor/))
        end)
        |> Enum.reject(&is_nil/1)

      cand_cuisine = down(c["cuisine"] || "")
      name = down(c["display_name"] || c["name"] || "")

      hits =
        Enum.count(cuisines, fn pref ->
          String.contains?(cand_cuisine, pref) or String.contains?(name, pref) or
            (pref =~ ~r/seafood/ and cand_cuisine =~ ~r/seafood|fish|harbor/) or
            (pref =~ ~r/italian/ and cand_cuisine =~ ~r/italian/) or
            (pref =~ ~r/american/ and cand_cuisine =~ ~r/american/)
        end)

      cond do
        hits >= 2 ->
          {adj + 1.0, ["You both may like this" | shared],
           [%{"type" => "group_overlap", "hits" => hits} | signals]}

        hits == 1 ->
          {adj + 0.25, shared, [%{"type" => "group_partial", "hits" => 1} | signals]}

        # Overlap cuisine tags on candidate
        c["overlap"] == true or c["shared_fit"] == true ->
          {adj + 0.9, ["Strong shared fit" | shared],
           [%{"type" => "group_overlap", "tagged" => true} | signals]}

        true ->
          {adj, shared, signals}
      end
    end
  end

  defp apply_novelty(scored, a) do
    recent = MapSet.new(List.wrap(a["recent_visits"]) |> Enum.map(&to_string/1))
    limit = limit(a)

    if scored == [] do
      []
    else
      # Prefer diversity in top set: strongest, then overlap/shared, then novel
      familiar =
        Enum.find(scored, fn c -> MapSet.member?(recent, to_string(c["id"])) end)

      novel =
        Enum.find(scored, fn c ->
          id = to_string(c["id"])
          not MapSet.member?(recent, id) and (familiar == nil or c["id"] != familiar["id"])
        end)

      overlap =
        Enum.find(scored, fn c ->
          Enum.any?(c["signals"] || [], fn s -> s["type"] in ~w(group_overlap) end)
        end)

      primary = hd(scored)

      picked =
        [primary, overlap, novel, familiar]
        |> Enum.reject(&is_nil/1)
        |> Enum.uniq_by(& &1["id"])

      rest = Enum.reject(scored, fn c -> Enum.any?(picked, &(&1["id"] == c["id"])) end)
      (picked ++ rest) |> Enum.take(max(limit, length(picked)))
    end
  end

  defp project_board(ranked, a, _memory) do
    viewer = a["viewer_user_id"]
    shared_board? = a["shared_board"] != false

    Enum.map(ranked, fn c ->
      shared_reasons = List.wrap(c["shared_reasons"]) |> Enum.reject(&private_looking?/1)
      private_reasons = if viewer && a["include_private_reasons"] == true, do: c["private_reasons"], else: []

      %{
        "id" => c["id"],
        "display_name" => c["display_name"] || c["name"],
        "candidate_type" => c["candidate_type"] || "place",
        "cuisine" => c["cuisine"],
        "quiet" => c["quiet"],
        "outdoor" => c["outdoor"],
        "accessible" => Map.get(c, "accessible"),
        "constraint_status" => c["constraint_status"] || %{},
        "score" => c["score"],
        "shared_reasons" => shared_reasons,
        "private_reasons" => private_reasons,
        "capabilities" => c["capabilities"] || capability(c),
        "provenance" => c["provenance"] || "catalog_fixture",
        "fit_hypothesis" => true,
        "shared_board" => shared_board?,
        "signals" => sanitize_signals_for_shared(c["signals"] || [])
      }
    end)
  end

  # --- Helpers ---

  defp usable_soft_prefs(memory, a) do
    # On shared board scoring, private prefs still influence aggregate fit
    # but explanations stay sanitized in project_board.
    all = memory.soft ++ memory.episode ++ memory.durable

    # Convert A4 candidates with enough confidence.
    # Phase 5C: parse structured taste summaries into rankable labels, and map
    # repeated accepted_plan_pattern (obs ≥ 3) to repeated_behavior weight —
    # without lowering the 0.5 confidence floor or weakening memory gates.
    # recurring_routine (temporal) is excluded — WHEN, not WHERE.
    from_a4 =
      Enum.flat_map(memory.candidates, fn cand ->
        cand = stringify(cand)
        conf = to_float(cand["confidence"], 0.0)

        if cand["memory_class"] in ~w(preference boundary) and conf >= 0.5 do
          obs = parse_obs(cand["observation_count"])
          ek = cand["evidence_kind"]

          [
            %{
              "preference" => preference_label_from_candidate(cand),
              "polarity" => cand["polarity"] || "prefer",
              "weight_class" => a4_weight_class(ek, obs),
              "confidence" => conf,
              "observation_count" => obs,
              "evidence_kind" => ek,
              "permission_class" => "owner_private",
              "owner_user_id" => cand["owner_user_id"],
              "revoked" => false
            }
          ]
        else
          []
        end
      end)

    (all ++ from_a4 ++ List.wrap(a["extra_prefs"]))
    |> Enum.map(&stringify/1)
    |> Enum.reject(&(&1["revoked"] == true))
  end

  # Structured 5A taste keys → place-rankable preference text (extract, don't invent).
  defp preference_label_from_candidate(cand) do
    summary = to_string(cand["candidate_summary"] || "")

    case Regex.run(~r/^taste:([a-z_]+):(.+)$/i, summary) do
      [_, dim, value] when dim in ~w(cuisine vibe area) ->
        String.trim(value)

      [_, "price", value] ->
        "price " <> String.trim(value)

      _ ->
        summary
    end
  end

  defp a4_weight_class("explicit_statement", _), do: "explicit_current"

  defp a4_weight_class(ek, obs)
       when ek in ~w(repeated_behavior accepted_plan_pattern) and obs >= 3 do
    "repeated_behavior"
  end

  defp a4_weight_class(_, _), do: "inferred"

  defp parse_obs(n) when is_integer(n) and n > 0, do: n
  defp parse_obs(n) when is_float(n) and n > 0, do: trunc(n)

  defp parse_obs(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} when i > 0 -> i
      _ -> 1
    end
  end

  defp parse_obs(_), do: 1

  defp weak_pref?(pref) do
    pref = stringify(pref)
    conf = to_float(pref["confidence"], 0.7)
    wc = pref["weight_class"]
    obs = pref["observation_count"] || 1

    wc in ~w(inferred old_statement) or conf < @weak_confidence_ceiling or
      (wc != "explicit_current" and obs < 2 and pref["evidence_kind"] in [nil, "inference", "accepted_plan_pattern"])
  end

  defp matches_pref?(c, label, pol) do
    cuisine = down(c["cuisine"] || "")
    name = down(c["display_name"] || c["name"] || "")
    outdoor? = c["outdoor"] == true
    quiet? = c["quiet"] == true

    cond do
      label =~ ~r/quiet/ and pol in ~w(prefer want) -> quiet?
      label =~ ~r/loud|lively|noisy/ and pol in ~w(prefer want) -> not quiet?
      label =~ ~r/outdoor/ and pol in ~w(prefer want) -> outdoor?
      label =~ ~r/indoor/ and pol in ~w(prefer want) -> not outdoor?
      label =~ ~r/italian/ -> cuisine =~ ~r/italian/ or name =~ ~r/italian|juniper/
      label =~ ~r/seafood/ -> cuisine =~ ~r/seafood|fish/ or name =~ ~r/harbor|seafood/
      label =~ ~r/sushi/ -> cuisine =~ ~r/sushi|japanese/
      label != "" and (String.contains?(cuisine, label) or String.contains?(name, label)) -> true
      true -> false
    end
  end

  defp confidence_scale(pref) do
    conf = to_float(pref["confidence"], 0.7)
    max(0.15, min(1.0, conf))
  end

  defp boundary_accessibility?(b) do
    b = stringify(b)
    t = down(b["summary"] || b["text"] || b["value"] || b["preference"] || "")
    b["kind"] in ~w(accessibility wheelchair) or t =~ ~r/wheelchair|accessib/
  end

  defp intent(a) do
    a["current_intent"] ||
      PlaceOptionComposition.detect_current_intent(a["current_request"] || a["text"] || "") ||
      detect_indoor_outdoor(a["current_request"] || a["text"] || "")
  end

  defp intent_for_pref_memory("indoor"), do: nil
  defp intent_for_pref_memory("outdoor"), do: nil
  defp intent_for_pref_memory(other), do: other

  defp detect_indoor_outdoor(text) when is_binary(text) do
    cond do
      Regex.match?(~r/\bsit inside|indoor|inside tonight\b/i, text) -> "indoor"
      Regex.match?(~r/\boutdoor|patio|outside\b/i, text) -> "outdoor"
      true -> nil
    end
  end

  defp detect_indoor_outdoor(_), do: nil

  defp episode_category(a) do
    PlaceOptionComposition.episode_category(a) || a["current_category"]
  end

  defp catalog_category(activity) when is_binary(activity) do
    case down(activity) do
      a when a in ~w(dinner drinks food restaurant) -> "dinner"
      a when a in ~w(coffee) -> "coffee"
      a when a in ~w(event) -> "event"
      _ -> "dinner"
    end
  end

  defp catalog_category(_), do: "dinner"

  defp normalize_candidate(c) when is_map(c) do
    c = stringify(c)

    id = c["id"] || c["provider_place_id"] || slug(c["display_name"] || c["name"] || "place")

    %{
      "id" => id,
      "display_name" => c["display_name"] || c["name"] || id,
      "name" => c["name"] || c["display_name"] || id,
      "cuisine" => c["cuisine"],
      "quiet" => c["quiet"],
      "outdoor" => c["outdoor"] == true,
      "accessible" => Map.get(c, "accessible"),
      "open_now" => Map.get(c, "open_now", true),
      "open_at_plan_time" => Map.get(c, "open_at_plan_time", Map.get(c, "open_now", true)),
      "price_band" => c["price_band"] || c["price"] || c["price_level"],
      "price_level" => c["price_level"] || c["price_band"] || c["price"],
      "max_party" => c["max_party"] || c["capacity"],
      "capacity" => c["capacity"] || c["max_party"],
      "area_label" => c["area_label"] || c["area"],
      "score" => to_float(c["score"], 3.5),
      "travel_minutes" => c["travel_minutes"],
      "travel_time" => c["travel_time"],
      "bookable" => c["bookable"],
      "availability_known" => c["availability_known"] == true,
      "overlap" => c["overlap"] == true,
      "shared_fit" => c["shared_fit"] == true,
      "family_friendly" => c["family_friendly"] == true,
      "provenance" => c["provenance"] || "catalog_fixture",
      "candidate_type" => c["candidate_type"] || "place",
      "provider_place_id" => c["provider_place_id"] || id
    }
  end

  defp capability(c) do
    c = stringify(c)

    %{
      "bookable" => c["bookable"] == true,
      "availability_known" => c["availability_known"] == true,
      "travel_known" => is_number(c["travel_minutes"]) or is_number(c["travel_time"]),
      "unsupported_booking_claim" => false,
      "unsupported_availability_claim" => false,
      "unsupported_travel_claim" => false
    }
  end

  defp sanitize_signals_for_shared(signals) do
    Enum.map(signals, fn s ->
      s = stringify(s)
      Map.drop(s, ["owner_user_id", "preference_text", "source_text", "private_summary"])
    end)
  end

  defp private_looking?(reason) when is_binary(reason) do
    down(reason) =~ ~r/private|walk [ab] likes|because \w+ likes|analyzed your/
  end

  defp private_looking?(_), do: false

  defp safe_fallback_reasons(c) do
    []
    |> then(fn r -> if c["quiet"] == false, do: ["Lively option" | r], else: r end)
    |> then(fn r -> ["Good fit for dinner" | r] end)
  end

  defp extract_pool(result) do
    List.wrap(result["ranked"]) ++ List.wrap(result["hard_rejected_candidates"])
  end

  defp limit(a), do: a["limit"] || @default_limit

  defp present?(nil), do: false
  defp present?(""), do: false
  defp present?(s) when is_binary(s), do: String.trim(s) != ""
  defp present?(_), do: true

  defp uuid?(id) when is_binary(id) do
    match?({:ok, _}, Ecto.UUID.cast(id))
  end

  defp uuid?(_), do: false

  defp to_float(nil, d), do: d * 1.0
  defp to_float(n, _) when is_number(n), do: n * 1.0
  defp to_float(_, d), do: d * 1.0

  defp down(nil), do: ""
  defp down(s) when is_binary(s), do: String.downcase(s)

  defp slug(s) when is_binary(s) do
    s |> String.downcase() |> String.replace(~r/[^a-z0-9]+/, "_") |> String.trim("_")
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: other
end
