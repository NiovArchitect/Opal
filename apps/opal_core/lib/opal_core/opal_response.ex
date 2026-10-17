defmodule OpalCore.OpalResponse do
  @moduledoc """
  Phase OC-4 — Opal Center response generation.

  Builds a short reply from OC-3 intent + OC-2 context. Templates are floors;
  `LlmRespond` may polish phrasing when ready. Never invents memories,
  preferences, or plans. Max 3 sentences. Trust-tier and error strings stay template-only.
  """

  require Logger

  alias OpalCore.Center.PlanContextPatch
  alias OpalCore.Intelligence.LlmAdapter
  alias OpalCore.Intelligence.LlmRespond
  alias OpalCore.Memory
  alias OpalCore.Oracle
  alias OpalCore.Push.DeviceTokens
  alias OpalCore.TrustTiers

  @draft_meta_key :opal_response_last_draft_meta

  @fallback "I'm having trouble thinking right now. Try again in a moment."

  @above_tier_msg "I'd love to help with that — as we get to know each other better, I'll be able to give more personalized suggestions."

  @doc "Honest fallback when assemble/classify/generate fails."
  def fallback_text, do: @fallback

  @doc "Warm above-tier message (never mentions tier names)."
  def above_tier_text, do: @above_tier_msg

  @doc """
  Non-secret draft metadata from the most recent `generate/2` in this process.

  Keys: draft_source, llm_called, llm_provider, model. Never includes prompts or API keys.
  """
  def last_draft_meta do
    case Process.get(@draft_meta_key) do
      %{} = m -> m
      _ -> %{}
    end
  end

  @doc """
  Generate response text from an intent map and context map.

  Returns `{:ok, response_text}` | `{:error, reason}`.
  """
  def generate(intent_map, context_map)
      when is_map(intent_map) and is_map(context_map) do
    Process.delete(@draft_meta_key)
    intent = intent_key(intent_map)
    entities = entities_map(intent_map)
    raw = raw_text(intent_map, context_map)
    tier = get_in_ctx(context_map, [:trust_tier]) || "new"

    text =
      cond do
        above_tier_request?(raw, tier) ->
          # Trust-tier gate — must stay deterministic.
          put_draft_meta(template_meta())
          @above_tier_msg

        true ->
          template =
            case intent do
              :oracle ->
              # Paste J — grounded answers from real data; never invent.
              render_oracle(entities, context_map, intent_map)

            :plan_create ->
                render_plan_create(Map.put(entities, :raw_text, raw), context_map)

              :plan_confirm -> render_plan_confirm(entities, context_map)
              :plan_modify -> render_plan_modify(entities, context_map)
              :remember -> render_remember(entities, context_map)
              :recall -> render_recall(entities, context_map)
              :named_venue -> render_named_venue(entities, context_map)
              :recommend -> render_recommend(entities, context_map)
              :coordinate -> render_coordinate(entities, context_map)
              :check_status -> render_check_status(entities, context_map)
              :chat -> render_chat(entities, context_map, intent_map)
              _ -> nil
            end

          # Action-boundary + plan commit path stay template-only.
          # LLM must not rewrite "Want me to set this up?" / "Done… Graph"
          # or invent mutations, outbound send, or booking success.
          # DeepSeek may still polish chat / recommend / status phrasing.
          owns_routing? =
            entities[:conversation_owns_routing] == true or
              entities["conversation_owns_routing"] == true

          case intent do
            # Repair #13 (W4-5) — :oracle answers are grounded facts from real
            # rows (Oracle.answer); the LLM must never rewrite them, per
            # Oracle's documented template-only contract. :recall likewise
            # quotes stored memories verbatim.
            i when i in [:plan_create, :plan_confirm, :plan_modify, :coordinate, :named_venue, :oracle, :recall] ->
              put_draft_meta(template_meta())
              template

            # Greetings / parked conversation turns stay on the template floor so a
            # sticky restaurant draft cannot rewrite "how are you?" into another lookup.
            :chat when owns_routing? ->
              put_draft_meta(template_meta())
              template

            _ ->
              maybe_llm_phrase(template, intent, intent_map, context_map)
          end
      end

    if is_binary(text) and String.trim(text) != "" do
      {:ok, clamp_sentences(String.trim(text))}
    else
      {:error, :unhandled_intent}
    end
  end

  def generate(_, _), do: {:error, :invalid}

  defp maybe_llm_phrase(nil, _intent, _intent_map, _context), do: nil

  defp maybe_llm_phrase(template, intent, intent_map, context_map) when is_binary(template) do
    account_id =
      get_in_ctx(context_map, [:user, :id]) || get_in_ctx(context_map, [:account_id])

    conversation_id =
      get_in_ctx(context_map, [:conversation_id]) ||
        get_in_ctx(context_map, [:conversation, :id])

    history = get_in_ctx(context_map, [:conversation_history]) || []

    recent =
      history
      |> Enum.take(-8)
      |> Enum.map(fn turn ->
        role = turn[:role] || turn["role"] || "user"
        body = turn[:body] || turn["body"] || ""
        %{role: to_string(role), content: to_string(body)}
      end)

    raw = raw_text(intent_map, context_map)

    recent =
      if raw != "" do
        recent ++ [%{role: "user", content: raw}]
      else
        recent
      end

    ents = entities_map(intent_map)
    solo? = solo_turn?(ents, raw)
    participants = if solo?, do: [], else: ents[:who] || ents["who"] || ents[:participants]

    surprise? =
      ents[:surprise] == true or ents["surprise"] == true or
        ents[:visibility_mode] == "surprise" or ents["visibility_mode"] == "surprise"

    owns_routing? =
      ents[:conversation_owns_routing] == true or ents["conversation_owns_routing"] == true or
        ents[:provider_parked] == true or ents["provider_parked"] == true

    instruction =
      cond do
        owns_routing? ->
          "Keep facts from the template floor. Warm Center voice. Max 3 short sentences. " <>
            "Answer ONLY the current user message. " <>
            "Do NOT resume, continue, or mention a prior restaurant search, venue lookup, or pending provider job " <>
            "unless the user explicitly asks about it. " <>
            "Do NOT invent that a message was delivered or a reservation was booked."

        solo? ->
          "Keep facts from the template floor. Warm Center voice. Max 3 short sentences. " <>
            "This is a SOLO request — participant_set is the current user only. " <>
            "Do NOT mention, invite, or ask about any other person (including contacts from memory). " <>
            "Ask at most ONE narrow question if truly required — never two questions in one turn. " <>
            "Prefer useful options over interrogation. Empty budget must NOT block a helpful reply. " <>
            "Do NOT call this a surprise unless surprise=true in entities."

        surprise? ->
          "Keep facts from the template floor. Warm Center voice. Max 3 short sentences. " <>
            "Visibility is surprise — do not reveal the plan to the invitee. " <>
            "Ask at most ONE narrow question if needed."

        true ->
          "Keep facts from the template floor (names, plans, memories). Warm Center voice. Max 3 short sentences. " <>
            "Ask at most ONE narrow question if needed — never two questions joined by 'and'. " <>
            "Never invent that someone is joining. " <>
            "Do NOT say 'surprise' or 'since it's a surprise' unless entities.surprise=true or visibility_mode=surprise. " <>
            "If visibility is unknown and not consequential yet, stay neutral — do not ask about surprise."
      end

    draft_ctx = %{
      action: "respond.center",
      intent: intent,
      entities: ents,
      participants: participants,
      template_message: template,
      account_id: account_id,
      conversation_id: conversation_id,
      recent_messages: recent,
      # Solo: do not inject relationship memory people into the draft.
      instruction: instruction,
      skip_social_memory: solo?
    }

    {text, source} = LlmRespond.draft_or_template(draft_ctx)

    put_draft_meta(%{
      "draft_source" => source,
      "llm_called" => source == "llm",
      "llm_provider" => LlmAdapter.provider_name(),
      "model" => LlmAdapter.model_name()
    })

    text
  end

  defp put_draft_meta(meta) when is_map(meta), do: Process.put(@draft_meta_key, meta)

  defp template_meta do
    %{
      "draft_source" => "template",
      "llm_called" => false,
      "llm_provider" => LlmAdapter.provider_name(),
      "model" => LlmAdapter.model_name()
    }
  end

  defp raw_text(intent_map, context) do
    intent_map[:raw_text] || intent_map["raw_text"] ||
      get_in_ctx(context, [:message, :text]) || ""
  end

  # RU-2 — requests that need deeper trust. Frame as growing familiarity.
  defp above_tier_request?(raw, tier) when is_binary(raw) do
    lower = String.downcase(raw)

    financial? =
      Regex.match?(
        ~r/\b(budget|spend|afford|price range|how much|financial|money|cheap|expensive)\b/i,
        lower
      )

    intimate? =
      Regex.match?(
        ~r/\b(health|therapy|depression|anxiety|intimate|private medical|diagnosis)\b/i,
        lower
      )

    cond do
      financial? and not TrustTiers.can_access_tier?(tier, :financial) -> true
      intimate? and not TrustTiers.can_access_tier?(tier, :intimate) -> true
      true -> false
    end
  end

  defp above_tier_request?(_, _), do: false

  # --- templates -------------------------------------------------------------

  defp render_plan_create(entities, context) do
    what = sanitize_consumer_what(entity(entities, :what)) || "something"
    when_s = entity(entities, :when) || "soon"
    who = entity(entities, :who)
    with_who = format_with_who(who)
    plan_type = entity(entities, :plan_type)
    meeting_link = entity(entities, :meeting_link)
    virtual? = plan_type == "virtual" or plan_type == :virtual
    raw = entity(entities, :raw_text) || ""
    affirmed? =
      entity(entities, :nudge_affirmed) == true or entity(entities, :user_affirmed) == true or
        OpalCore.Center.PlanContextPatch.nudge_affirmed?(raw)

    # Birthday private planning: don't force a named "what" that was mangled.
    birthday? = OpalCore.Center.PlanContextPatch.birthday_intent?(raw)
    what = if birthday? and what in ["something", nil], do: "a birthday celebration", else: what

    if virtual? do
      render_virtual_plan_create(what, when_s, with_who, meeting_link, context)
    else
      group_hint = plan_create_group_hint(who, context)
      taste_hint = if group_hint, do: nil, else: plan_create_taste_hint(context)

      # Avoid "dinner Friday Friday" when what already carries the day.
      what_s = to_string(what || "")
      when_part = to_string(when_s || "")
      lead_core =
        cond do
          when_part == "" -> what_s
          what_s == "" -> when_part
          String.ends_with?(String.downcase(what_s), String.downcase(when_part)) -> what_s
          true -> "#{what_s} #{when_part}"
        end

      lead = "Got it: #{lead_core}#{with_who}."

      parts =
        if affirmed? do
          # Nudge tap already affirmed — do not ask "Want me to set this up?" again.
          start =
            if birthday? do
              # Repair #12 (F12-31): no private-planning thread exists — do not
              # claim one. What is real: the birthday is planned in the owner's
              # Center thread (owner_private visibility) and the honoree is
              # never looped in without the owner's say-so.
              "Got it — I'll plan the birthday#{with_who} here with you. It stays between us. I won't loop anyone in unless you say so."
            else
              "Got it — I'll start planning #{what}#{with_who}."
            end

          [start]
          |> maybe_append(group_hint)
          |> maybe_append(taste_hint)
        else
          [lead]
          |> maybe_append(group_hint)
          |> maybe_append(taste_hint)
          |> Kernel.++(["Want me to set this up?"])
        end

      Enum.join(parts, " ")
    end
  end

  # Never paint byte-slice damage ("omething") or vague / over-captured nouns.
  defp sanitize_consumer_what(nil), do: nil

  defp sanitize_consumer_what(w) when is_binary(w) do
    # Stop at question/em-dash tail from seed handoff ("something? — yes, plan…").
    t =
      w
      |> String.trim()
      |> String.split(~r/[?—–]/u)
      |> List.first()
      |> to_string()
      |> String.trim()

    down = String.downcase(t)

    cond do
      t == "" -> nil
      down in ~w(omething thing ome anything something everything nothing stuff things) -> nil
      String.starts_with?(down, "something") -> nil
      String.length(t) < 3 -> nil
      true -> t
    end
  end

  defp sanitize_consumer_what(_), do: nil

  defp render_virtual_plan_create(what, when_s, with_who, meeting_link, context) do
    lead = "Got it: #{what} #{when_s}#{with_who} (online)."

    cond do
      is_binary(meeting_link) and meeting_link != "" ->
        "#{lead} Want me to set this up with that link?"

      usual = usual_meeting_link(context) ->
        _ = usual
        "#{lead} Want to use your usual Zoom link?"

      true ->
        "#{lead} Paste a meeting link, or say when you have one. I never invent a URL."
    end
  end

  defp usual_meeting_link(context) when is_map(context) do
    get_in_ctx(context, [:preferences, :usual_meeting_link]) ||
      get_in_ctx(context, [:usual_meeting_link]) ||
      get_in_ctx(context, [:assistance, :usual_meeting_link])
  end

  defp usual_meeting_link(_), do: nil

  defp render_plan_confirm(entities, _context) do
    confirmed? = entity(entities, :confirmed) != false
    what = entity(entities, :what) || "that plan"
    when_s = entity(entities, :when)
    who = entity(entities, :who)
    with_who = format_with_who(who)
    when_bit = if is_binary(when_s) and when_s != "", do: " #{when_s}", else: ""
    plan_type = entity(entities, :plan_type)
    virtual? = plan_type == "virtual" or plan_type == :virtual
    meeting_link = entity(entities, :meeting_link)

    cond do
      confirmed? == false ->
        "I can set that up. Who should I include?"

      virtual? and is_binary(meeting_link) and meeting_link != "" ->
        "Done. #{what}#{when_bit}#{with_who} is set for Online. Join link saved."

      virtual? ->
        "Done. #{what}#{when_bit}#{with_who} is set for Online. Add a join link anytime by pasting it."

      true ->
        # Honest success: plan is durable on Graph. Booking/outbound stay gated.
        "Done. #{what}#{when_bit}#{with_who} is set up. It's on your Graph."
    end
  end

  defp plan_create_group_hint(who, context) do
    case match_group_taste(who, context) do
      %{best_day: day, member_names: names} when is_binary(day) and day != "" ->
        # Prefer explicit who from the intent; fall back to other group members.
        who_names = who_name_list(who)

        label_names =
          if who_names == [] do
            names
          else
            Enum.filter(names, fn n ->
              down = String.downcase(to_string(n || ""))
              Enum.any?(who_names, &String.contains?(down, &1))
            end)
            |> then(fn matched -> if matched == [], do: names, else: matched end)
          end

        who_label = format_group_names(label_names)
        day_label = String.capitalize(day)
        "You usually do #{day_label}s with #{who_label} — want #{day_label}?"

      _ ->
        nil
    end
  end

  defp plan_create_taste_hint(context) do
    vibes = get_in_ctx(context, [:taste, :vibes]) || []

    case vibes do
      [first | _] when is_binary(first) and first != "" ->
        "Based on what you both enjoy (#{first}), I have some ideas."

      _ ->
        plan_create_fit_hint(context)
    end
  end

  # Private Fit influence — suggest an activity shape, never announce Fit prefs.
  defp plan_create_fit_hint(context) do
    case fit_activity_phrase(get_in_ctx(context, [:fit])) do
      phrase when is_binary(phrase) and phrase != "" ->
        "#{String.capitalize(phrase)} could work well."

      _ ->
        nil
    end
  end

  defp render_plan_modify(entities, context) do
    action = entity(entities, :action) || "change"
    plan_ref = entity(entities, :plan_ref) || "that plan"
    new_when = entity(entities, :new_when)
    plans = get_in_ctx(context, [:temporal, :recent_plans]) || []

    found? =
      Enum.any?(plans, fn p ->
        title = plan_title(p) || ""
        String.contains?(String.downcase(title), String.downcase(plan_ref))
      end)

    # Repair #13 (W4-2) — backstop for :plan_modify turns the orchestrator did
    # not execute (no when/when_time to apply, no cancel verb). Never claim
    # chat updates "aren't live" — they are. Be honest and actionable.
    cond do
      found? and is_binary(new_when) and new_when != "" and action in ["move", "reschedule", "change"] ->
        "Say the day and time — like \"move #{plan_ref} to Saturday at 8 PM\" — and I'll update it."

      found? and action == "cancel" ->
        "Say \"cancel #{plan_ref}\" and I'll cancel it right now."

      found? and is_binary(new_when) and new_when != "" ->
        "Tell me the new day or time for #{plan_ref} and I'll update it."

      found? ->
        "I found #{plan_ref}. What should I change — the day, the time, or cancel it?"

      true ->
        "I don't see #{plan_ref} on your Graph. Want to create it?"
    end
  end

  defp render_remember(entities, context) do
    fact = entity(entities, :fact) || ""
    user_id = get_in_ctx(context, [:user, :id])

    persist =
      if is_binary(user_id) and fact != "" do
        Memory.store(user_id, fact, source: "opal_center")
      else
        {:error, :no_user}
      end

    case persist do
      {:ok, _} ->
        "Remembered: #{fact}. I'll keep that in mind."

      {:error, reason} ->
        Logger.error("opal_center.memory_store_failed reason=#{inspect(reason)}")
        "I noted that down."
    end
  end

  defp render_recall(entities, context) do
    topic = entity(entities, :topic) || "that"
    user_id = get_in_ctx(context, [:user, :id])

    # Short-term: scan recent Opal Center turns before long-term Memory.
    case recall_from_history(context, topic) do
      text when is_binary(text) and text != "" ->
        text

      _ ->
        memories =
          if is_binary(user_id) do
            Memory.recall(user_id, to_string(topic))
          else
            []
          end

        case memories do
          [] ->
            "I don't have anything saved about #{topic} yet."

          list ->
            summary =
              list
              |> Enum.map(& &1.summary)
              |> Enum.reject(&(is_nil(&1) or &1 == ""))
              |> Enum.take(3)
              |> Enum.join("; ")

            "Here's what I remember about #{topic}: #{summary}"
        end
    end
  end

  defp recall_from_history(context, topic) do
    topic_l = String.downcase(to_string(topic || ""))
    history = get_in_ctx(context, [:conversation_history]) || []

    candidates =
      history
      |> Enum.filter(fn turn ->
        role = turn[:role] || turn["role"]
        body = turn[:body] || turn["body"] || ""

        role in ["user", :user] and is_binary(body) and body != "" and
          not recall_question_body?(body) and
          (topic_l == "" or String.contains?(String.downcase(body), topic_l))
      end)

    # Prefer preference/fact statements over plan chatter when both mention the topic.
    hits =
      case Enum.filter(candidates, &fact_like_body?/1) do
        [] -> Enum.take(candidates, -1)
        facts -> Enum.take(facts, -1)
      end

    case hits do
      [] ->
        nil

      [%{} = turn] ->
        bits = turn[:body] || turn["body"] || ""

        if bits == "" do
          nil
        else
          "You just told me: #{bits}"
        end

      _ ->
        nil
    end
  end

  defp recall_question_body?(body) when is_binary(body) do
    Regex.match?(
      ~r/\b(what\s+do\s+you\s+remember|do\s+you\s+remember|remember\s+about|what\s+have\s+i\s+told)\b/i,
      body
    )
  end

  defp recall_question_body?(_), do: false

  defp fact_like_body?(turn) do
    body = turn[:body] || turn["body"] || ""

    Regex.match?(
      ~r/\b(is|likes?|loves?|hates?|prefers?|allergic|vegetarian|vegan)\b/i,
      body
    ) and not Regex.match?(~r/\b(plan|dinner|lunch|friday|saturday|tomorrow)\b/i, body)
  end

  # Curated places with approximate per-person USD for RU-3 filtering.
  # Never spoken as dollar amounts unless the user already set a range.
  @recommend_catalog [
    %{name: "a neighborhood taco spot", approx: 18, vibe: "casual"},
    %{name: "a lively cafe", approx: 28, vibe: "lively"},
    %{name: "a mid-range dinner spot", approx: 45, vibe: "relaxed"},
    %{name: "a polished dinner spot", approx: 90, vibe: "polished"},
    %{name: "a tasting-menu experience", approx: 200, vibe: "special"}
  ]

  @ask_budget "I don't know your budget preferences yet — want to set them so my suggestions fit?"

  # Repair #11 — named-venue fallback render, reached only when no provider
  # override fired this turn. Never invents a venue or claims a lookup that
  # did not start; asks for the missing locality instead of substituting.
  # Repair #12 (F12-42): the in-flight line is the single copy source
  # PlanContextPatch.venue_lookup_copy/2 — identical to the provider override.
  defp render_named_venue(entities, _context) do
    name = entity(entities, :venue_name)
    loc = entity(entities, :locality)

    cond do
      is_binary(name) and name != "" and is_binary(loc) and loc != "" ->
        PlanContextPatch.venue_lookup_copy(name, loc) || "Looking up #{name} in #{loc}…"

      is_binary(name) and name != "" ->
        "Which city is #{name} in?"

      true ->
        "Tell me the place name and I'll look it up."
    end
  end

  defp render_recommend(entities, context) do
    for_who = entity(entities, :for_who)
    who_label = format_who_label(for_who)
    vibes = get_in_ctx(context, [:taste, :vibes]) || []
    cuisines = get_in_ctx(context, [:taste, :cuisines]) || []
    plans = get_in_ctx(context, [:temporal, :recent_plans]) || []
    intimate? = intimate_relationship?(context, for_who)
    tier = get_in_ctx(context, [:trust_tier]) || "new"
    financial = get_in_ctx(context, [:financial])
    fit = get_in_ctx(context, [:fit])
    category = entity(entities, :category)
    raw = get_in_ctx(context, [:message, :text]) || ""

    cond do
      # Activity / Fit path first when the ask is activity-shaped (private use only).
      fit_rec = recommend_from_fit(fit, category, raw, who_label, intimate?) ->
        fit_rec

      # Trusted+ but no profile yet — invite them to set spending comfort.
      # Skip budget ask for clear activity asks without Fit (handled above as nil).
      TrustTiers.can_access_tier?(tier, :financial) and is_nil(financial) and
          not activity_shaped_ask?(category, raw) ->
        @ask_budget

      # D-1 — known group pattern
      group_rec = recommend_from_group(for_who, context, financial) ->
        group_rec

      vibes == [] and cuisines == [] and plans == [] ->
        case catalog_recommend_if_profiled(financial, vibes, cuisines, who_label, intimate?) do
          nil ->
            if intimate? do
              "I don't know #{who_label}'s preferences yet — the more evenings you share, the better I can suggest something you'll both love."
            else
              "I don't know #{who_label}'s preferences yet — the more you plan together, the better my suggestions get."
            end

          text ->
            text
        end

      match = recommend_from_plans(plans, vibes, intimate?, financial) ->
        match

      true ->
        case catalog_recommend_if_profiled(financial, vibes, cuisines, who_label, intimate?) do
          text when is_binary(text) ->
            text

          nil ->
            case {List.first(vibes), List.first(cuisines)} do
              {vibe, _} when is_binary(vibe) and vibe != "" ->
                place = recommend_place_from_cuisine(cuisines) || "a #{vibe} spot"

                if intimate? do
                  "#{place} — a warm fit for you and #{who_label}."
                else
                  "#{place} — #{who_label} prefers #{vibe} places."
                end

              {_, cuisine} when is_binary(cuisine) and cuisine != "" ->
                if intimate? do
                  "A #{cuisine} place — something cozy for the two of you."
                else
                  "A #{cuisine} place — based on what you've enjoyed together."
                end

              _ ->
                "I don't know #{who_label}'s preferences yet — the more you plan together, the better my suggestions get."
            end
        end
    end
  end

  defp recommend_from_fit(nil, _category, _raw, _who, _intimate?), do: nil

  defp recommend_from_fit(fit, category, raw, who_label, intimate?) when is_map(fit) do
    if activity_shaped_ask?(category, raw) or vague_non_dining_recommend?(raw) do
      case fit_activity_phrase(fit) do
        phrase when is_binary(phrase) and phrase != "" ->
          cond do
            is_binary(who_label) and who_label != "" and intimate? ->
              "How about #{phrase} — something easy for you and #{who_label}?"

            is_binary(who_label) and who_label != "" ->
              "How about #{phrase} with #{who_label}?"

            true ->
              "How about #{phrase}?"
          end

        _ ->
          nil
      end
    else
      nil
    end
  end

  defp recommend_from_fit(_, _, _, _, _), do: nil

  defp activity_shaped_ask?(category, raw) when is_binary(raw) do
    cat = category && to_string(category) |> String.downcase()

    cat in ["activity", "hike", "walk", "yoga", "run", "outdoors"] or
      Regex.match?(
        ~r/\b(activit(?:y|ies)|hike|hiking|walk|walking|outdoors?|yoga|run|running|workout|exercise)\b/i,
        raw
      )
  end

  defp activity_shaped_ask?(_, _), do: false

  defp vague_non_dining_recommend?(raw) when is_binary(raw) do
    Regex.match?(~r/\b(suggest|recommend|ideas?)\b/i, raw) and
      not Regex.match?(~r/\b(dinner|lunch|brunch|restaurant|cafe|coffee|drinks|bar|food)\b/i, raw)
  end

  defp vague_non_dining_recommend?(_), do: false

  # Map gated Fit activities → a natural activity phrase (no Fit/settings disclosure).
  defp fit_activity_phrase(fit) when is_map(fit) do
    activities =
      (fit[:activities] || fit["activities"] || [])
      |> Enum.map(&to_string/1)
      |> Enum.map(&String.downcase/1)

    goal =
      case fit[:goal] || fit["goal"] do
        g when is_binary(g) -> String.downcase(g)
        g when is_atom(g) -> g |> Atom.to_string() |> String.downcase()
        _ -> nil
      end

    has? = fn id -> id in activities end

    cond do
      activities == [] and is_nil(goal) ->
        nil

      has?.("walk") and has?.("outdoors") ->
        "an outdoor walk"

      has?.("run") and has?.("outdoors") ->
        "an outdoor run"

      has?.("yoga") and goal == "recover" ->
        "a gentle yoga session"

      has?.("rest") and goal == "recover" ->
        "an easy recovery afternoon"

      has?.("walk") ->
        "a walk"

      has?.("run") ->
        "a run"

      has?.("yoga") ->
        "a yoga session"

      has?.("strength") ->
        "a strength session"

      has?.("outdoors") ->
        "something outdoors"

      has?.("rest") ->
        "a restful stretch of time"

      goal == "move_more" ->
        "something active"

      goal == "stay_active" ->
        "a light active outing"

      goal == "recover" ->
        "a low-key recovery plan"

      true ->
        nil
    end
  end

  defp fit_activity_phrase(_), do: nil

  defp recommend_from_group(for_who, context, financial) do
    case match_group_taste(for_who, context) do
      %{vibes: vibes, cuisines: cuisines, best_day: day, member_names: names}
      when is_list(vibes) or is_list(cuisines) ->
        vibe = List.first(List.wrap(vibes))
        cuisine = List.first(List.wrap(cuisines))
        you_n = group_you_label(names)

        place =
          cond do
            is_binary(cuisine) and cuisine != "" and is_binary(vibe) and vibe != "" ->
              "a #{vibe} #{cuisine} place"

            is_binary(cuisine) and cuisine != "" ->
              "a #{cuisine} place"

            is_binary(vibe) and vibe != "" ->
              "a #{vibe} spot"

            true ->
              nil
          end

        if is_nil(place) or not fits_financial?(place, financial) do
          nil
        else
          pattern =
            cond do
              is_binary(vibe) and is_binary(cuisine) and is_binary(day) ->
                "#{vibe} #{cuisine} on #{String.capitalize(day)}s"

              is_binary(vibe) and is_binary(cuisine) ->
                "#{vibe} #{cuisine}"

              is_binary(vibe) and is_binary(day) ->
                "#{vibe} places on #{String.capitalize(day)}s"

              is_binary(cuisine) ->
                cuisine

              true ->
                "that vibe"
            end

          "You #{you_n} always love #{pattern} — how about #{place}?"
        end

      _ ->
        nil
    end
  end

  defp group_you_label(names) when is_list(names) do
    n = names |> Enum.reject(&(is_nil(&1) or &1 == "")) |> length()

    cond do
      n <= 1 -> "both"
      n == 2 -> "two"
      n == 3 -> "three"
      true -> "all"
    end
  end

  defp group_you_label(_), do: "all"

  defp match_group_taste(who, context) do
    groups = get_in_ctx(context, [:group_tastes]) || []
    who_names = who_name_list(who)

    if who_names == [] or groups == [] do
      nil
    else
      Enum.find(groups, fn g ->
        names =
          (g[:member_names] || g["member_names"] || [])
          |> Enum.map(&String.downcase(to_string(&1)))

        Enum.any?(who_names, fn w ->
          Enum.any?(names, &String.contains?(&1, w))
        end)
      end)
    end
  end

  defp who_name_list(who) when is_list(who) do
    who
    |> Enum.map(fn
      n when is_binary(n) -> String.downcase(String.trim(n))
      %{display_name: n} when is_binary(n) -> String.downcase(String.trim(n))
      %{"display_name" => n} when is_binary(n) -> String.downcase(String.trim(n))
      _ -> nil
    end)
    |> Enum.reject(&(is_nil(&1) or &1 == ""))
  end

  defp who_name_list(who) when is_binary(who), do: who_name_list([who])
  defp who_name_list(_), do: []

  defp format_group_names(names) when is_list(names) do
    cleaned = Enum.reject(names, &(is_nil(&1) or &1 == ""))

    case cleaned do
      [] -> "all"
      [a] -> a
      [a, b] -> "#{a} and #{b}"
      many ->
        {lead, [last]} = Enum.split(many, -1)
        Enum.join(lead, ", ") <> ", and " <> last
    end
  end

  defp format_group_names(_), do: "all"

  defp catalog_recommend_if_profiled(nil, _vibes, _cuisines, _who, _intimate?), do: nil

  defp catalog_recommend_if_profiled(financial, vibes, cuisines, who_label, intimate?)
       when is_map(financial) do
    recommend_from_catalog(financial, vibes, cuisines, who_label, intimate?)
  end

  defp catalog_recommend_if_profiled(_, _, _, _, _), do: nil

  defp recommend_from_plans(plans, _vibes, intimate?, financial) do
    case plans do
      [plan | _] ->
        title = plan_title(plan)

        if is_binary(title) and title != "" and fits_financial?(title, financial) do
          reason =
            if intimate? do
              "You two loved #{title} last time"
            else
              "You both loved #{title} last time"
            end

          "#{title} — #{reason}."
        else
          nil
        end

      _ ->
        nil
    end
  end

  defp recommend_place_from_cuisine([c | _]) when is_binary(c) and c != "", do: "A #{c} spot"
  defp recommend_place_from_cuisine(_), do: nil

  defp recommend_from_catalog(financial, vibes, cuisines, who_label, intimate?) do
    candidates =
      @recommend_catalog
      |> Enum.filter(&fits_approx?(&1.approx, financial))

    case candidates do
      [] ->
        nil

      list ->
        pick =
          case {List.first(vibes), List.first(cuisines)} do
            {vibe, _} when is_binary(vibe) and vibe != "" ->
              Enum.find(list, fn item ->
                String.contains?(String.downcase(item.vibe), String.downcase(vibe))
              end) || hd(list)

            {_, cuisine} when is_binary(cuisine) and cuisine != "" ->
              %{name: "a #{cuisine} spot that fits", approx: hd(list).approx, vibe: "fit"}

            _ ->
              hd(list)
          end

        if intimate? do
          "#{capitalize_place(pick.name)} — a warm fit for you and #{who_label}."
        else
          "#{capitalize_place(pick.name)} — a good fit for #{who_label}."
        end
    end
  end

  defp capitalize_place(<<"a ", rest::binary>>), do: "A " <> rest
  defp capitalize_place(name) when is_binary(name), do: name
  defp capitalize_place(_), do: "A spot"

  defp fits_approx?(_approx, nil), do: true

  defp fits_approx?(approx, financial) when is_integer(approx) and is_map(financial) do
    case dining_bounds(financial) do
      {min, max} when is_integer(min) and is_integer(max) ->
        approx >= min and approx <= max

      _ ->
        fits_level?(approx, financial[:level] || financial["level"])
    end
  end

  defp fits_approx?(_, _), do: true

  defp fits_level?(approx, "budget"), do: approx <= 25
  defp fits_level?(approx, "moderate"), do: approx >= 25 and approx <= 60
  defp fits_level?(approx, "comfortable"), do: approx >= 60 and approx <= 150
  defp fits_level?(approx, "luxury"), do: approx >= 150
  defp fits_level?(_, _), do: true

  defp dining_bounds(financial) when is_map(financial) do
    range = financial[:dining_range] || financial["dining_range"]

    case range do
      %{min: min, max: max} when is_integer(min) and is_integer(max) -> {min, max}
      %{"min" => min, "max" => max} when is_integer(min) and is_integer(max) -> {min, max}
      _ -> nil
    end
  end

  defp dining_bounds(_), do: nil

  # Soft filter for past plan titles — skip known luxury phrasing for budget users.
  defp fits_financial?(_title, nil), do: true

  defp fits_financial?(title, financial) when is_binary(title) and is_map(financial) do
    lower = String.downcase(title)
    level = financial[:level] || financial["level"]

    luxuryish? =
      Regex.match?(~r/\b(tasting|michelin|omakase|fine dining|caviar)\b/i, lower)

    cond do
      level in ["budget", "moderate"] and luxuryish? -> false
      true -> true
    end
  end

  defp fits_financial?(_, _), do: true

  defp render_coordinate(entities, context) do
    _action = entity(entities, :action) || "message"
    person = entity(entities, :person) || "them"
    content = entity(entities, :content) || "that"
    business? = relationship_type_for_person(context, person) == "business"

    case coordination_path(context, person) do
      # Log-only queue is not delivery — never promise "I'll message/draft/send".
      {:ok, :queued} ->
        if business? do
          "I drafted a professional note for #{person} about #{content} — outbound send isn't live yet. Want to send it yourself?"
        else
          "I drafted a note for #{person} about #{content} — outbound send isn't live yet. Want to send it yourself?"
        end

      :unavailable ->
        if business? do
          "I can't reach #{person} directly yet — but I've drafted a professional message. Want to send it yourself?"
        else
          "I can't reach #{person} directly yet — but I've drafted the message. Want to send it yourself?"
        end
    end
  end

  defp intimate_relationship?(context, for_who) do
    names = List.wrap(for_who)

    Enum.any?(names, fn name ->
      relationship_type_for_person(context, name) in ["spouse", "partner"]
    end)
  end

  defp relationship_type_for_person(context, person) when is_binary(person) do
    contacts = get_in_ctx(context, [:social, :frequent_contacts]) || []
    rels = get_in_ctx(context, [:relationships]) || %{}
    person_l = String.downcase(person)

    match =
      Enum.find(contacts, fn c ->
        name = contact_name(c) || ""
        String.contains?(String.downcase(name), person_l) or
          String.contains?(person_l, String.downcase(first_name(name)))
      end)

    case contact_user_id(match) do
      nil ->
        nil

      id ->
        Map.get(rels, id) || Map.get(rels, to_string(id))
    end
  end

  defp relationship_type_for_person(_, _), do: nil

  defp coordination_path(context, person) do
    contacts = get_in_ctx(context, [:social, :frequent_contacts]) || []
    person_l = String.downcase(to_string(person || ""))

    match =
      Enum.find(contacts, fn c ->
        name = contact_name(c) || ""
        String.contains?(String.downcase(name), person_l) or
          String.contains?(person_l, String.downcase(first_name(name)))
      end)

    user_id = contact_user_id(match)

    cond do
      is_nil(match) or is_nil(user_id) ->
        :unavailable

      DeviceTokens.list_active(user_id) != [] ->
        # Queue only — do not send notifications in OC-4.
        Logger.info("opal_center.coordinate_queued person=#{person} user_id=#{user_id}")
        {:ok, :queued}

      true ->
        # Known contact but no push/SMS path yet — honest draft.
        :unavailable
    end
  end

  defp render_check_status(_entities, context) do
    celebrations = get_in_ctx(context, [:temporal, :upcoming_celebrations]) || []
    plans = get_in_ctx(context, [:temporal, :recent_plans]) || []

    celeb_bits =
      celebrations
      |> Enum.take(3)
      |> Enum.map(&format_celebration/1)
      |> Enum.reject(&is_nil/1)

    plan_bits =
      plans
      |> Enum.take(3)
      |> Enum.map(&format_plan_status/1)
      |> Enum.reject(&is_nil/1)

    cond do
      celeb_bits == [] and plan_bits == [] ->
        "Nothing on the calendar right now. Enjoy the quiet — or want to plan something?"

      true ->
        parts = celeb_bits ++ plan_bits
        "Here's what's coming up: #{Enum.join(parts, "; ")}"
    end
  end

  defp render_chat(_entities, context, intent_map) do
    raw =
      intent_map[:raw_text] || intent_map["raw_text"] ||
        get_in_ctx(context, [:message, :text]) || ""

    lower = String.downcase(raw)
    name = get_in_ctx(context, [:user, :display_name])

    # Repair #11 — an explicit new direction this turn (new search, switch_topic,
    # new chat) clears the sticky re-engagement so it cannot override the turn.
    recent_who =
      if new_direction_this_turn?(raw) do
        nil
      else
        recent_mentioned_name(context)
      end

    cond do
      how_are_you?(lower) ->
        "I'm here and paying attention. What can I help with?"

      greeting?(lower) ->
        if is_binary(name) and name != "" do
          "Hey #{first_name(name)}. What's on your mind?"
        else
          "Hey. What's on your mind?"
        end

      short_affirmation?(lower) ->
        "Got it — what should we do next?"

      thanks?(lower) ->
        "Anytime. I'm here when you need me."

      # Capability / help questions win over sticky recent_who re-engagement.
      capability_question?(lower) ->
        "I can help you plan what's next, check what's coming up on your Graph, find places, and keep plans with people you care about. What do you want to do?"

      # Repair #13 (W4-6) — "remind me to X" has no reminder execution path in
      # Center. Say so honestly instead of the "Tell me more" dead-end.
      remind_request?(lower) ->
        "I can't set reminders yet — want me to help you plan it instead?"

      # Repair #13 (W4-4b) — the sticky "You mentioned X earlier" re-engagement
      # must not hijack a direct question. A question-shaped turn (has "?" or
      # opens with a question word) gets a real answer attempt, never the
      # sticky nudge.
      is_binary(recent_who) and recent_who != "" and not question_shaped?(lower) ->
        "You mentioned #{recent_who} earlier — want to keep going on that, or something new?"

      String.length(String.trim(raw)) <= 2 ->
        if is_binary(name) and name != "" do
          "Hey #{first_name(name)}. Want to plan something or check what's coming up?"
        else
          "Want to plan something or check what's coming up?"
        end

      true ->
        # Pass 2 memory advertising locked — offer plan / status only.
        "Tell me more — I can help you plan or check what's coming up."
    end
  end

  defp short_affirmation?(lower) do
    Regex.match?(
      ~r/^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|all\s+right)\s*[.!?]?\s*$/i,
      lower
    )
  end

  defp thanks?(lower) do
    Regex.match?(~r/^\s*(thanks|thank\s+you|thx|ty)\b/i, lower)
  end

  # Repair #11 — explicit new-direction phrasing this turn: a fresh search, a
  # topic switch, or a new chat. The sticky recent_who re-engagement must not
  # override it.
  # Repair #12 (F12-04a): a venue/location question is actionable content — the
  # sticky branch must not fire for it even if classification missed the turn.
  defp new_direction_this_turn?(raw) when is_binary(raw) do
    PlanContextPatch.classify_conversation_act(raw) == "switch_topic" or
      Regex.match?(~r/\bnew\s+chat\b|\bstart\s+(?:a\s+)?new\s+chat\b|\bstart\s+fresh\b/i, raw) or
      not is_nil(PlanContextPatch.extract_exact_venue(raw)) or
      not is_nil(PlanContextPatch.extract_venue_question(raw))
  end

  defp new_direction_this_turn?(_), do: false

  defp capability_question?(lower) do
    Regex.match?(
      ~r/\bwhat\s+can\s+you\s+help\b|\bhow\s+can\s+you\s+help\b|\bwhat\s+(can|does)\s+(you|opal)\b|\bwhat\s+opal\s+can\s+do\b|\bremind\s+me\s+what\b.*\b(opal\s+)?(can|do)\b|\bcapabilities\b/i,
      lower
    )
  end

  # Repair #13 (W4-4b) — a direct question keeps its own answer; the sticky
  # "You mentioned X earlier" nudge must not fire for it.
  defp question_shaped?(lower) when is_binary(lower) do
    String.contains?(lower, "?") or
      Regex.match?(
        ~r/^\s*(who|what|when|where|why|how|which|whom|whose|is|are|was|were|do|does|did|can|could|will|would|should|have|has)\b/i,
        lower
      )
  end

  defp question_shaped?(_), do: false

  # Repair #13 (W4-6) — "remind me to <task>" is a reminder request. Center
  # has no reminder execution path; this predicate routes it to the honest
  # refusal instead of the "Tell me more" dead-end.
  defp remind_request?(lower) when is_binary(lower) do
    Regex.match?(~r/\bremind\s+me\s+to\b/i, lower)
  end

  defp remind_request?(_), do: false

  defp recent_mentioned_name(context) do
    history = get_in_ctx(context, [:conversation_history]) || []
    known =
      (get_in_ctx(context, [:social, :frequent_contacts]) || [])
      |> Enum.map(fn c -> c[:display_name] || c["display_name"] end)
      |> Enum.filter(&(is_binary(&1) and &1 != ""))
      |> Enum.map(&first_name/1)

    history
    |> Enum.reverse()
    |> Enum.find_value(fn turn ->
      body = turn[:body] || turn["body"] || ""
      role = turn[:role] || turn["role"]

      if role in ["user", :user] and is_binary(body) do
        down = String.downcase(body)

        Enum.find(known, fn name ->
          is_binary(name) and name != "" and
            String.contains?(down, String.downcase(name))
        end)
      else
        nil
      end
    end)
  end

  # --- helpers ---------------------------------------------------------------

  defp intent_key(%{intent: i}) when is_atom(i), do: i
  defp intent_key(%{"intent" => i}) when is_atom(i), do: i

  defp intent_key(%{"intent" => i}) when is_binary(i) do
    try do
      String.to_existing_atom(i)
    rescue
      ArgumentError -> :chat
    end
  end

  defp intent_key(_), do: nil

  defp entities_map(%{entities: e}) when is_map(e), do: e
  defp entities_map(%{"entities" => e}) when is_map(e), do: e
  defp entities_map(_), do: %{}

  defp solo_turn?(ents, raw) when is_map(ents) do
    ents[:solo] == true or ents["solo"] == true or
      OpalCore.Center.PlanContextPatch.solo_intent?(raw || "") or
      (is_binary(raw) and Regex.match?(~r/\bjust for me\b/i, raw))
  end

  defp solo_turn?(_, raw), do: OpalCore.Center.PlanContextPatch.solo_intent?(raw || "")

  defp entity(map, key) when is_atom(key) do
    Map.get(map, key) || Map.get(map, Atom.to_string(key))
  end

  defp get_in_ctx(map, [k | rest]) when is_map(map) do
    next = Map.get(map, k) || Map.get(map, to_string(k))
    if rest == [], do: next, else: get_in_ctx(next || %{}, rest)
  end

  defp get_in_ctx(_, _), do: nil

  defp format_with_who(nil), do: ""
  defp format_with_who([]), do: ""

  defp format_with_who(who) when is_list(who) do
    names = Enum.map(who, &to_string/1) |> Enum.reject(&(&1 == ""))

    case names do
      [] -> ""
      list -> " with " <> Enum.join(list, " and ")
    end
  end

  defp format_with_who(who) when is_binary(who), do: " with #{who}"
  defp format_with_who(_), do: ""

  defp format_who_label(nil), do: "their"
  defp format_who_label([]), do: "their"

  defp format_who_label(who) when is_list(who) do
    case Enum.map(who, &to_string/1) |> Enum.reject(&(&1 == "")) do
      [] -> "their"
      [one] -> one
      list -> Enum.join(list, " and ")
    end
  end

  defp format_who_label(who) when is_binary(who), do: who
  defp format_who_label(_), do: "their"

  defp plan_title(%{title: t}), do: t
  defp plan_title(%{"title" => t}), do: t
  defp plan_title(_), do: nil

  defp format_celebration(c) do
    name = c[:name] || c["name"]
    days = c[:days_until] || c["days_until"]
    idea = c[:top_idea] || c["top_idea"]
    kind = c[:kind] || c["kind"] || "birthday"

    base =
      cond do
        is_binary(name) and is_integer(days) ->
          "#{name}'s #{kind} in #{days} days"

        is_binary(name) ->
          name

        true ->
          nil
      end

    cond do
      is_nil(base) ->
        nil

      is_binary(idea) and idea != "" ->
        "#{base} — #{first_name(name)} would love #{downcase_idea(idea)}. Want me to set it up?"

      true ->
        base
    end
  end

  defp downcase_idea(<<first::utf8, rest::binary>>),
    do: String.downcase(<<first::utf8>>) <> rest

  defp downcase_idea(s), do: s

  defp format_plan_status(p) do
    title = plan_title(p)

    if is_binary(title) and title != "" do
      "#{title} (tentative)"
    else
      nil
    end
  end

  defp contact_name(%{display_name: n}), do: n
  defp contact_name(%{"display_name" => n}), do: n
  defp contact_name(_), do: nil

  defp contact_user_id(%{user_id: id}), do: id
  defp contact_user_id(%{"user_id" => id}), do: id
  defp contact_user_id(_), do: nil

  defp first_name(nil), do: ""

  defp first_name(name) when is_binary(name) do
    name |> String.trim() |> String.split(~r/\s+/) |> List.first() || name
  end

  defp greeting?(lower) do
    Regex.match?(~r/^\s*(hi|hey|hello|yo|good\s+(morning|afternoon|evening))\b/i, lower)
  end

  defp how_are_you?(lower) do
    Regex.match?(~r/\bhow\s+are\s+you\b|\bhow's\s+it\s+going\b|\bhow\s+are\s+things\b/i, lower)
  end

  defp maybe_append(parts, nil), do: parts
  defp maybe_append(parts, ""), do: parts
  defp maybe_append(parts, bit), do: parts ++ [bit]

  defp clamp_sentences(text) do
    parts =
      text
      |> String.split(~r/(?<=[.!?])\s+/, trim: true)
      |> Enum.take(3)

    Enum.join(parts, " ")
  end

  defp render_oracle(entities, context, intent_map) do
    user_id = get_in_ctx(context, [:user, :id])
    question =
      entity(entities, :question) ||
        intent_map[:raw_text] || intent_map["raw_text"] ||
        get_in_ctx(context, [:message, :text]) || ""

    if is_binary(user_id) and question != "" do
      case Oracle.answer(user_id, question, context) do
        {:ok, %{text: text}} when is_binary(text) and text != "" ->
          text

        :not_oracle ->
          "Tell me more — I can help with plans, people, or what's coming up."

        _ ->
          "I couldn't pull that up just now. Try again in a moment."
      end
    else
      "Tell me more — I can help with plans, people, or what's coming up."
    end
  end


end
