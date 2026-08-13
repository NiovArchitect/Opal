defmodule OpalCore.SocialFlow.CollectiveComposition do
  @moduledoc """
  Multi-participant memory + collective fit without single-person dominance.

  Builds on GroupComposition (who/when/where/food/participation) and
  PreferenceMemory / PlaceOptionComposition (ranking).

  Laws:
  - Current explicit group evidence > episode prefs > relationship memory
  - Hard constraints govern; soft preferences do not equal veto
  - Optional/late participants influence capacity/fit but do not block required alignment
  - Private memory improves fit without becoming shared disclosure
  - Ranking is candidate_only — never authorizes Set
  - Abstain when no option sufficiently fits
  - One meaningful question when one conflict dominates

  Not a giant recommendation engine. Not a UI dashboard.
  """

  alias OpalCore.SocialFlow.PlaceOptionComposition
  alias OpalCore.SocialFlow.RealWorld.Place.{Catalog, PreferenceMemory}

  @doc """
  Collect + classify participant contexts into collective fit.

  `opts` keys (string or atom):
  - composition: GroupComposition.compose/2 result (required for group paths)
  - candidates: optional venue list
  - participant_contexts: list of maps per person
  - episode_category / place_gap_label / what / current_intent (group-level)
  - party_size override

  Each participant_context:
  - user_id
  - role: "required" | "optional" | "late" | "guest" | "required_person"
  - hard_constraints: [%{kind, value, privacy}] e.g. allergy, no_downtown
  - current_prefs: [%{kind, value}] e.g. lively tonight, no sushi tonight
  - episode_prefs: [%{kind, value}]
  - relationship_prefs: PreferenceMemory facts (private)
  """
  def compose(opts) when is_map(opts) do
    o = stringify(opts)
    composition = o["composition"] || %{}
    contexts = List.wrap(o["participant_contexts"]) |> Enum.map(&stringify/1)

    who = composition["who"] || %{}
    where_m = composition["where"] || %{}
    food = composition["food"] || %{}
    party =
      o["party_size"] || who["member_count"] || composition["member_count"] ||
        max(length(contexts), 2)

    classified = classify_all(contexts, composition)
    hard = classified.hard
    soft_current = classified.soft_current
    episode = classified.episode
    memories = classified.memories
    suppressed_memories = classified.suppressed_memories

    group_intent = o["current_intent"] || majority_intent(soft_current)
    category = o["episode_category"] || PlaceOptionComposition.episode_category(o) || episode_food_category(episode, food)

    # Hard place/food exclusions from group composition + participant hard constraints
    hard_exclusions = hard_exclusions(hard, where_m, food)

    candidates =
      (o["candidates"] || Catalog.list_candidates(capacity_min: party))
      |> Enum.map(&stringify/1)
      |> apply_hard_filters(hard_exclusions, party)

    # Relationship prefs only for required (and required_person) by default;
    # optional soft prefs do not dominate.
    rel_prefs = memories_for_ranking(memories, contexts)
    ep_prefs = episode_prefs_for_ranking(episode, category)

    ranked0 =
      PreferenceMemory.rank_candidates(candidates, rel_prefs ++ ep_prefs, %{
        "current_intent" => group_intent,
        "current_category" => category
      })

    ranked =
      ranked0
      |> apply_collective_adjustments(soft_current, hard, contexts, category, group_intent)
      |> Enum.sort_by(& &1["score"], :desc)

    {options, suppressed, abstain?} = select_options(ranked, hard_exclusions, party)

    friction = social_friction(hard, soft_current, contexts, suppressed, abstain?)
    question = one_question(hard_exclusions, soft_current, friction)
    conflicts = classify_conflicts(hard, soft_current, episode, where_m, food)

    shared_safe_summary = shared_safe_summary(options, abstain?, hard_exclusions, party)

    %{
      "schema_version" => "0.1.0",
      "authority" => "candidate_only",
      "authorizes_set" => false,
      "privacy" => "private_viewer_for_reasons",
      "party_size" => party,
      "roles" => roles_summary(contexts, who),
      "classified" => %{
        "hard_constraints" => publicize_hard(hard),
        "soft_current" => soft_current,
        "episode" => episode,
        "memories_considered" => length(memories),
        "memories_suppressed" => length(suppressed_memories)
      },
      "conflicts" => conflicts,
      "group_intent" => group_intent,
      "episode_category" => category,
      "options" => options,
      "suppressed" => suppressed,
      "abstain" => abstain?,
      "one_question" => question,
      "social_friction" => friction,
      "shared_safe_summary" => shared_safe_summary,
      "human_surface" => %{
        "label" =>
          cond do
            abstain? -> "None of these fit everyone well."
            length(options) > 0 -> "I've got a few that fit the group."
            true -> "Still choosing a place"
          end,
        "detail" => shared_safe_summary,
        "options" =>
          Enum.map(options, fn opt ->
            %{
              "id" => opt["id"],
              "name" => opt["display_name"] || opt["name"],
              "area" => opt["area_label"] || opt["area"],
              "tag" => opt["human_tag"]
            }
          end)
      },
      "eval_snapshot" => %{
        "participants" => Enum.map(contexts, & &1["user_id"]),
        "hard" => hard,
        "soft_current" => soft_current,
        "memories_used" => Enum.map(memories, &memory_public_ref/1),
        "memories_suppressed" => Enum.map(suppressed_memories, &memory_public_ref/1),
        "reasons" => Map.new(options, fn o -> {o["id"], o["reasons"] || []} end),
        "rejected" => suppressed
      }
    }
  end

  def compose(_), do: empty_result()

  @doc """
  Compose from GroupComposition map + explicit participant_contexts.
  Convenience for tests and ProductSignals wiring later.
  """
  def compose_from_group(composition, participant_contexts, opts \\ %{}) do
    opts
    |> stringify()
    |> Map.put("composition", composition)
    |> Map.put("participant_contexts", participant_contexts)
    |> compose()
  end

  @doc "Classify a single statement into strength class."
  def classify_statement(text) when is_binary(text) do
    t = String.downcase(text)

    cond do
      Regex.match?(~r/\ballergic|allergy|cannot eat|can't eat|wheelchair|inaccessible|medical\b/i, t) ->
        {:hard, extract_hard_kind(t)}

      Regex.match?(~r/\bnot downtown|no downtown|avoid downtown|anywhere but downtown\b/i, t) ->
        {:hard, "no_downtown"}

      Regex.match?(~r/\bno sushi|not sushi\b/i, t) ->
        {:current, "no_sushi"}

      Regex.match?(~r/\blively|loud|energetic|fun tonight|busy\b/i, t) ->
        {:current, "lively"}

      Regex.match?(~r/\bquiet|chill|intimate|hear each other\b/i, t) ->
        {:current, "quiet"}

      Regex.match?(~r/\bitalian\b/i, t) ->
        {:episode, "italian"}

      Regex.match?(~r/\bsushi\b/i, t) and not Regex.match?(~r/\bno sushi|not sushi\b/i, t) ->
        {:episode, "sushi"}

      true ->
        {:none, nil}
    end
  end

  def classify_statement(_), do: {:none, nil}

  # --- internals ---

  defp classify_all(contexts, composition) do
    food = composition["food"] || %{}
    where_m = composition["where"] || %{}

    hard0 =
      []
      |> then(fn h -> if where_m["downtown_incompatible"], do: [%{"kind" => "no_downtown", "source" => "group", "role" => "required"} | h], else: h end)
      |> then(fn h -> if food["sushi_conflict"], do: [%{"kind" => "no_sushi", "source" => "group", "role" => "required"} | h], else: h end)

    Enum.reduce(contexts, %{hard: hard0, soft_current: [], episode: [], memories: [], suppressed_memories: []}, fn ctx, acc ->
      role = ctx["role"] || "required"
      hard =
        Enum.map(List.wrap(ctx["hard_constraints"]), fn c ->
          c = stringify(c)
          Map.merge(c, %{"user_id" => ctx["user_id"], "role" => role, "strength" => "hard"})
        end)

      soft =
        Enum.map(List.wrap(ctx["current_prefs"]), fn c ->
          c = stringify(c)
          Map.merge(c, %{"user_id" => ctx["user_id"], "role" => role, "strength" => "current"})
        end)

      ep =
        Enum.map(List.wrap(ctx["episode_prefs"]), fn c ->
          c = stringify(c)
          Map.merge(c, %{"user_id" => ctx["user_id"], "role" => role, "strength" => "episode"})
        end)

      mems = List.wrap(ctx["relationship_prefs"])
      # Suppress irrelevant memories (e.g. basketball for dinner) + optional soft memory weaker
      {used, suppressed} =
        Enum.split_with(mems, fn m ->
          m = stringify(m)
          relevant_memory?(m, composition) and role in ~w(required required_person)
        end)

      # Optional participant relationship memory: influence only, never hard — still suppressed if irrelevant
      {opt_used, opt_sup} =
        if role in ~w(optional late guest) do
          Enum.split_with(mems, fn m -> relevant_memory?(stringify(m), composition) end)
        else
          {[], []}
        end

      # Optional memories considered with lower weight via role tag
      opt_tagged =
        Enum.map(opt_used, fn m ->
          stringify(m) |> Map.put("participant_role", "optional") |> Map.put("weight_class", "inferred")
        end)

      %{
        hard: acc.hard ++ hard,
        soft_current: acc.soft_current ++ soft,
        episode: acc.episode ++ ep,
        memories: acc.memories ++ used ++ opt_tagged,
        suppressed_memories: acc.suppressed_memories ++ suppressed ++ opt_sup
      }
    end)
  end

  defp relevant_memory?(m, composition) do
    pref = String.downcase(m["preference"] || "")
    what = get_in(composition, ["human_surface", "headline"]) || ""

    cond do
      pref == "" -> false
      pref =~ ~r/basketball|soccer|tennis|gym|workout/ and what =~ ~r/dinner|lunch|coffee|sushi|italian/i ->
        false

      pref =~ ~r/sushi|restaurant|quiet|loud|italian|downtown|food|dinner|place/ ->
        true

      true ->
        pref =~ ~r/quiet|loud|italian|sushi|downtown/
    end
  end

  defp hard_exclusions(hard, where_m, food) do
    kinds = Enum.map(hard, & &1["kind"])

    %{
      "no_downtown" =>
        "no_downtown" in kinds or where_m["downtown_incompatible"] == true,
      "no_sushi" => "no_sushi" in kinds or food["sushi_conflict"] == true,
      "allergies" =>
        hard
        |> Enum.filter(&(&1["kind"] in ~w(allergy shellfish gluten)))
        |> Enum.map(fn h -> h["value"] || h["kind"] end)
    }
  end

  defp apply_hard_filters(candidates, excl, party) do
    Enum.reject(candidates, fn c ->
      area = String.downcase(c["area_label"] || c["area"] || "")
      cuisine = String.downcase(c["cuisine"] || "")
      max_p = c["max_party"] || 8

      (excl["no_downtown"] and area == "downtown") or
        (excl["no_sushi"] and cuisine == "sushi") or
        max_p < party
    end)
  end

  defp apply_collective_adjustments(ranked, soft_current, hard, contexts, category, group_intent) do
    required_ids =
      contexts
      |> Enum.filter(&(&1["role"] in ~w(required required_person)))
      |> Enum.map(& &1["user_id"])
      |> MapSet.new()

    lively_votes =
      Enum.count(soft_current, fn s ->
        s["value"] in ~w(lively) or s["kind"] == "lively"
      end)

    quiet_votes =
      Enum.count(soft_current, fn s ->
        s["value"] in ~w(quiet) or s["kind"] == "quiet"
      end)

    Enum.map(ranked, fn c ->
      score = c["score"] || 0.0
      reasons = []

      # Non-dominance: if majority of *current* prefs want lively, boost lively venues
      # even if one relationship memory preferred quiet
      {score, reasons} =
        cond do
          lively_votes >= 2 and quiet_votes <= 1 and c["quiet"] == false ->
            {score + 1.4, ["group wants lively tonight" | reasons]}

          lively_votes >= 2 and quiet_votes <= 1 and c["quiet"] == true ->
            {score - 1.0, reasons}

          quiet_votes >= 2 and lively_votes == 0 and c["quiet"] == true ->
            {score + 0.8, ["group wants quieter tonight" | reasons]}

          group_intent == "lively" and c["quiet"] == false ->
            {score + 0.9, ["lively fits current group evidence" | reasons]}

          group_intent == "quiet" and c["quiet"] == true ->
            {score + 0.5, reasons}

          true ->
            {score, reasons}
        end

      {score, reasons} =
        if category && String.downcase(c["cuisine"] || "") == category do
          {score + 0.9, ["#{category} matches current episode" | reasons]}
        else
          {score, reasons}
        end

      # Hard constraints already filtered; soft required current no_sushi etc.
      {score, reasons} =
        if Enum.any?(soft_current, &(&1["kind"] == "no_sushi" or &1["value"] == "no_sushi")) and
             String.downcase(c["cuisine"] || "") == "sushi" do
          {score - 5.0, ["conflicts with current no-sushi evidence" | reasons]}
        else
          {score, reasons}
        end

      # Optional-only soft prefs: small nudge only
      opt_nudge =
        soft_current
        |> Enum.filter(&(&1["role"] in ~w(optional late guest)))
        |> length()
        |> then(fn n -> if n > 0, do: 0.05 * n, else: 0.0 end)

      # Required person hard constraints already in hard filters
      _ = required_ids
      _ = hard

      c
      |> Map.put("score", Float.round(score + opt_nudge, 3))
      |> Map.put("reasons", Enum.reverse(reasons))
    end)
  end

  defp select_options(ranked, hard_excl, party) do
    viable =
      Enum.filter(ranked, fn c ->
        (c["score"] || 0) > 0.5 and (c["max_party"] || 8) >= party
      end)

    suppressed =
      ranked
      |> Enum.reject(fn c -> Enum.any?(viable, &(&1["id"] == c["id"])) end)
      |> Enum.take(5)
      |> Enum.map(fn c ->
        %{
          "id" => c["id"],
          "name" => c["display_name"] || c["name"],
          "reason" => suppress_reason(c, hard_excl)
        }
      end)

    options =
      viable
      |> Enum.take(3)
      |> Enum.with_index()
      |> Enum.map(fn {c, i} ->
        tag =
          case i do
            0 -> "Closest fit"
            1 -> if c["quiet"] == false, do: "More lively", else: "Good alternative"
            _ -> "Easier for the group"
          end

        Map.put(c, "human_tag", tag)
      end)

    # Abstain when zero viable options after hard filters + fit threshold
    abstain? = options == []

    {options, suppressed, abstain?}
  end

  defp suppress_reason(c, hard_excl) do
    area = String.downcase(c["area_label"] || "")
    cuisine = String.downcase(c["cuisine"] || "")

    cond do
      hard_excl["no_downtown"] and area == "downtown" -> "downtown conflicts with group constraint"
      hard_excl["no_sushi"] and cuisine == "sushi" -> "sushi conflicts with current evidence"
      true -> "lower collective fit"
    end
  end

  defp social_friction(hard, soft, contexts, suppressed, abstain?) do
    %{
      "hard_count" => length(hard),
      "soft_count" => length(soft),
      "participant_count" => length(contexts),
      "suppressed_count" => length(suppressed),
      "abstain" => abstain?,
      "level" =>
        cond do
          abstain? -> "high"
          length(hard) >= 2 -> "medium"
          length(suppressed) >= 3 -> "medium"
          true -> "low"
        end
    }
  end

  defp one_question(hard_excl, soft, friction) do
    cond do
      hard_excl["no_downtown"] and friction["level"] in ~w(medium high) ->
        %{
          "text" => "Downtown is the main conflict — avoid it?",
          "dimension" => "where",
          "privacy" => "shared_safe"
        }

      Enum.any?(soft, &(&1["kind"] in ~w(lively quiet))) and
          Enum.any?(soft, &(&1["kind"] == "lively")) and
          Enum.any?(soft, &(&1["kind"] == "quiet")) ->
        %{
          "text" => "Tonight — quieter or more lively?",
          "dimension" => "vibe",
          "privacy" => "shared_safe"
        }

      true ->
        nil
    end
  end

  defp classify_conflicts(hard, soft, episode, where_m, food) do
    where_m = where_m || %{}
    food = food || %{}
    hard = hard || []
    soft = soft || []
    episode = episode || []

    []
    |> then(fn c ->
      if where_m["downtown_incompatible"] == true or
           Enum.any?(hard, &(&1["kind"] == "no_downtown")),
         do: [%{"class" => "hard", "topic" => "downtown"} | c],
         else: c
    end)
    |> then(fn c ->
      if food["sushi_conflict"] == true or Enum.any?(soft, &(&1["kind"] == "no_sushi")),
        do: [%{"class" => "hard", "topic" => "sushi"} | c],
        else: c
    end)
    |> then(fn c ->
      if Enum.any?(episode, &(&1["value"] == "italian" or &1["kind"] == "italian")) and
           Enum.any?(soft, &(&1["kind"] == "no_sushi")),
         do: [%{"class" => "compatible", "topic" => "italian_ok"} | c],
         else: c
    end)
    |> then(fn c ->
      lively? = Enum.any?(soft, &(&1["kind"] == "lively"))
      quiet? = Enum.any?(soft, &(&1["kind"] == "quiet"))

      if lively? and quiet?,
        do: [%{"class" => "soft", "topic" => "vibe"} | c],
        else: c
    end)
  end

  defp majority_intent(soft) do
    lively = Enum.count(soft, &(&1["kind"] == "lively" or &1["value"] == "lively"))
    quiet = Enum.count(soft, &(&1["kind"] == "quiet" or &1["value"] == "quiet"))

    cond do
      lively > quiet and lively > 0 -> "lively"
      quiet > lively and quiet > 0 -> "quiet"
      true -> nil
    end
  end

  defp episode_food_category(episode, food) do
    cond do
      Enum.any?(episode, &(&1["value"] == "italian" or &1["kind"] == "italian")) -> "italian"
      Enum.any?(episode, &(&1["value"] == "sushi" or &1["kind"] == "sushi")) and not food["sushi_conflict"] ->
        "sushi"

      true ->
        nil
    end
  end

  defp episode_prefs_for_ranking(episode, category) do
    base =
      if category do
        [
          %{
            "preference" => category,
            "polarity" => "prefer",
            "weight_class" => "explicit_current",
            "scope" => "personal",
            "revoked" => false
          }
        ]
      else
        []
      end

    ep =
      Enum.map(episode, fn e ->
        %{
          "preference" => e["value"] || e["kind"],
          "polarity" => "prefer",
          "weight_class" => "explicit_current",
          "scope" => "personal",
          "revoked" => false
        }
      end)

    base ++ ep
  end

  defp memories_for_ranking(memories, _contexts) do
    Enum.map(memories, fn m ->
      m = stringify(m)
      # Ensure private provenance never required for ranking
      Map.put(m, "permission_class", m["permission_class"] || "owner_private")
    end)
  end

  defp publicize_hard(hard) do
    # Shared-safe: kinds only, no medical detail
    Enum.map(hard, fn h ->
      %{
        "kind" => h["kind"],
        "role" => h["role"],
        "privacy" => h["privacy"] || "shared_consequence"
      }
    end)
  end

  defp memory_public_ref(m) do
    m = stringify(m)
    %{
      "scope" => m["scope"],
      "weight_class" => m["weight_class"],
      "preference_class" => preference_class(m["preference"]),
      "private" => true
    }
  end

  defp preference_class(pref) when is_binary(pref) do
    cond do
      pref =~ ~r/quiet/i -> "quiet"
      pref =~ ~r/loud|lively/i -> "lively"
      pref =~ ~r/italian/i -> "italian"
      pref =~ ~r/sushi/i -> "sushi"
      true -> "other"
    end
  end

  defp preference_class(_), do: "other"

  defp roles_summary(contexts, who) do
    %{
      "required" => who["required_participant_ids"] || Enum.map(Enum.filter(contexts, &(&1["role"] == "required")), & &1["user_id"]),
      "optional" => who["optional_participant_ids"] || Enum.map(Enum.filter(contexts, &(&1["role"] in ~w(optional late))), & &1["user_id"]),
      "context_roles" => Map.new(contexts, fn c -> {c["user_id"], c["role"]} end)
    }
  end

  defp shared_safe_summary(_options, true, _excl, party),
    do: "No place fits all #{party} well right now."

  defp shared_safe_summary(options, false, excl, party) do
    bits =
      [
        if(excl["no_downtown"], do: "Downtown doesn't fit"),
        if(excl["no_sushi"], do: "Sushi drops out"),
        "#{party} people"
      ]
      |> Enum.filter(&is_binary/1)

    case {options, bits} do
      {[], _} -> Enum.join(bits, " · ")
      {[top | _], _} ->
        name = top["display_name"] || top["name"]
        (bits ++ ["#{name} is a strong fit"]) |> Enum.join(" · ")
    end
  end

  defp extract_hard_kind(t) do
    cond do
      t =~ ~r/shellfish|shrimp|allergy/ -> "allergy"
      t =~ ~r/wheelchair|access/ -> "accessibility"
      true -> "hard_constraint"
    end
  end

  defp empty_result do
    %{
      "authority" => "candidate_only",
      "authorizes_set" => false,
      "options" => [],
      "suppressed" => [],
      "abstain" => true,
      "one_question" => nil
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: other
end
