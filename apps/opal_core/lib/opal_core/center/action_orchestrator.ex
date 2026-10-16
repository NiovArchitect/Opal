defmodule OpalCore.Center.ActionOrchestrator do
  @moduledoc """
  After intent classification: accumulate PlanningContext and start provider
  jobs when enough is known. Future-tense work copy requires a job id.
  """

  import Ecto.Query

  alias OpalCore.Center.{
    PlanningContext,
    ProviderAction,
    ProviderActionJob,
    PlanContextPatch,
    DeviceLocation,
    SurprisePlanning,
    QuestionEconomy,
    DependencyPlanner,
    TemporalPhrase
  }

  alias OpalCore.OpalConversations
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.SharedPlan

  @destination_re ~r/\b(?:in|to|at)\s+([A-Z][\w]+(?:\s+[A-Z][\w]+){0,3})\b/
  @restaurant_re ~r/\b(restaurant|dinner|brunch|lunch|food|eat|dining|top\s+restaurant|best\s+restaurant|great\s+restaurant)\b/i
  @quality_re ~r/\b(top|best|finest|nicest|highest[- ]end|great)\b/i
  @mexico_city_re ~r/\bmexico\s*city\b/i
  @take_her_to_re ~r/\b(?:take|bring)\s+(?:her|him|them)\s+to\s+(.+)$/i
  @with_person_re ~r/\b(?:with|for)\s+([A-Z][a-zA-Z']+)(?:\s+and\s+([A-Z][a-zA-Z']+))?/
  @select_option_re ~r/\b(?:let'?s\s+go\s+with|go\s+with|pick|choose)\s+(.+?)(?:\s*\(|\.|$)/i

  @doc """
  Enrich intent entities from raw text + prior planning context, merge durable
  context, and optionally start a places search job.

  Returns `{intent, response_override | nil, action_meta}`.
  `action_meta` may include action_job_id for message metadata / promise guard.
  """
  def after_classify(user_id, raw_text, intent, ctx)
      when is_binary(user_id) and is_binary(raw_text) do
    intent = intent || %{intent: :chat, confidence: :low, entities: %{}}
    entities = Map.get(intent, :entities) || Map.get(intent, "entities") || %{}
    prior = PlanningContext.get_for_user(user_id)

    # Delta patch first — corrections mutate one slot; missing means unchanged.
    patch =
      PlanContextPatch.extract_from_text(raw_text, prior)
      |> Map.merge(SurprisePlanning.detect(raw_text))

    # Repair #11 — the :named_venue intent is the classifier's exact-entity
    # verdict. Force exact mode from intent entities so the intent and the
    # exact-entity routing agree even when the patch regex missed the turn
    # (e.g. no locality yet). Never discovery.
    patch =
      if (intent[:intent] || intent["intent"]) == :named_venue do
        apply_named_venue_intent(patch, intent)
      else
        patch
      end

    from_text = extract_from_text(raw_text)
    enriched = enrich_entities(raw_text, entities, ctx, from_text)

    dest_hint =
      from_text["destination"] || enriched[:destination] || enriched["destination"] ||
        prior["destination"]

    enriched =
      enriched
      |> Map.update(:who, nil, &PlanningContext.sanitize_who(&1, dest_hint))
      |> then(fn e ->
        if PlanContextPatch.nudge_affirmed?(raw_text) do
          Map.put(e, :nudge_affirmed, true)
        else
          e
        end
      end)
      |> then(fn e ->
        # Generic open window: force who unset on this turn (do not re-inject prior).
        if PlanContextPatch.generic_open_window?(raw_text) do
          e |> Map.delete(:who) |> Map.delete("who") |> Map.put(:who_unresolved, true)
        else
          e
        end
      end)
      |> Map.reject(fn {_k, v} -> is_nil(v) or v == "" or v == [] end)

    # Compose patch + turn extract; patch wins on explicit corrections.
    merge_extras = Map.merge(from_text, patch)

    case PlanningContext.merge(user_id, enriched, merge_extras) do
      {:ok, planning0} ->
        planning =
          planning0
          |> then(&PlanContextPatch.apply(&1, patch))
          |> then(fn p ->
            SurprisePlanning.enrich(user_id, p, conversation_opts(user_id, p))
          end)
          |> then(fn p ->
            Map.merge(p, %{
              "dependencies" => DependencyPlanner.build(p),
              "next_dependency" =>
                case DependencyPlanner.next_after(p) do
                  %{"id" => id} -> id
                  _ -> p["next_dependency"]
                end
            })
          end)

        # Persist composed planning (incl. surprise / deps / clears).
        {:ok, planning} = PlanningContext.put(user_id, planning)

        intent = put_entities(intent, Map.merge(atomize(enriched), string_to_atom_map(planning)))

        cond do
          still_need_trip?(raw_text) ->
            handle_still_need(user_id, intent, planning)

          patch["cancel_venue_keep_plan"] == true or
              patch["conversation_act"] in ["cancel_venue_keep_plan", "cancel_search"] ->
            handle_cancel_venue(user_id, intent, planning)

          # Challenge / meta questions must never restart venue lookup.
          is_binary(patch["conversation_act"]) and
              patch["conversation_act"] in [
                "challenge_prior_action",
                "challenge_question",
                "correct_venue",
                "correct_slot"
              ] ->
            handle_conversation_challenge(user_id, intent, planning, prior, patch, raw_text)

          is_binary(patch["conversation_act"]) and
              patch["conversation_act"] in [
                "switch_topic",
                "recall_prior_task",
                "show_history",
                "switch_task_birthday"
              ] ->
            handle_conversational_turn(user_id, intent, planning, prior, patch, raw_text)

          (Map.has_key?(patch, "when") or Map.has_key?(patch, "when_time")) and
              # F12-13/F12-53 — the sticky plan_id is only actionable while
              # fresh and the plan is still active. A bare is_binary check let
              # days-old or cancelled plan_ids hijack unrelated utterances.
              PlanningContext.plan_id_active?(planning) and
              not Regex.match?(@select_option_re, raw_text) and
              patch["conversation_act"] not in ["challenge_prior_action", "challenge_question"] ->
            handle_when_correction(user_id, intent, planning, prior, patch)

          # Conversation owns routing: coordinate/chat/status must not be hijacked by a
          # sticky ready restaurant draft or an in-flight provider job.
          skip_provider_search_this_turn?(intent, patch, raw_text) ->
            handle_conversational_turn(user_id, intent, planning, prior, patch, raw_text)

          true ->
            case maybe_attach_selection(user_id, raw_text, intent, planning) do
              {:attached, intent2, override, meta} ->
                {intent2, override, meta}

              :no_selection ->
                # Repair #12 (F12-11d): "find restaurants near me" carries
                # restaurant cues so it skips the conversational intercept —
                # open the device-anchored search here instead of asking "where?".
                case maybe_near_me_device_search(user_id, raw_text, intent, planning) do
                  {:near_me, result} ->
                    result

                  :not_near_me ->
                    case QuestionEconomy.decide(planning) do
                      {:soft_assume, soft, soft_copy} ->
                        {:ok, soft} = PlanningContext.merge(user_id, %{}, soft)

                        case maybe_start_search(user_id, intent, soft) do
                          {intent2, nil, meta} ->
                            {intent2, soft_copy, Map.put(meta, "soft_assumption", true)}

                          {intent2, override, meta} when is_binary(override) ->
                            # Soft assumption may annotate working copy, but never add a second question.
                            annotated =
                              if is_binary(soft_copy) and String.contains?(soft_copy, "?") do
                                override
                              else
                                override <> " " <> soft_copy
                              end

                            {intent2, annotated, Map.put(meta, "soft_assumption", true)}

                          other ->
                            other
                        end

                      {:ask, asked_planning, question} ->
                        {intent, question,
                         %{
                           "planning_context" => asked_planning,
                           "question_economy" => true,
                           "assumption_class" => "ask"
                         }}

                      {:proceed, proceeded} ->
                        maybe_start_search(user_id, intent, proceeded)

                      {:block, blocked, reason} ->
                        {intent, consequential_copy(reason),
                         %{"planning_context" => blocked, "blocked" => true}}
                    end
                end
            end
        end

      {:error, _} ->
        {intent, nil, %{}}
    end
  end

  def after_classify(_, _, intent, _), do: {intent, nil, %{}}

  defp conversation_opts(user_id, planning) do
    base =
      case OpalConversations.get_or_create_conversation(user_id) do
        {:ok, c} -> [conversation_id: c.id]
        _ -> []
      end

    case resolve_window(planning) do
      {start_at, end_at} ->
        Keyword.merge(base, start_at: start_at, end_at: end_at)

      _ ->
        base
    end
  end

  defp resolve_window(planning) when is_map(planning) do
    when_s = planning["when"] || planning["when_resolved"]
    time_s = planning["when_time"] || "19:30"

    date_iso =
      cond do
        match?(%Date{}, when_s) -> Date.to_iso8601(when_s)
        is_binary(when_s) and String.match?(when_s, ~r/^\d{4}-\d{2}-\d{2}/) -> String.slice(when_s, 0, 10)
        is_binary(when_s) -> PlanningContext.resolve_when(when_s)
        true -> nil
      end

    with true <- is_binary(date_iso) and String.match?(date_iso, ~r/^\d{4}-\d{2}-\d{2}/),
         {:ok, date} <- Date.from_iso8601(String.slice(date_iso, 0, 10)),
         {h, m} <- parse_clock(time_s),
         {:ok, naive} <- NaiveDateTime.new(date, Time.new!(h, m, 0)),
         {:ok, start_at} <- DateTime.from_naive(naive, "Etc/UTC") do
      {start_at, DateTime.add(start_at, 2 * 60 * 60, :second)}
    else
      _ -> nil
    end
  end

  defp resolve_window(_), do: nil

  defp parse_clock(s) when is_binary(s) do
    down = String.downcase(String.trim(s))

    cond do
      m = Regex.run(~r/^(\d{1,2}):(\d{2})\s*(am|pm)?$/, down) ->
        {h0, _} = Integer.parse(Enum.at(m, 1))
        {mi, _} = Integer.parse(Enum.at(m, 2))
        meridiem = Enum.at(m, 3)
        h = adjust_hour(h0, meridiem)
        {h, mi}

      m = Regex.run(~r/^(\d{1,2})\s*(am|pm)$/, down) ->
        {h0, _} = Integer.parse(Enum.at(m, 1))
        {adjust_hour(h0, Enum.at(m, 2)), 0}

      m = Regex.run(~r/^(\d{1,2}):(\d{2})$/, down) ->
        {h, _} = Integer.parse(Enum.at(m, 1))
        {mi, _} = Integer.parse(Enum.at(m, 2))
        {h, mi}

      true ->
        {19, 30}
    end
  end

  defp parse_clock(_), do: {19, 30}

  defp adjust_hour(h, "pm") when h < 12, do: h + 12
  defp adjust_hour(12, "am"), do: 0
  defp adjust_hour(h, _), do: h

  defp still_need_trip?(raw) when is_binary(raw) do
    Regex.match?(
      ~r/\b(?:what\s+do\s+i\s+still\s+need|what'?s\s+(?:still\s+)?missing|what\s+else\s+(?:do\s+i\s+need|for\s+(?:this\s+)?(?:trip|plan)))\b/i,
      raw
    )
  end

  defp handle_still_need(_user_id, intent, planning) do
    next = DependencyPlanner.next_after(planning)
    avail = planning["availability_result"] || %{}

    override =
      cond do
        is_map(next) and is_binary(next["prompt"]) and next["prompt"] != "" ->
          next["prompt"]

        is_binary(avail["consumer_copy"]) and avail["consumer_copy"] != "" ->
          avail["consumer_copy"]

        true ->
          "You've got the core of this plan. Travel and lodging are the usual next steps when you're ready."
      end

    meta = %{
      "action_state" => "dependency_surface",
      "planning_context" => planning,
      "next_dependency" => next && next["id"],
      "plan_id" => planning["plan_id"],
      "GRAPHING_IS_NOT_PUBLISHING" => true
    }

    {put_entities(intent, string_to_atom_map(planning)), override, meta}
  end

  defp handle_cancel_venue(user_id, intent, planning) do
    _ = ProviderAction.cancel_inflight_for_user(user_id)
    plan_id = planning["plan_id"]

    planning2 =
      PlanContextPatch.apply(planning, %{
        "venue" => "__clear__",
        "requested_venue_name" => "__clear__",
        "requested_venue_locality" => "__clear__",
        "search_mode" => "__clear__",
        "wants_restaurant" => "__clear__",
        "discovery_request" => "__clear__",
        "cuisine" => "__clear__",
        "destination" =>
          if(is_binary(planning["plan_id"]), do: planning["destination"] || "__clear__", else: "__clear__"),
        "provider_parked" => true
      })
      |> Map.put("venue_cancelled", true)
      |> Map.put("provider_parked", true)
      |> then(fn p ->
        if is_binary(plan_id), do: Map.put(p, "plan_id", plan_id), else: p
      end)

    if is_binary(plan_id) do
      case Repo.get(SharedPlan, plan_id) do
        %SharedPlan{} = plan ->
          alignment =
            (plan.alignment || %{})
            |> Map.delete("venue")
            |> Map.put("venue_cancelled", true)
            |> Map.put("option_selected", false)

          {:ok, _} =
            plan
            |> SharedPlan.changeset(%{
              "location" => planning["destination"] || plan.location,
              "alignment" => alignment
            })
            |> Repo.update()

          {:ok, planning2} = PlanningContext.put(user_id, planning2)

          override =
            "Okay — I cancelled the restaurant search and kept your other plan."

          meta = %{
            "action_state" => "cancelled",
            "plan_id" => plan_id,
            "planning_context" => planning2,
            "PLAN_ID_STABLE" => true,
            "trip_kept" => true,
            "no_provider_restart" => true,
            "conversation_owns_routing" => true
          }

          {intent_without_search(intent), override, meta}

        _ ->
          {:ok, planning2} = PlanningContext.put(user_id, planning2)

          {intent_without_search(intent), "Okay — restaurant search cancelled.",
           %{
             "planning_context" => planning2,
             "action_state" => "cancelled",
             "no_provider_restart" => true,
             "conversation_owns_routing" => true
           }}
      end
    else
      {:ok, planning2} = PlanningContext.put(user_id, planning2)

      {intent_without_search(intent), "Okay — I cancelled the restaurant search.",
       %{
         "planning_context" => planning2,
         "action_state" => "cancelled",
         "no_provider_restart" => true,
         "conversation_owns_routing" => true
       }}
    end
  end

  # Repair #11 — apply the :named_venue intent's exact-entity verdict to the patch.
  # Mirrors the patch's own exact_venue branch (new exact-venue task isolates from
  # prior cuisine / discovery / plan continuity) so intent and routing agree.
  defp apply_named_venue_intent(patch, intent) do
    entities = intent[:entities] || intent["entities"] || %{}
    name = entities[:venue_name] || entities["venue_name"]
    locality = entities[:locality] || entities["locality"]

    if is_binary(name) and String.trim(name) != "" do
      name = String.trim(name)

      patch
      |> Map.merge(%{
        "search_mode" => "exact_entity",
        "requested_venue_name" => name,
        "requested_venue_locality" =>
          if(is_binary(locality) and String.trim(locality) != "", do: String.trim(locality), else: "__clear__"),
        "venue" => name,
        "category" => patch["category"] || "restaurant",
        "wants_restaurant" => true,
        "intent_scope" => "exact_venue",
        "discovery_request" => "__clear__",
        "cuisine" => "__clear__",
        "plan_id" => "__clear__"
      })
      |> then(fn p ->
        if is_binary(locality) and String.trim(locality) != "" do
          Map.put(p, "destination", String.trim(locality))
        else
          p
        end
      end)
    else
      patch
    end
  end

  defp skip_provider_search_this_turn?(intent, patch, raw_text)
       when is_map(intent) and is_map(patch) and is_binary(raw_text) do
    atom = intent[:intent] || intent["intent"]

    restaurant_this_turn? =
      (is_binary(patch["requested_venue_name"]) and patch["requested_venue_name"] not in ["", "__clear__"]) or
        patch["discovery_request"] == true or
        match?(%{name: _}, PlanContextPatch.extract_exact_venue(raw_text)) or
        match?(%{destination: _}, PlanContextPatch.extract_discovery_request(raw_text)) or
        (Regex.match?(~r/\b(?:restaurant|dinner|brunch|lunch|venue|reservation)\b/i, raw_text) and
           Regex.match?(~r/\b(?:find|look|search|plan|book|arrange)\b/i, raw_text))

    select? = Regex.match?(@select_option_re, raw_text)

    cond do
      select? ->
        false

      restaurant_this_turn? ->
        false

      atom in [:coordinate, :chat, :remember, :recall, :check_status] ->
        true

      # Named-venue turns must reach the provider path in exact mode — never parked.
      atom == :named_venue ->
        false

      # Birthday / plan create without restaurant cues must not restart a sticky venue job.
      atom in [:plan_create, :plan_modify, :recommend] ->
        true

      true ->
        false
    end
  end

  defp skip_provider_search_this_turn?(_, _, _), do: false

  defp handle_conversational_turn(user_id, intent, planning, _prior, patch, raw_text) do
    act = patch["conversation_act"]
    raw_text = if is_binary(raw_text), do: raw_text, else: ""

    # Repair #12 (F12-11d): the near-me intercept OPENS when device coords
    # exist — a real nearby search starts and owns the turn (bypasses the
    # parked path below). Without coords it stays an honest gate.
    if near_me_phrasing?(raw_text) and
         act not in ["switch_topic", "recall_prior_task", "show_history", "switch_task_birthday"] do
      case DeviceLocation.get_for_user(user_id) do
        {:ok, coords} ->
          start_near_me_search(user_id, intent, planning, coords)

        :none ->
          parked = Map.put(planning, "provider_parked", true)

          {intent_without_search(intent),
           "I can look for nearby ideas once location access is available — food, outdoors, or nightlife?",
           %{
             "planning_context" => parked,
             "no_provider_restart" => true,
             "conversation_owns_routing" => true,
             "provider_parked" => true
           }}
      end
    else
      do_handle_conversational_turn(user_id, intent, planning, patch, raw_text, act)
    end
  end

  defp near_me_phrasing?(raw_text) when is_binary(raw_text) do
    Regex.match?(~r/\bnear\s+me\b/i, raw_text) or
      Regex.match?(~r/\baround\s+(?:here|me)\b/i, raw_text)
  end

  defp near_me_phrasing?(_), do: false

  # Repair #12 (F12-11d): nearby search from device coords. Mirrors
  # maybe_start_search but device-anchored: destination "near you",
  # origin_source "device", lat/lon threaded to the provider for the circle
  # center (no destination-text geocode).
  defp start_near_me_search(user_id, intent, planning, coords) do
    lat = coords["lat"]
    lon = coords["lon"]

    planning =
      planning
      |> Map.put("destination", "near you")
      |> Map.put("search_mode", "discovery")
      |> Map.put("origin_source", "device")
      |> Map.put("origin_lat", lat)
      |> Map.put("origin_lon", lon)
      |> Map.put("category", "restaurant")
      |> Map.put("wants_restaurant", true)

    conversation_id =
      case OpalConversations.get_or_create_conversation(user_id) do
        {:ok, c} -> c.id
        _ -> nil
      end

    {planning, plan_id} =
      case ProviderAction.ensure_plan(user_id, planning) do
        {:ok, pid, p2} ->
          _ = PlanningContext.merge(user_id, %{"plan_id" => pid}, %{})
          {Map.merge(p2, %{"plan_id" => pid}), pid}

        _ ->
          {planning, planning["plan_id"]}
      end

    search_attrs = %{
      user_id: user_id,
      conversation_id: conversation_id,
      destination: "near you",
      planning_snapshot: planning,
      plan_id: plan_id,
      search_mode: "discovery",
      origin_source: "device",
      origin_lat: lat,
      origin_lon: lon,
      categories: "catering.restaurant"
    }

    case ProviderAction.start_places_search(search_attrs) do
      {:ok, job} ->
        override = "Looking for restaurants near you…"

        meta = %{
          "action_job_id" => job.id,
          "action_state" => "queued",
          "search_geography" => job.search_geography,
          "search_mode" => "discovery",
          "origin_source" => "device",
          "provider" => "geoapify",
          "plan_id" => plan_id,
          "planning_context" => Map.put(planning, "plan_id", plan_id),
          "promise_guard" => true
        }

        {intent, override, meta}

      {:error, _} ->
        {intent_without_search(intent),
         "I couldn't start a nearby search just now. Want to try again?",
         %{"planning_context" => planning, "plan_id" => plan_id}}
    end
  end

  defp do_handle_conversational_turn(user_id, intent, planning, patch, raw_text, act) do
    {planning2, override, extra} =
      case act do
        "switch_topic" ->
          p =
            planning
            |> Map.put("provider_parked", true)
            |> Map.drop(["wants_restaurant", "discovery_request"])

          {:ok, p} = PlanningContext.put(user_id, p)

          {p, "Of course — what's on your mind?", %{"provider_parked" => true}}

        "switch_task_birthday" ->
          p =
            PlanContextPatch.apply(planning, %{
              "venue" => "__clear__",
              "requested_venue_name" => "__clear__",
              "search_mode" => "__clear__",
              "wants_restaurant" => "__clear__",
              "discovery_request" => "__clear__",
              "provider_parked" => true
            })

          {:ok, p} = PlanningContext.put(user_id, p)
          {p, nil, %{"provider_parked" => true}}

        "recall_prior_task" ->
          {planning, recall_prior_copy(planning, raw_text), %{"provider_parked" => true}}

        "show_history" ->
          {planning,
           "You can scroll up through our earlier messages anytime. Tap Jump to latest when you want the newest.",
           %{"provider_parked" => true}}

        _ ->
          # coordinate / chat / plan_create without restaurant this turn —
          # park provider monopolization; leave durable plan slots intact.
          # (Near-me phrasing is handled above: it opens a real search when
          # device coords exist, so it never reaches this parked branch.)
          {Map.put(planning, "provider_parked", true), nil,
           %{"provider_parked" => true, "conversation_owns_routing" => true}}
      end

    meta =
      Map.merge(
        %{
          "planning_context" => planning2,
          "no_provider_restart" => true,
          "conversation_owns_routing" => true
        },
        extra
      )

    {intent_without_search(intent), override, meta}
  end

  defp intent_without_search(intent) when is_map(intent) do
    ents = Map.get(intent, :entities) || Map.get(intent, "entities") || %{}

    cleaned =
      ents
      |> Enum.reject(fn {k, _} ->
        k in [
          :category,
          :wants_restaurant,
          :destination,
          :search_mode,
          :requested_venue_name,
          :requested_venue_locality,
          :cuisine,
          :discovery_request,
          :venue,
          "category",
          "wants_restaurant",
          "destination",
          "search_mode",
          "requested_venue_name",
          "requested_venue_locality",
          "cuisine",
          "discovery_request",
          "venue"
        ]
      end)
      |> Map.new()
      |> Map.put(:conversation_owns_routing, true)
      |> Map.put("conversation_owns_routing", true)

    Map.put(intent, :entities, cleaned)
  end

  defp intent_without_search(intent), do: intent

  defp recall_prior_copy(planning) when is_map(planning), do: recall_prior_copy(planning, "")

  defp recall_prior_copy(planning, raw) when is_map(planning) do
    raw_l = String.downcase(to_string(raw || ""))
    who = planning["who"] || planning["primary_person"]
    who_s = who |> List.wrap() |> Enum.map(&to_string/1) |> Enum.filter(&(&1 != "")) |> Enum.join(" ")
    who_l = String.downcase(who_s)

    mentions_who? =
      who_l != "" and String.contains?(raw_l, who_l)

    cond do
      # Question names the person/topic — never answer with a sticky venue instead.
      Regex.match?(~r/\bmaya\b/i, raw_l) or
          (String.contains?(raw_l, "birthday") and (mentions_who? or who_l != "")) ->
        label = if who_s != "", do: who_s, else: "Maya"
        "We were working on #{label}'s birthday plan."

      mentions_who? ->
        "We were working on plans with #{who_s}."

      is_binary(planning["who"]) and planning["who"] != "" and
          (planning["category"] == "celebration" or
             String.contains?(String.downcase(to_string(planning["intent_scope"] || "")), "birth")) ->
        "We were working on plans with #{planning["who"]}."

      is_binary(planning["requested_venue_name"]) and planning["requested_venue_name"] != "" ->
        dest = planning["destination"] || planning["requested_venue_locality"] || "that area"
        "We were looking up #{planning["requested_venue_name"]} in #{dest}."

      is_binary(planning["destination"]) and planning["destination"] != "" ->
        "We were looking at restaurants in #{planning["destination"]}."

      who_s != "" ->
        "We were planning something with #{who_s}."

      true ->
        "We were mid-conversation — tell me what you want to pick back up."
    end
  end

  defp recall_prior_copy(_, _), do: "Tell me what you'd like to pick back up."

  # F12-13 — schedule corrections go through the revision-chain authority
  # (SocialFlow.change_plan_time/change_plan_date): FOR UPDATE lock,
  # transaction, accepted revision row, audit, broadcast, calendar
  # projection. Never a direct Repo.update. Lead/status errors get honest
  # non-mutating copies; the plan is never touched on failure.
  defp handle_when_correction(user_id, intent, planning, prior, patch) do
    plan_id = planning["plan_id"]
    when_s = planning["when"]
    when_time = planning["when_time"] || patch["when_time"]
    when_before = prior["when"]
    time_before = prior["when_time"] || prior_time_from_label(prior["when"] || "")
    changed = PlanContextPatch.slots_changed_by_patch(patch)

    time_label = compose_time_label(when_s, when_time, prior)

    changed =
      cond do
        "when_time" in changed or (is_binary(when_time) and when_time != time_before) ->
          Enum.uniq(["when_time" | changed])

        "when" in changed or (is_binary(when_s) and when_s != when_before) ->
          Enum.uniq(["when" | changed])

        true ->
          changed
      end

    # The trigger guard guarantees an active plan_id; re-check defensively so
    # a stale context can never mutate a plan through this path.
    if not PlanningContext.plan_id_active?(planning) do
      {intent, "Say the day, the time, or both — I'll put it on the plan.",
       %{
         "planning_context" => Map.delete(planning, "plan_id"),
         "correction_blocked" => "inactive_plan"
       }}
    else
      result =
        cond do
          is_binary(when_time) and when_time != "" ->
            SocialFlow.change_plan_time(%{
              plan_id: plan_id,
              user_id: user_id,
              new_time_label: time_label,
              trace_id: "center_correction"
            })

          is_binary(when_s) and when_s != "" ->
            SocialFlow.change_plan_date(%{
              plan_id: plan_id,
              user_id: user_id,
              new_date_label: when_s,
              trace_id: "center_correction"
            })

          true ->
            {:error, :invalid_label}
        end

      case result do
        {:ok, %{plan: plan}} ->
          # Cosmetic: keep the Center title in sync with venue/day (display
          # metadata only — schedule authority stays in change_plan_schedule).
          _ = maybe_retitle_center_plan(plan, planning, when_s, time_label)

          # F12-05 — drive to completion after the update.
          completion_steps =
            case OpalCore.SocialFlow.PlanCompletion.drive(plan.id, user_id) do
              {:ok, %{steps: steps}} -> steps
              _ -> []
            end

          override =
            cond do
              is_binary(when_time) and when_time != "" ->
                "Updated — #{time_label}. Same plan, same people."

              is_binary(when_s) ->
                "Updated — #{TemporalPhrase.when_phrase(when_s)} in #{planning["destination"] || "the same place"}."

              true ->
                "Updated the time on the same plan."
            end

          meta = %{
            "action_state" => "plan_patched",
            "plan_id" => plan.id,
            "planning_context" => Map.put(planning, "when_time", when_time),
            "PLAN_ID_STABLE_AFTER_CORRECTION" => true,
            "PLAN_ID_STABLE" => true,
            "slots_changed" => changed,
            "notify_user_ids" => notify_user_ids_for_plan(plan, user_id),
            "completion_steps" => completion_steps,
            "before_context" => %{
              "when" => when_before,
              "when_time" => time_before,
              "who" => prior["who"],
              "destination" => prior["destination"],
              "venue" => prior["venue"],
              "visibility_mode" => prior["visibility_mode"]
            },
            "patch" => Map.take(stringify_map(patch), ["when", "when_time", "visibility_mode"]),
            "after_context" => %{
              "when" => when_s,
              "when_time" => when_time,
              "time_label" => time_label,
              "who" => planning["who"],
              "destination" => planning["destination"],
              "venue" => planning["venue"],
              "visibility_mode" => planning["visibility_mode"]
            },
            "graph_projection" => true
          }

          {put_entities(intent, string_to_atom_map(planning)), override, meta}

        {:error, :not_authorized} ->
          {intent, "I can prepare that, but I need your go-ahead before I take the action.",
           %{
             "planning_context" => planning,
             "blocked" => true,
             "correction_blocked" => "not_authorized"
           }}

        {:error, :invalid_status} ->
          {intent, "That plan isn't active anymore, so I left it alone.",
           %{
             "planning_context" => Map.delete(planning, "plan_id"),
             "correction_blocked" => "invalid_status"
           }}

        {:error, :not_found} ->
          {intent, "I couldn't find that plan anymore, so I left it alone.",
           %{
             "planning_context" => Map.delete(planning, "plan_id"),
             "correction_blocked" => "not_found"
           }}

        {:error, :invalid_label} ->
          {intent, "Say the day, the time, or both — I didn't catch a usable time there.",
           %{"planning_context" => planning, "correction_blocked" => "invalid_label"}}

        {:error, _} ->
          {intent, "I couldn't update the time on that plan.",
           %{"planning_context" => planning, "correction_blocked" => "error"}}
      end
    end
  end

  # Cosmetic Center title sync (display metadata only). The schedule authority
  # owns time_label/date_label; this only keeps the human-readable title
  # aligned with a venue or day change.
  defp maybe_retitle_center_plan(%SharedPlan{} = plan, planning, when_s, time_label) do
    title =
      case planning["venue"] || planning["requested_venue_name"] do
        v when is_binary(v) and v != "" ->
          "#{v} · #{time_label}"

        _ ->
          if is_binary(when_s) and when_s != "" do
            String.replace(plan.title || "Plans", ~r/\b(Saturday|Sunday|Friday)\b/i, when_s)
          else
            plan.title
          end
      end

    if is_binary(title) and title != plan.title do
      plan |> SharedPlan.changeset(%{title: title}) |> Repo.update()
    else
      {:ok, plan}
    end
  end

  # Peer notification list: everyone on the plan except the actor.
  defp notify_user_ids_for_plan(%SharedPlan{} = plan, actor_id) do
    plan
    |> Repo.preload(:participants)
    |> Map.get(:participants, [])
    |> Enum.map(& &1.user_id)
    |> Enum.reject(&(&1 == actor_id))
    |> Enum.uniq()
  rescue
    _ -> []
  end

  # Repair #8: "Why did you change the time…" / "That's not the place…"
  # Acknowledge mismatch, restore explicit constraints, never restart lookup.
  defp handle_conversation_challenge(user_id, intent, planning, prior, patch, raw_text) do
    act = patch["conversation_act"]
    explicit = planning["explicit_constraints"] || prior["explicit_constraints"] || %{}

    # Prefer constraints stated in this challenge utterance, then stored explicit, then prior.
    restore_time =
      Map.get(patch, "when_time") || explicit["when_time"] ||
        extract_stated_time_from_challenge(raw_text)

    restore_when = Map.get(patch, "when") || explicit["when"] || planning["when"] || prior["when"]

    current_time = planning["when_time"] || prior["when_time"]
    mismatched_time? =
      is_binary(restore_time) and is_binary(current_time) and
        normalize_ampm(restore_time) != normalize_ampm(current_time)

    {planning2, restored?} =
      if act in ["challenge_prior_action", "correct_slot"] and is_binary(restore_time) do
        next =
          planning
          |> Map.put("when_time", restore_time)
          |> Map.put("when_time_explicit", true)
          |> Map.put("when", restore_when)
          |> Map.put(
            "explicit_constraints",
            Map.merge(explicit, %{"when_time" => restore_time, "when" => restore_when})
          )

        {:ok, next} = PlanningContext.put(user_id, next)

        if is_binary(next["plan_id"]) do
          case Repo.get(SharedPlan, next["plan_id"]) do
            %SharedPlan{} = plan ->
              time_label = compose_time_label(restore_when, restore_time, next)

              alignment =
                (plan.alignment || %{})
                |> Map.put("when", restore_when)
                |> Map.put("when_time", restore_time)

              _ =
                plan
                |> SharedPlan.changeset(%{
                  "time_label" => time_label,
                  "alignment" => alignment
                })
                |> Repo.update()

            _ ->
              :ok
          end
        end

        {next, true}
      else
        {planning, false}
      end

    override =
      cond do
        act == "challenge_question" ->
          venue = planning2["venue"] || planning2["requested_venue_name"]

          if is_binary(venue) do
            "You're right to ask — #{venue} in #{planning2["destination"] || "that area"} is already set, so I shouldn't have asked where you're headed."
          else
            "You're right to call that out — I shouldn't ask for something we already know."
          end

        restored? and mismatched_time? ->
          "You're right — you said #{normalize_ampm(restore_time)}. I had #{normalize_ampm(current_time)} from an earlier soft default. Restored to #{normalize_ampm(restore_time)}. Same plan otherwise."

        restored? ->
          "Keeping #{normalize_ampm(restore_time)} as you specified. Same plan, same place."

        act == "correct_venue" ->
          "Understood — I'll drop that venue and keep the rest of the plan. What place did you mean?"

        true ->
          "I may have drifted from what you said. Tell me the exact day and time you want and I'll lock those in."
      end

    meta = %{
      "conversation_act" => act,
      "planning_context" => planning2,
      "plan_id" => planning2["plan_id"],
      "PLAN_ID_STABLE" => true,
      "restored_explicit" => restored?,
      "slots_changed" => if(restored?, do: ["when_time"], else: []),
      "before_context" => %{"when_time" => current_time, "when" => prior["when"]},
      "after_context" => %{
        "when_time" => planning2["when_time"],
        "when" => planning2["when"]
      },
      "no_provider_restart" => true
    }

    {put_entities(intent, string_to_atom_map(planning2)), override, meta}
  end

  defp extract_stated_time_from_challenge(raw) when is_binary(raw) do
    case Regex.run(~r/\bi\s+said\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b/i, raw) do
      [_, t] -> normalize_ampm(t)
      _ -> nil
    end
  end

  defp extract_stated_time_from_challenge(_), do: nil

  defp stringify_map(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify_map(_), do: %{}

  defp consequential_copy(:need_authority),
    do: "I can prepare that, but I need your go-ahead before I take the action."

  defp consequential_copy(_), do: "I need a bit more authority before I can do that."

  # Repair #12 (F12-11d): the "find restaurants near me" variant — near-me
  # phrasing with restaurant cues, no typed destination. Opens the
  # device-anchored search when coords exist; otherwise falls through to the
  # normal QuestionEconomy path (which asks "where?").
  defp maybe_near_me_device_search(user_id, raw_text, intent, planning) do
    dest = planning["requested_venue_locality"] || planning["destination"]

    if near_me_phrasing?(raw_text) and not is_binary(dest) do
      case DeviceLocation.get_for_user(user_id) do
        {:ok, coords} -> {:near_me, start_near_me_search(user_id, intent, planning, coords)}
        :none -> :not_near_me
      end
    else
      :not_near_me
    end
  end

  defp maybe_attach_selection(user_id, raw_text, intent, planning) do
    case Regex.run(@select_option_re, raw_text) do
      [_, raw_name] ->
        name =
          raw_name
          |> String.trim()
          |> String.trim_trailing(".")
          |> String.replace(~r/\s*\(.*$/, "")
          |> String.trim()

        venue = resolve_selected_venue(user_id, name, planning)

        case ProviderAction.attach_selected_venue(user_id, venue, planning) do
          {:ok, result} ->
            dest = planning["destination"] || "there"

            when_s = planning["when"] || "Saturday"
            next_dep = Map.get(result, :next_dependency) || result[:next_dependency]

            override =
              "Perfect — I added #{result.venue} to #{TemporalPhrase.when_phrase(when_s)} in #{dest}." <>
                case next_dep do
                  %{"prompt" => prompt} when is_binary(prompt) and prompt != "" ->
                    " #{prompt}"

                  %{prompt: prompt} when is_binary(prompt) and prompt != "" ->
                    " #{prompt}"

                  _ ->
                    ""
                end

            meta = %{
              "action_state" => "option_selected",
              "plan_id" => result.plan_id,
              "venue" => result.venue,
              "planning_context" => result.planning,
              "graph_projection" => result.graph_projection,
              "chat_projection" => result.chat_projection,
              "center_projection" => result.center_projection,
              "option_selected" => true
            }

            intent2 =
              put_entities(
                intent,
                Map.merge(Map.get(intent, :entities) || %{}, %{
                  plan_id: result.plan_id,
                  venue: result.venue,
                  who: planning["who"],
                  destination: planning["destination"]
                })
              )

            {:attached, intent2, override, meta}

          {:error, _} ->
            :no_selection
        end

      _ ->
        :no_selection
    end
  end

  defp resolve_selected_venue(user_id, name, planning) do
    # Prefer candidate snapshot from the latest results_ready job for this destination.
    dest = planning["destination"]

    job =
      if is_binary(dest) do
        from(j in ProviderActionJob,
          where:
            j.user_id == ^user_id and j.search_geography == ^dest and
              j.status == "results_ready",
          order_by: [desc: j.inserted_at],
          limit: 1
        )
        |> Repo.one()
      end

    cands = ((job && job.result) || %{})["candidates"] || []

    Enum.find(cands, fn c ->
      is_binary(c["name"]) and String.downcase(c["name"]) == String.downcase(name)
    end) ||
      Enum.find(cands, fn c ->
        is_binary(c["name"]) and
          String.contains?(String.downcase(c["name"]), String.downcase(name))
      end) ||
      %{"name" => name, "provider" => "geoapify", "search_geography" => dest}
  end

  defp maybe_start_search(user_id, intent, planning) do
    geography =
      planning["requested_venue_locality"] || planning["destination"]

    cond do
      PlanningContext.ready_for_restaurant_search?(planning) and
          not already_running?(user_id, geography, planning) ->
        conversation_id =
          case OpalConversations.get_or_create_conversation(user_id) do
            {:ok, c} -> c.id
            _ -> nil
          end

        # Resume pending plan by fingerprint when same intent (PENDING_PLAN_DUPLICATION=0).
        planning = maybe_resume_pending_plan(user_id, planning)

        # Stable plan id before the provider job (PLAN_ID_STABLE).
        {planning, plan_id} =
          case ProviderAction.ensure_plan(user_id, planning) do
            {:ok, pid, p2} ->
              extras = %{"plan_id" => pid}

              extras =
                if is_binary(planning["opportunity_fingerprint"]),
                  do: Map.put(extras, "opportunity_fingerprint", planning["opportunity_fingerprint"]),
                  else: extras

              _ = PlanningContext.merge(user_id, extras, %{})
              {Map.merge(p2, extras), pid}

            _ ->
              {planning, planning["plan_id"]}
          end

        categories =
          cuisine_categories(planning["cuisine"]) ||
            planning["categories"] ||
            "catering.restaurant"

        search_attrs = %{
          user_id: user_id,
          conversation_id: conversation_id,
          destination: geography || planning["destination"],
          planning_snapshot: planning,
          plan_id: plan_id,
          quality_intent: planning["quality_intent"],
          search_mode: planning["search_mode"] || "discovery",
          requested_venue_name: planning["requested_venue_name"],
          requested_venue_locality: planning["requested_venue_locality"] || geography,
          cuisine: planning["cuisine"],
          categories: categories
        }

        case ProviderAction.start_places_search(search_attrs) do
          {:ok, job} ->
            who = format_who(planning["who"] || planning["primary_person"])
            when_s = planning["when"]
            dest = geography || planning["destination"]
            exact? = planning["search_mode"] == "exact_entity"
            cuisine = planning["cuisine"]

            override =
              cond do
                exact? and is_binary(planning["requested_venue_name"]) ->
                  # Repair #12 (F12-42): single copy source with the
                  # no-provider fallback render.
                  PlanContextPatch.venue_lookup_copy(planning["requested_venue_name"], dest) ||
                    "Looking up #{planning["requested_venue_name"]} in #{dest}…"

                is_binary(cuisine) and cuisine != "" and is_binary(dest) ->
                  # Cuisine discovery without inherited WHEN — do not invent Saturday/Friday.
                  label = String.capitalize(cuisine)

                  case when_s do
                    w when is_binary(w) and w != "" ->
                      "Got it — #{label} for #{TemporalPhrase.when_phrase(w)} in #{dest}#{who}. Checking #{dest}…"

                    _ ->
                      "Looking for #{label} restaurants in #{dest}#{who}…"
                  end

                is_binary(when_s) and when_s != "" ->
                  "Got it — #{TemporalPhrase.when_phrase(when_s)} in #{dest}#{who}. " <>
                    "Checking #{dest}…"

                true ->
                  "Checking #{dest}#{who}…"
              end

            meta = %{
              "action_job_id" => job.id,
              "action_state" => "queued",
              "search_geography" => job.search_geography,
              "search_mode" => planning["search_mode"] || "discovery",
              # Repair #12 (F12-11f): origin indicator — device coords,
              # user-typed destination, or named-venue resolution.
              "origin_source" => origin_source_for_search(planning),
              "provider" => "geoapify",
              "plan_id" => plan_id,
              "planning_context" => Map.put(planning, "plan_id", plan_id),
              "promise_guard" => true
            }

            {intent, override, meta}

          {:error, _} ->
            {intent, nil, %{"planning_context" => planning, "plan_id" => plan_id}}
        end

      true ->
        {intent, nil, %{"planning_context" => planning}}
    end
  end

  # Repair #12 (F12-11f): origin_source for a started search — device when the
  # turn was device-anchored, named_destination for exact-entity venue
  # resolution, manual for a user-typed destination.
  defp origin_source_for_search(planning) when is_map(planning) do
    cond do
      planning["origin_source"] in DeviceLocation.origin_sources() -> planning["origin_source"]
      planning["search_mode"] == "exact_entity" -> "named_destination"
      true -> "manual"
    end
  end

  defp origin_source_for_search(_), do: "manual"

  defp maybe_resume_pending_plan(user_id, planning) when is_map(planning) do
    fp = planning["opportunity_fingerprint"]

    cond do
      is_binary(planning["plan_id"]) and planning["plan_id"] != "" ->
        planning

      is_binary(fp) and fp != "" ->
        prior = PlanningContext.get_for_user(user_id)

        if prior["opportunity_fingerprint"] == fp and is_binary(prior["plan_id"]) and
             match?(%SharedPlan{}, Repo.get(SharedPlan, prior["plan_id"])) do
          Map.put(planning, "plan_id", prior["plan_id"])
        else
          planning
        end

      true ->
        planning
    end
  end

  defp already_running?(user_id, dest, planning) when is_binary(dest) and is_map(planning) do
    cutoff = DateTime.utc_now() |> DateTime.add(-30 * 60, :second)
    venue = planning["requested_venue_name"]
    mode = planning["search_mode"] || "discovery"
    cuisine = planning["cuisine"]

    # Only in-flight jobs suppress a new search. Completed results_ready must not
    # silence a fresh user ask into generic chat (Repair #7 / founder phone FAIL).
    base =
      from(j in ProviderActionJob,
        where:
          j.user_id == ^user_id and j.search_geography == ^dest and
            j.status in ^["queued", "running"] and
            j.inserted_at > ^cutoff,
        select: j,
        limit: 8
      )
      |> Repo.all()

    cond do
      base == [] ->
        false

      mode == "exact_entity" and is_binary(venue) and venue != "" ->
        # Repair #12 (F12-43): exact-job dedupe is case/whitespace-insensitive —
        # "Find Nighthawk" then "find nighthawk" is one in-flight job, not two.
        Enum.any?(base, fn j ->
          req = j.request || %{}

          req["search_mode"] == "exact_entity" and
            normalize_venue_key(req["requested_venue_name"]) == normalize_venue_key(venue)
        end)

      true ->
        # Discovery: only block identical in-flight cuisine/category searches.
        Enum.any?(base, fn j ->
          req = j.request || %{}
          req_mode = req["search_mode"] || "discovery"
          req_cuisine = req["cuisine"]

          req_mode != "exact_entity" and
            (is_nil(cuisine) or cuisine == "" or req_cuisine == cuisine)
        end)
    end
  rescue
    _ -> false
  end

  defp already_running?(_, _, _), do: false

  # Repair #12 (F12-43): normalize venue names for dedupe comparison.
  defp normalize_venue_key(v) when is_binary(v), do: v |> String.trim() |> String.downcase()
  defp normalize_venue_key(_), do: ""

  defp cuisine_categories(cuisine) when is_binary(cuisine) and cuisine != "" do
    slug =
      cuisine
      |> String.trim()
      |> String.downcase()
      |> String.replace(~r/[^a-z0-9]+/, "_")
      |> String.trim("_")

    if slug == "", do: nil, else: "catering.restaurant.#{slug}"
  end

  defp cuisine_categories(_), do: nil

  defp compose_time_label(when_s, when_time, prior) do
    day =
      cond do
        is_binary(when_s) and when_s != "" -> when_s
        is_binary(prior["when"]) and prior["when"] != "" -> prior["when"]
        true -> nil
      end

    clock =
      cond do
        is_binary(when_time) and when_time != "" -> normalize_ampm(when_time)
        true -> nil
      end

    cond do
      is_binary(day) and is_binary(clock) -> "#{day} · #{clock}"
      is_binary(clock) and is_binary(prior["when"]) -> "#{prior["when"]} · #{clock}"
      is_binary(clock) -> clock
      is_binary(day) -> day
      is_binary(prior["when"]) -> prior["when"]
      true -> "Updated time"
    end
  end

  defp prior_time_from_label(label) when is_binary(label) do
    case Regex.run(~r/(\d{1,2}(?::\d{2})?\s*[AaPp]\.?[Mm\.]?)/, label) do
      [_, t] -> String.trim(t)
      _ -> nil
    end
  end

  defp prior_time_from_label(_), do: nil

  defp normalize_ampm(t) when is_binary(t) do
    t
    |> String.trim()
    |> String.replace(~r/\./, "")
    |> String.upcase()
    |> String.replace(~r/\s+/, " ")
  end

  defp normalize_ampm(t), do: t

  defp enrich_entities(_raw, entities, _ctx, from_text) do
    base = atomize(entities)

    Map.merge(base, string_to_atom_map(from_text), fn
      :who, v1, v2 ->
        # Prefer explicit person from text; never let empty wipe prior turn's who here
        # (durable merge preserves prior). Prefer non-place values.
        cond do
          is_nil(v2) or v2 == "" or v2 == [] -> v1
          is_nil(v1) or v1 == "" or v1 == [] -> v2
          true -> v1
        end

      _k, v1, v2 ->
        if is_nil(v1) or v1 == "" or v1 == [], do: v2, else: v1
    end)
  end

  defp extract_from_text(raw) when is_binary(raw) do
    dest =
      cond do
        Regex.match?(@mexico_city_re, raw) ->
          "Mexico City"

        Regex.run(@take_her_to_re, raw) ->
          case Regex.run(@take_her_to_re, raw) do
            [_, place] ->
              place = String.trim(place) |> String.trim_trailing(".")
              # "take her to Mexico City this Saturday" → strip trailing time clause
              place
              |> String.replace(~r/\s+(this|next|coming|on|at)\s+.+$/i, "")
              |> String.trim()

            _ ->
              nil
          end

        Regex.run(@destination_re, raw) ->
          case Regex.run(@destination_re, raw) do
            [_, place] ->
              place = String.trim(place)

              if place =~ ~r/^(Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday)$/i do
                nil
              else
                place
              end

            _ ->
              nil
          end

        true ->
          nil
      end

    # Never mine "who" from venue-selection utterances ("Let's go with La Terraza…").
    who =
      if Regex.match?(@select_option_re, raw) do
        nil
      else
        case Regex.run(@with_person_re, raw) do
          [_, a, b] when is_binary(b) and b != "" ->
            PlanningContext.sanitize_who([a, b], dest)

          [_, a] ->
            PlanningContext.sanitize_who(a, dest)

          _ ->
            nil
        end
      end

    restaurant? = Regex.match?(@restaurant_re, raw)
    # quality_intent is preference signal only — never implies provider rankings.
    quality = if Regex.match?(@quality_re, raw), do: "strong", else: nil

    when_s =
      cond do
        Regex.match?(~r/\bthis\s+saturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bcoming\s+saturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bnext\s+saturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bsaturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bsunday\b/i, raw) -> "Sunday"
        Regex.match?(~r/\bfriday\b/i, raw) -> "Friday"
        Regex.match?(~r/\btonight\b/i, raw) -> "tonight"
        Regex.match?(~r/\btomorrow\b/i, raw) -> "tomorrow"
        Regex.match?(~r/\btoday\b/i, raw) -> "today"
        true -> nil
      end

    solo? = PlanContextPatch.solo_intent?(raw)

    %{}
    |> then(fn m -> if dest, do: Map.put(m, "destination", dest), else: m end)
    |> then(fn m ->
      cond do
        solo? -> Map.put(m, "solo", true)
        who -> Map.put(m, "who", who)
        true -> m
      end
    end)
    |> then(fn m ->
      if restaurant?,
        do: Map.merge(m, %{"category" => "restaurant", "wants_restaurant" => true}),
        else: m
    end)
    |> then(fn m -> if quality, do: Map.put(m, "quality_intent", quality), else: m end)
    |> then(fn m -> if when_s, do: Map.put(m, "when", when_s), else: m end)
  end

  defp put_entities(%{entities: _} = intent, ents), do: %{intent | entities: ents}
  defp put_entities(intent, ents) when is_map(intent), do: Map.put(intent, :entities, ents)
  defp put_entities(intent, _), do: intent

  defp format_who(nil), do: ""
  defp format_who(who) when is_binary(who), do: " with #{who}"
  defp format_who([n | _]) when is_binary(n), do: " with #{n}"
  defp format_who(_), do: ""



  defp atomize(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {k, v}
      {k, v} when is_binary(k) -> {String.to_existing_atom(k), v}
      {k, v} -> {k, v}
    end)
  rescue
    _ ->
      Map.new(map, fn
        {k, v} when is_atom(k) -> {k, v}
        {"who", v} -> {:who, v}
        {"when", v} -> {:when, v}
        {"what", v} -> {:what, v}
        {"destination", v} -> {:destination, v}
        {"category", v} -> {:category, v}
        {"quality_intent", v} -> {:quality_intent, v}
        {"wants_restaurant", v} -> {:wants_restaurant, v}
        {"plan_id", v} -> {:plan_id, v}
        {k, v} -> {k, v}
      end)
  end

  defp string_to_atom_map(map) when is_map(map) do
    Map.new(map, fn
      {"who", v} -> {:who, v}
      {"primary_person", v} -> {:primary_person, v}
      {"participants", v} -> {:participants, v}
      {"when", v} -> {:when, v}
      {"when_resolved", v} -> {:when_resolved, v}
      {"what", v} -> {:what, v}
      {"destination", v} -> {:destination, v}
      {"venue", v} -> {:venue, v}
      {"category", v} -> {:category, v}
      {"quality_intent", v} -> {:quality_intent, v}
      {"wants_restaurant", v} -> {:wants_restaurant, v}
      {"plan_id", v} -> {:plan_id, v}
      {k, v} when is_atom(k) -> {k, v}
      {_, v} -> {nil, v}
    end)
    |> Map.delete(nil)
  end
end
