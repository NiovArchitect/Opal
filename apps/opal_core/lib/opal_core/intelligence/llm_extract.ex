defmodule OpalCore.Intelligence.LlmExtract do
  @moduledoc """
  Structured extraction via LLM with strict JSON + rules fallback.

  Path tags (stored on Extraction.raw["source"]):
  - `llm` — model returned parseable JSON with confidence >= 0.6
  - `llm_fallback` — model attempted but parse/confidence failed → rules used
  - `rules` — LLM disabled / not configured → rules only
  """

  require Logger

  alias OpalCore.Intelligence.{LlmAdapter, PromptBuilder}
  alias OpalCore.SocialMemory

  @confidence_floor 0.6

  @system_prompt """
  You are Opal's understanding layer. Extract structured meaning from social messages.
  Return ONLY valid JSON with this exact shape:
  {
    "intent": "plan.propose | plan.confirm | plan.counter | plan.cancel | plan.question | info.share | chitchat | clarify | booking_request | set_reminder | life_event",
    "entities": {
      "people": [],
      "places": [],
      "times": [],
      "activities": [],
      "booking_type": null,
      "booking_ambiguous": false,
      "task": null,
      "life_event_type": null
    },
    "vibe": "excited | hesitant | positive | negative | neutral",
    "confidence": 0.0,
    "potential_conflict": false,
    "resolved_references": {}
  }
  Rules:
  - Return ONLY valid JSON. No markdown fences. No commentary.
  - Never invent people, places, or times not mentioned in the message.
  - Use intent "clarify" when the message is ambiguous (e.g. "maybe") and Opal should ask before acting.
  - Use intent "booking_request" only for clear travel/dining/activity booking asks
    (flight|hotel|restaurant|activity). Set entities.booking_type accordingly.
  - Ambiguous booking asks ("book something", "can you book for me") → intent "clarify"
    with entities.booking_ambiguous: true. Do not guess a booking_type.
  - Non-bookings: "book club", "book report" are NOT booking_request.
  - Use intent "set_reminder" for "remind me …" / "set a reminder …". Put the task in
    entities.task and time phrases in entities.times (e.g. "Thursday", "in 2 hours").
  - Use intent "life_event" for user-told milestones ("Maya just got engaged"). Set
    entities.life_event_type (engagement|married|new_child|new_job|moved) and people.
  - confidence is 0.0–1.0 reflecting extraction certainty.
  - Use the 'What you know' context to resolve ambiguous references ('him' = the person discussed,
    'Saturday' = check against known plans for conflicts). If the message conflicts with a known plan,
    set potential_conflict: true. Put pronoun/ambiguous resolutions in resolved_references.
  """

  @doc """
  Extract structured meaning from `text`.

  Returns:
  - `{:ok, %{intent, entities, vibe, confidence, source: "llm", usage}}`
  - `{:fallback, reason}` — caller should run rules and tag `llm_fallback`
  - `{:disabled, "LLM not configured"}` — caller should run rules and tag `rules`
  """
  def extract_with_llm(text, context \\ %{})

  def extract_with_llm(text, context) when is_binary(text) do
    if PromptBuilder.simple_message?(text) do
      Logger.info("intelligence.tier=simple path=rules_skip_llm")
      {:disabled, "LLM not configured"}
    else
      case LlmAdapter.readiness() do
        :ready ->
          do_extract(String.trim(text), context)

        {:disabled, _} ->
          {:disabled, "LLM not configured"}
      end
    end
  end

  def extract_with_llm(_, _), do: {:fallback, :invalid_text}

  defp do_extract(text, context) do
    {what, tier} = memory_section(context, text)

    user_payload = %{
      "message" => text,
      "context" => sanitize_context(context),
      "what_you_know" => what
    }

    Logger.info("intelligence.tier=#{tier} path=llm_extract")

    messages = [
      %{role: "system", content: @system_prompt},
      %{role: "user", content: Jason.encode!(user_payload)}
    ]

    case LlmAdapter.chat(messages, temperature: 0.1, response_format: %{type: "json_object"}) do
      {:ok, %{content: content, usage: usage}} ->
        case parse_extraction(content) do
          {:ok, parsed} ->
            conf = parsed.confidence

            if conf >= @confidence_floor do
              {:ok,
               parsed
               |> Map.put(:usage, usage)
               |> Map.put(:source, "llm")}
            else
              Logger.info("llm.extract_low_confidence confidence=#{conf} path=llm_fallback")
              {:fallback, :low_confidence}
            end

          {:error, reason} ->
            Logger.info("llm.extract_parse_failed reason=#{inspect(reason)} path=llm_fallback")
            {:fallback, reason}
        end

      {:disabled, _} = dis ->
        dis

      {:error, reason} ->
        Logger.info("llm.extract_api_failed reason=#{inspect(reason)} path=llm_fallback")
        {:fallback, reason}
    end
  end

  defp parse_extraction(content) when is_binary(content) do
    cleaned =
      content
      |> String.trim()
      |> String.replace(~r/^```(?:json)?\s*/i, "")
      |> String.replace(~r/\s*```$/, "")
      |> String.trim()

    with {:ok, map} <- Jason.decode(cleaned),
         true <- is_map(map) do
      intent = normalize_intent(map["intent"])
      entities = normalize_entities(map["entities"] || %{})
      vibe = normalize_vibe(map["vibe"])
      confidence = normalize_confidence(map["confidence"])

      if intent do
        {:ok,
         %{
           intent: intent,
           entities: entities,
           vibe: vibe,
           confidence: confidence,
           potential_conflict: map["potential_conflict"] == true,
           resolved_references: map["resolved_references"] || %{}
         }}
      else
        {:error, :unknown_intent}
      end
    else
      _ -> {:error, :invalid_json}
    end
  end

  defp parse_extraction(_), do: {:error, :invalid_json}

  defp memory_section(context, text) do
    account_id = context[:account_id] || context["account_id"]
    conversation_id = context[:conversation_id] || context["conversation_id"]

    cond do
      not SocialMemory.enabled?() ->
        {nil, :standard}

      not is_binary(account_id) or not is_binary(conversation_id) ->
        {nil, PromptBuilder.tier_for(text, %{})}

      true ->
        scoped = SocialMemory.for_account(account_id)
        built = PromptBuilder.build(scoped, conversation_id, text, [])
        {built.what_you_know, built.tier}
    end
  rescue
    _ -> {nil, :standard}
  end

  defp normalize_intent(nil), do: nil

  defp normalize_intent(raw) when is_binary(raw) do
    key =
      raw
      |> String.trim()
      |> String.downcase()
      |> String.replace("-", ".")
      |> String.replace("_", ".")

    case key do
      "plan.propose" -> "plan.propose"
      "plan.proposal" -> "plan.propose"
      "plan_proposal" -> "plan.propose"
      "plan.confirm" -> "plan.confirm"
      "plan_confirm" -> "plan.confirm"
      "plan.counter" -> "plan.counter"
      "plan_counter" -> "plan.counter"
      "plan.cancel" -> "plan.cancel"
      "plan_cancel" -> "plan.cancel"
      "plan.question" -> "plan.question"
      "question" -> "plan.question"
      "info.share" -> "info.share"
      "info_share" -> "info.share"
      "chitchat" -> "chitchat"
      "clarify" -> "clarify"
      "ambiguous" -> "clarify"
      "uncertain" -> "clarify"
      "booking.request" -> "booking_request"
      "booking_request" -> "booking_request"
      "booking" -> "booking_request"
      "set.reminder" -> "set_reminder"
      "set_reminder" -> "set_reminder"
      "reminder" -> "set_reminder"
      "life.event" -> "life_event"
      "life_event" -> "life_event"
      _ -> nil
    end
  end

  defp normalize_intent(_), do: nil

  defp normalize_entities(entities) when is_map(entities) do
    people = list_or_empty(entities["people"] || entities["person"])
    places = list_or_empty(entities["places"] || entities["place"])
    times = list_or_empty(entities["times"] || entities["time"])
    activities = list_or_empty(entities["activities"] || entities["activity"])
    booking_type = normalize_booking_type(entities["booking_type"])
    booking_ambiguous = entities["booking_ambiguous"] in [true, "true", 1, "1"]

    base = %{
      "people" => people,
      "places" => places,
      "times" => times,
      "activities" => activities,
      # Compat with rule-based singular keys used by Reasoner
      "person" => List.first(people),
      "place" => List.first(places),
      "activity" => List.first(activities),
      "time" => time_entity(times)
    }

    base
    |> then(fn m -> if booking_type, do: Map.put(m, "booking_type", booking_type), else: m end)
    |> then(fn m -> if booking_ambiguous, do: Map.put(m, "booking_ambiguous", true), else: m end)
  end

  defp normalize_entities(_), do: %{"people" => [], "places" => [], "times" => [], "activities" => []}

  defp normalize_booking_type(nil), do: nil

  defp normalize_booking_type(raw) when is_binary(raw) do
    key = raw |> String.trim() |> String.downcase()

    cond do
      key in ~w(flight hotel restaurant activity) -> key
      key in ~w(flights airfare) -> "flight"
      key in ~w(hotels lodging stay) -> "hotel"
      key in ~w(restaurants table dinner) -> "restaurant"
      key in ~w(activities tickets tour) -> "activity"
      true -> nil
    end
  end

  defp normalize_booking_type(_), do: nil

  defp list_or_empty(list) when is_list(list),
    do: Enum.map(list, &to_string/1) |> Enum.map(&String.trim/1) |> Enum.reject(&(&1 == ""))

  defp list_or_empty(bin) when is_binary(bin) and bin != "", do: [bin]
  defp list_or_empty(_), do: []

  defp time_entity([]), do: nil

  defp time_entity([first | _] = times) when is_binary(first) do
    lower = String.downcase(first)

    cond do
      String.contains?(lower, "saturday") -> %{"day" => "saturday", "fuzzy" => true, "raw" => times}
      String.contains?(lower, "sunday") -> %{"day" => "sunday", "fuzzy" => true, "raw" => times}
      m = Regex.run(~r/after\s+(\d{1,2})/i, lower) -> %{"after" => Enum.at(m, 1), "fuzzy" => true, "raw" => times}
      true -> %{"label" => first, "fuzzy" => true, "raw" => times}
    end
  end

  defp time_entity(_), do: nil

  defp normalize_vibe(v) when is_binary(v) do
    s = String.downcase(String.trim(v))

    sentiment =
      cond do
        s in ["excited", "positive", "happy"] -> if(s == "excited", do: "excited", else: "positive")
        s in ["hesitant", "uncertain"] -> "hesitant"
        s in ["negative", "sad", "annoyed"] -> "negative"
        true -> "neutral"
      end

    energy =
      cond do
        sentiment == "excited" -> "high"
        sentiment in ["hesitant", "negative"] -> "low"
        true -> "medium"
      end

    %{"sentiment" => sentiment, "energy" => energy}
  end

  defp normalize_vibe(v) when is_map(v) do
    %{
      "sentiment" => to_string(v["sentiment"] || v[:sentiment] || "neutral"),
      "energy" => to_string(v["energy"] || v[:energy] || "medium")
    }
  end

  defp normalize_vibe(_), do: %{"sentiment" => "neutral", "energy" => "medium"}

  defp normalize_confidence(n) when is_number(n), do: max(0.0, min(1.0, n / 1.0))

  defp normalize_confidence(bin) when is_binary(bin) do
    case Float.parse(bin) do
      {n, _} -> normalize_confidence(n)
      :error -> 0.0
    end
  end

  defp normalize_confidence(_), do: 0.0

  defp sanitize_context(context) when is_map(context) do
    %{
      "plan_label" => context[:plan_label] || context["plan_label"],
      "current_time_label" => context[:current_time_label] || context["current_time_label"],
      "participants" => context[:participants] || context["participants"]
    }
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
  end

  defp sanitize_context(_), do: %{}
end
