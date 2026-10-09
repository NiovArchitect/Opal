defmodule OpalCore.Intelligence.Extractor do
  @moduledoc """
  Synchronous intent / entity / vibe extraction for intelligence events.

  Prefers LLM structured extraction when `OpalCore.Intelligence.LlmAdapter` is
  ready; falls back to the rule-based classifier (safety net). Auditable —
  every extraction stores source event_id and `raw["source"]` path tag
  (`llm` | `rules` | `llm_fallback`).
  """

  require Logger

  alias OpalCore.Intelligence.{Event, Extraction, LlmExtract}
  alias OpalCore.Repo
  alias OpalCore.Trips.VibeProfiles

  @confirm ~r/\b(yes|yeah|yep|yup|sure|sounds good|i'?m in\b|im in\b|locked in|perfect|works for me|^down$)\b/i
  @cancel ~r/\b(can'?t make it|cannot make it|cancel|rain check|i'?m out|sitting out)\b/i
  @counter ~r/\b(after\s+\d{1,2}|before\s+\d{1,2}|works better|feels better|rather|instead|later|earlier|move (it|to))\b/i
  @question ~r/\b(what time|where|when|which|who'?s|how about)\b|\?/i
  @propose ~r/\b(let'?s|dinner|lunch|brunch|hike|market|coffee|saturday|sunday|tonight|tomorrow|add(?:ing)? a day|extend (?:the )?trip|one more day)\b/i
  @clarify ~r/^(maybe|perhaps|not sure|idk|i don'?t know|we'?ll see|might)\.?$/i
  @chitchat ~r/^(lol+|haha+|nice|cool|ok+|kk|👍|😂|❤️|🔥)\.?$/iu
  @info_share ~r/\b(lights? are on|vibe|sunset|golden hour|looks? (good|amazing)|photo|rooftop)\b/i
  @set_reminder ~r/\b(remind\s+me|set\s+a\s+reminder|reminder\s+to|don'?t\s+let\s+me\s+forget)\b/i
  @life_event ~r/\b(got\s+engaged|just\s+engaged|is\s+engaged|got\s+married|just\s+married|is\s+pregnant|had\s+a\s+baby|new\s+job|just\s+moved)\b/i

  # Paste H Phase 4 — false-commitment guards (adversarial extraction)
  @negation_commit ~r/\b(don'?t|do\s+not|never|stop)\s+(book|reserve|confirm|schedule|remind|plan)\b|\b(cancel\s+that|never\s+mind|scratch\s+that)\b/i
  @hypothetical ~r/\b(what\s+if|if\s+we\s+(went|go|did)|hypothetically|suppose\s+we|imagine\s+if)\b/i
  @quoted_other ~r/\b([A-Z][a-z]+)\s+said\b|\bsaid\s+(she|he|they)\s+(?:is|was|were|'s)\b/i
  @hearsay ~r/\b(i\s+heard|apparently|rumor\s+is|word\s+is)\b/i
  @sarcasm_commit ~r/\byeah\s+right\b|\bsure\,?\s+jan\b|\bas\s+if\b|\blike\s+i'?m\s+free\b/i
  @reminder_retract ~r/\bremind\s+me\b.{0,80}\b(never\s+mind|nvm|forget\s+(it|that)|cancel\s+(that|the)\s+reminder)\b/i
  @conditional_book ~r/\bif\b.{0,40}\b(free|available)\b.{0,40}\b(book|reserve)\b|\b(book|reserve)\b.{0,40}\bif\b/i
  @commit_signal ~r/\b(let'?s|dinner|lunch|brunch|hike|market|coffee|saturday|sunday|tonight|tomorrow|book|reserve)\b/i

  @doc "Extract from a persisted intelligence event. Returns {:ok, extraction}."
  def extract(%Event{type: type} = event) when type in ["message.sent", "message.received"] do
    t0 = System.monotonic_time(:millisecond)
    body = get_in(event.payload, ["body"]) || get_in(event.payload, ["transcript"]) || ""
    {intent, entities, vibe, source, meta} = extract_message(body, event)
    persist(event, intent, entities, vibe, t0, source, meta)
  end

  def extract(%Event{type: "rsvp.changed"} = event) do
    t0 = System.monotonic_time(:millisecond)
    new_state = get_in(event.payload, ["new_state"])
    intent = "reaction." <> if(new_state in ["in", "interested"], do: "positive", else: "negative")
    entities = %{"activity_id" => event.payload["activity_id"], "state" => new_state}
    vibe = vibe_from_rsvp(event.payload)
    {:ok, extraction} = persist(event, intent, entities, vibe, t0, "rules", %{})
    _ = maybe_learn_vibe_from_rsvp(event, vibe)
    {:ok, extraction}
  end

  def extract(%Event{} = event) do
    t0 = System.monotonic_time(:millisecond)
    persist(event, "chitchat", %{}, %{"sentiment" => "neutral", "energy" => "medium"}, t0, "rules", %{})
  end

  def extract(_), do: {:error, :invalid_event}

  @doc """
  Message extraction with LLM preference. Returns
  `{intent, entities, vibe, source, meta}` where source is llm|rules|llm_fallback.
  """
  def extract_message(body, event_or_context \\ %{}) do
    context = extraction_context(event_or_context)

    case LlmExtract.extract_with_llm(body || "", context) do
      {:ok, %{intent: intent, entities: entities, vibe: vibe, confidence: conf} = ok} ->
        Logger.info("intelligence.extract_path=llm confidence=#{conf}")
        {intent, entities, vibe, "llm", %{"llm_confidence" => conf, "usage" => ok[:usage] || ok["usage"]}}

      {:fallback, reason} ->
        {intent, entities, vibe} = classify_message(body || "")
        Logger.info("intelligence.extract_path=llm_fallback reason=#{inspect(reason)}")
        {intent, entities, vibe, "llm_fallback", %{"fallback_reason" => inspect(reason)}}

      {:disabled, _} ->
        {intent, entities, vibe} = classify_message(body || "")
        {intent, entities, vibe, "rules", %{}}
    end
  end

  # Non-booking "book *" compounds (book club / book report / etc.)
  @non_booking_book ~r/\bbook\s+(club|report|keeping|keeper|shelf|store|fair|signing|launch|tour)\b/i

  @booking_flight ~r/\b(book|reserve|find)\b.{0,40}\b(flight|flights|airfare|plane\s+ticket)/i
  @booking_hotel ~r/\b(book|reserve|find)\b.{0,40}\b(hotel|hotels|room|lodging|stay)\b/i
  @booking_restaurant ~r/\b(book|reserve)\b.{0,40}\b(table|restaurant|dinner\s+reservation|reservation\s+at)/i
  @booking_activity ~r/\b(book|reserve|get)\b.{0,40}\b(ticket|tickets|tour|activity|activities|experience|show|museum)\b/i
  @booking_ambiguous ~r/\b(book|reserve)\b.{0,20}\b(something|anything|it|for\s+me|us)\b|\bcan\s+you\s+book\b|\bbook\s+please\b/i

  # Paste G — venue / event lookup signals (cost-guarded enrichment trigger)
  @world_venue ~r/\b(best|good|recommend|find|suggest|where\s+(?:can|is|are)|looking\s+for)\b.{0,40}\b(restaurant|cafe|coffee|bar|venue|place|hotel|museum|park|brunch|dinner|lunch)\b/i
  @world_event ~r/\b(concert|festival|what'?s\s+on|happening|tickets?\s+for|show\s+in|events?\s+in)\b/i
  @world_venue_in_city ~r/\b(restaurant|cafe|bar|venue|hotel|museum|park|brunch|dinner).{0,30}\bin\s+[A-Z][A-Za-z\s\-]{2,40}\b/

  @doc "Pure classify for tests / Maya examples."
  def classify_message(body) when is_binary(body) do
    text = String.trim(body)
    lower = String.downcase(text)

    {intent, booking_entities} = classify_intent(text, lower)

    entities =
      %{
        "time" => extract_time(lower),
        "place" => extract_place(text),
        "activity" => extract_activity(lower),
        "person" => extract_person(text)
      }
      |> Map.merge(booking_entities)

    vibe = %{
      "sentiment" => sentiment(lower, intent),
      "energy" => energy(lower, intent)
    }

    {intent, entities, vibe}
  end

  def classify_message(_), do: {"chitchat", %{}, %{"sentiment" => "neutral", "energy" => "medium"}}

  defp classify_intent(text, lower) do
    cond do
      text == "" ->
        {"chitchat", %{}}

      Regex.match?(@chitchat, text) ->
        {"chitchat", %{}}

      Regex.match?(@clarify, text) ->
        {"clarify", %{}}

      emoji_or_punct_only?(text) ->
        {"chitchat", %{}}

      # Retracted reminder mid-utterance — never create
      Regex.match?(@reminder_retract, lower) ->
        {"clarify", %{"needs_clarification" => true, "reason" => "reminder_retracted", "should_commit" => false}}

      # Negation of commit verbs — never book/remind/plan from this turn
      Regex.match?(@negation_commit, lower) ->
        {"clarify", %{"needs_clarification" => true, "reason" => "negation", "should_commit" => false}}

      # Hypothetical / what-if — question, not commitment
      Regex.match?(@hypothetical, lower) ->
        {"plan.question", %{"hypothetical" => true, "should_commit" => false}}

      # Conditional book ("if Maya free then book") — clarify, don't book
      Regex.match?(@conditional_book, lower) ->
        {"clarify", %{"needs_clarification" => true, "reason" => "conditional", "should_commit" => false}}

      Regex.match?(@sarcasm_commit, lower) ->
        {"chitchat", %{"sarcasm" => true, "should_commit" => false}}

      # Quoted third party ("Maya said she's busy") — info, not attributed fact commit
      Regex.match?(@quoted_other, text) and not Regex.match?(@set_reminder, lower) ->
        {"info.share", %{"quoted" => true, "should_commit" => false}}

      # Gossip / hearsay plan talk is not a user commitment
      Regex.match?(@hearsay, lower) and Regex.match?(@commit_signal, lower) ->
        {"info.share", %{"hearsay" => true, "should_commit" => false}}

      Regex.match?(@set_reminder, lower) ->
        {"set_reminder", reminder_entities(text, lower)}

      Regex.match?(@life_event, lower) ->
        {"life_event", life_event_entities(text)}

      Regex.match?(@non_booking_book, lower) ->
        # "book club" / "book report" — not a booking_request
        fallback_intent(lower, text)

      booking = detect_booking(lower) ->
        booking

      world = detect_world_lookup(text, lower) ->
        world

      Regex.match?(@cancel, lower) ->
        {"plan.cancel", %{}}

      Regex.match?(@counter, lower) ->
        {"plan.counter", %{}}

      Regex.match?(@confirm, lower) and String.length(text) < 80 ->
        {"plan.confirm", %{}}

      Regex.match?(@question, lower) ->
        {"plan.question", %{}}

      Regex.match?(@info_share, lower) ->
        {"info.share", %{}}

      Regex.match?(@propose, lower) ->
        {"plan.propose", %{}}

      true ->
        {"chitchat", %{}}
    end
  end

  defp emoji_or_punct_only?(text) when is_binary(text) do
    stripped = String.replace(text, ~r/[\s\?\!\.\,…]+/u, "")
    stripped != "" and not Regex.match?(~r/\p{L}|\p{N}/u, stripped)
  end

  defp emoji_or_punct_only?(_), do: false

  @doc """
  Paste H — whether an extraction may create a plan/reminder/booking side-effect.
  False for negation, hypothetical, quote, conditional, or explicit should_commit=false.
  """
  def may_commit?(intent, entities \\ %{}) when is_binary(intent) do
    ents = entities || %{}

    cond do
      ents["should_commit"] == false -> false
      ents[:should_commit] == false -> false
      intent in ["clarify", "chitchat", "plan.question", "info.share", "plan.cancel"] -> false
      intent in ["booking_request", "set_reminder", "plan.confirm", "plan.propose"] -> true
      true -> false
    end
  end

  def may_commit?(_, _), do: false

  defp reminder_entities(text, lower) do
    task =
      cond do
        m = Regex.run(~r/remind\s+me\s+to\s+(.+)/i, text) ->
          String.trim(Enum.at(m, 1))

        m = Regex.run(~r/reminder\s+to\s+(.+)/i, text) ->
          String.trim(Enum.at(m, 1))

        true ->
          String.trim(text)
      end

    when_expr =
      cond do
        m = Regex.run(~r/\bin\s+\d+\s+(?:hours?|minutes?)\b/i, lower) ->
          List.first(m)

        m =
            Regex.run(
              ~r/\b(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
              lower
            ) ->
          Enum.at(m, 1) || List.first(m)

        true ->
          nil
      end

    recurring =
      if Regex.match?(~r/\bevery\s+tuesday\b|\brecurring\b|\beach\s+tuesday\b/i, lower) do
        "tuesday"
      else
        nil
      end

    %{"task" => task, "when" => when_expr, "recurrence" => recurring}
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Map.new()
  end

  defp life_event_entities(text) do
    case OpalCore.Social.LifeEvents.detect(text) do
      %{event_type: type, person_name: name} ->
        %{"life_event_type" => type, "person" => name}

      _ ->
        %{}
    end
  end

  defp detect_world_lookup(text, lower) do
    cond do
      Regex.match?(@world_event, lower) ->
        {"world.lookup", %{"lookup_kind" => "event", "query" => String.slice(text, 0, 200)}}

      Regex.match?(@world_venue, lower) or Regex.match?(@world_venue_in_city, text) ->
        {"world.lookup", %{"lookup_kind" => "venue", "query" => String.slice(text, 0, 200)}}

      true ->
        nil
    end
  end

  defp fallback_intent(lower, text) do
    cond do
      Regex.match?(@cancel, lower) -> {"plan.cancel", %{}}
      Regex.match?(@counter, lower) -> {"plan.counter", %{}}
      Regex.match?(@confirm, lower) and String.length(text) < 80 -> {"plan.confirm", %{}}
      Regex.match?(@question, lower) -> {"plan.question", %{}}
      Regex.match?(@info_share, lower) -> {"info.share", %{}}
      Regex.match?(@propose, lower) -> {"plan.propose", %{}}
      true -> {"chitchat", %{}}
    end
  end

  defp detect_booking(lower) do
    cond do
      Regex.match?(@booking_flight, lower) ->
        {"booking_request", %{"booking_type" => "flight"}}

      Regex.match?(@booking_hotel, lower) ->
        {"booking_request", %{"booking_type" => "hotel"}}

      Regex.match?(@booking_restaurant, lower) ->
        {"booking_request", %{"booking_type" => "restaurant"}}

      Regex.match?(@booking_activity, lower) ->
        {"booking_request", %{"booking_type" => "activity"}}

      Regex.match?(@booking_ambiguous, lower) ->
        {"clarify", %{"booking_ambiguous" => true}}

      # Bare "book a …" without a typed noun — ask, don't guess.
      Regex.match?(~r/\b(book|reserve)\b/i, lower) and
          not Regex.match?(@non_booking_book, lower) and
          Regex.match?(~r/\b(book|reserve)\s+(a|an|the|my|our)\b/i, lower) ->
        {"clarify", %{"booking_ambiguous" => true}}

      true ->
        nil
    end
  end

  defp persist(event, intent, entities, vibe, t0, source, meta) do
    latency = System.monotonic_time(:millisecond) - t0

    raw =
      %{"source" => source, "legacy" => "rule_v1"}
      |> Map.merge(stringify_meta(meta))

    %Extraction{}
    |> Extraction.changeset(%{
      event_id: event.id,
      intent: intent,
      entities: entities,
      vibe: vibe,
      raw: raw,
      latency_ms: max(latency, 0)
    })
    |> Repo.insert()
  end

  defp extraction_context(%Event{} = event) do
    %{
      conversation_id: event.conversation_id,
      actor_id: event.actor_id,
      account_id: event.actor_id,
      plan_label: get_in(event.payload, ["plan_label"]),
      current_time_label: get_in(event.payload, ["current_time_label"]),
      participants: get_in(event.payload, ["participants"])
    }
  end

  defp extraction_context(ctx) when is_map(ctx), do: ctx
  defp extraction_context(_), do: %{}

  defp stringify_meta(meta) when is_map(meta) do
    Map.new(meta, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), jsonable(v)}
      {k, v} -> {to_string(k), jsonable(v)}
    end)
  end

  defp stringify_meta(_), do: %{}

  defp jsonable(%{prompt_tokens: _, completion_tokens: _, total_tokens: _} = u) do
    %{
      "prompt_tokens" => u.prompt_tokens,
      "completion_tokens" => u.completion_tokens,
      "total_tokens" => u.total_tokens
    }
  end

  defp jsonable(v) when is_map(v) or is_list(v) or is_binary(v) or is_number(v) or is_boolean(v) or is_nil(v),
    do: v

  defp jsonable(v), do: inspect(v)

  defp extract_time(lower) do
    cond do
      m = Regex.run(~r/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/, lower) ->
        hour = parse_hour(Enum.at(m, 1), Enum.at(m, 3))
        %{"after" => hour, "fuzzy" => true}

      m = Regex.run(~r/\bin\s+(\d+)\s+(hours?|minutes?)\b/, lower) ->
        %{"relative" => "in #{Enum.at(m, 1)} #{Enum.at(m, 2)}", "fuzzy" => true}

      m = Regex.run(~r/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/, lower) ->
        hour = parse_hour(Enum.at(m, 1), Enum.at(m, 3))
        min = Enum.at(m, 2)
        %{"time" => "#{hour}:#{min}", "fuzzy" => false}

      m = Regex.run(~r/\b(\d{1,2})\s*(am|pm)\b/, lower) ->
        hour = parse_hour(Enum.at(m, 1), Enum.at(m, 2))
        %{"time" => "#{hour}:00", "fuzzy" => false}

      String.contains?(lower, "tomorrow") ->
        %{"day" => "tomorrow", "fuzzy" => true}

      String.contains?(lower, "saturday") ->
        %{"day" => "saturday", "fuzzy" => true}

      String.contains?(lower, "sunday") ->
        %{"day" => "sunday", "fuzzy" => true}

      String.contains?(lower, "friday") ->
        %{"day" => "friday", "fuzzy" => true}

      String.contains?(lower, "thursday") ->
        %{"day" => "thursday", "fuzzy" => true}

      String.contains?(lower, "wednesday") ->
        %{"day" => "wednesday", "fuzzy" => true}

      String.contains?(lower, "tuesday") ->
        %{"day" => "tuesday", "fuzzy" => true}

      String.contains?(lower, "monday") ->
        %{"day" => "monday", "fuzzy" => true}

      String.contains?(lower, "tonight") ->
        %{"day" => "today", "part" => "evening", "fuzzy" => true}

      true ->
        nil
    end
  end

  defp parse_hour(h, meridiem) do
    n = String.to_integer(h)

    case meridiem do
      "pm" when n < 12 -> Integer.to_string(n + 12) |> String.pad_leading(2, "0")
      "am" when n == 12 -> "00"
      _ -> h |> String.pad_leading(2, "0")
    end
  end

  defp extract_place(text) do
    known = ~w(Juniper Pujol Contramar Quintonil Rosetta Soumaya Teotihuacan)
    Enum.find(known, fn name -> String.contains?(String.downcase(text), String.downcase(name)) end)
  end

  defp extract_activity(lower) do
    cond do
      String.contains?(lower, "dinner") -> "dinner"
      String.contains?(lower, "lunch") -> "lunch"
      String.contains?(lower, "brunch") -> "brunch"
      String.contains?(lower, "market") -> "market"
      String.contains?(lower, "hike") -> "hike"
      String.contains?(lower, "coffee") -> "coffee"
      true -> nil
    end
  end

  defp extract_person(text) do
    known = [{"Maya", "maya"}, {"Jordan", "jordan"}, {"Chanelle", "chanelle"}, {"Alex", "alex"}]

    Enum.find_value(known, fn {label, _} ->
      if Regex.match?(~r/\b#{Regex.escape(label)}\b/i, text), do: label
    end)
  end

  defp sentiment(lower, intent) do
    cond do
      intent in ["plan.cancel"] -> "negative"
      intent in ["plan.confirm", "plan.propose"] -> "positive"
      intent == "plan.counter" -> "hesitant"
      String.contains?(lower, "excited") or String.contains?(lower, "!") -> "excited"
      intent == "info.share" -> "positive"
      true -> "neutral"
    end
  end

  defp energy(lower, intent) do
    cond do
      String.contains?(lower, "!") or intent == "plan.propose" -> "high"
      intent in ["chitchat", "info.share"] -> "low"
      true -> "medium"
    end
  end

  defp vibe_from_rsvp(%{"new_state" => "in", "slot" => slot}) when is_binary(slot) do
    energy =
      cond do
        slot in ["morning"] -> "high"
        slot in ["night"] -> "low"
        true -> "medium"
      end

    %{"sentiment" => "positive", "energy" => energy, "slot" => slot}
  end

  defp vibe_from_rsvp(%{"new_state" => "passed"}),
    do: %{"sentiment" => "negative", "energy" => "low"}

  defp vibe_from_rsvp(_), do: %{"sentiment" => "neutral", "energy" => "medium"}

  defp maybe_learn_vibe_from_rsvp(%Event{actor_id: actor_id, payload: payload}, vibe) do
    slot = payload["slot"]
    state = payload["new_state"]

    if state == "passed" and slot in ["morning", "night"] do
      case VibeProfiles.ensure(actor_id) do
        {:ok, profile} ->
          evidence = List.wrap(profile.evidence)

          entry = %{
            "source" => "intelligence.extractor",
            "signal" => "rsvp.passed",
            "slot" => slot,
            "vibe" => vibe,
            "at" => DateTime.utc_now() |> DateTime.to_iso8601()
          }

          sleep =
            cond do
              slot == "morning" -> "late"
              slot == "night" -> "early"
              true -> profile.sleep_bias
            end

          profile
          |> OpalCore.Trips.VibeProfile.changeset(%{
            sleep_bias: sleep || profile.sleep_bias,
            evidence: [entry | evidence] |> Enum.take(40)
          })
          |> Repo.update()

        _ ->
          :ok
      end
    else
      :ok
    end
  end
end
