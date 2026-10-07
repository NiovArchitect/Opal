defmodule OpalCore.Intelligence.Extractor do
  @moduledoc """
  Synchronous intent / entity / vibe extraction for intelligence events.

  Rule-based first pass (<500ms). Auditable — every extraction stores source event_id.
  """

  alias OpalCore.Intelligence.{Event, Extraction}
  alias OpalCore.Repo
  alias OpalCore.Trips.VibeProfiles

  @confirm ~r/\b(yes|yeah|yep|yup|sure|sounds good|i'?m in\b|im in\b|locked in|perfect|works for me|^down$)\b/i
  @cancel ~r/\b(can'?t make it|cannot make it|cancel|rain check|i'?m out|sitting out)\b/i
  @counter ~r/\b(after\s+\d{1,2}|before\s+\d{1,2}|works better|feels better|rather|instead|later|earlier|move (it|to))\b/i
  @question ~r/\b(what time|where|when|which|who'?s|how about)\b|\?/i
  @propose ~r/\b(let'?s|dinner|lunch|brunch|hike|market|coffee|saturday|sunday|tonight|tomorrow)\b/i
  @chitchat ~r/^(lol+|haha+|nice|cool|ok+|kk|👍|😂|❤️|🔥)\.?$/iu
  @info_share ~r/\b(lights? are on|vibe|sunset|golden hour|looks? (good|amazing)|photo|rooftop)\b/i

  @doc "Extract from a persisted intelligence event. Returns {:ok, extraction}."
  def extract(%Event{type: type} = event) when type in ["message.sent", "message.received"] do
    t0 = System.monotonic_time(:millisecond)
    body = get_in(event.payload, ["body"]) || get_in(event.payload, ["transcript"]) || ""
    {intent, entities, vibe} = classify_message(body)
    persist(event, intent, entities, vibe, t0)
  end

  def extract(%Event{type: "rsvp.changed"} = event) do
    t0 = System.monotonic_time(:millisecond)
    new_state = get_in(event.payload, ["new_state"])
    intent = "reaction." <> if(new_state in ["in", "interested"], do: "positive", else: "negative")
    entities = %{"activity_id" => event.payload["activity_id"], "state" => new_state}
    vibe = vibe_from_rsvp(event.payload)
    {:ok, extraction} = persist(event, intent, entities, vibe, t0)
    _ = maybe_learn_vibe_from_rsvp(event, vibe)
    {:ok, extraction}
  end

  def extract(%Event{} = event) do
    t0 = System.monotonic_time(:millisecond)
    persist(event, "chitchat", %{}, %{"sentiment" => "neutral", "energy" => "medium"}, t0)
  end

  def extract(_), do: {:error, :invalid_event}

  @doc "Pure classify for tests / Maya examples."
  def classify_message(body) when is_binary(body) do
    text = String.trim(body)
    lower = String.downcase(text)

    intent =
      cond do
        text == "" -> "chitchat"
        Regex.match?(@chitchat, text) -> "chitchat"
        Regex.match?(@cancel, lower) -> "plan.cancel"
        Regex.match?(@counter, lower) -> "plan.counter"
        Regex.match?(@confirm, lower) and String.length(text) < 80 -> "plan.confirm"
        Regex.match?(@question, lower) -> "plan.question"
        Regex.match?(@info_share, lower) -> "info.share"
        Regex.match?(@propose, lower) -> "plan.propose"
        true -> "chitchat"
      end

    entities = %{
      "time" => extract_time(lower),
      "place" => extract_place(text),
      "activity" => extract_activity(lower),
      "person" => extract_person(text)
    }

    vibe = %{
      "sentiment" => sentiment(lower, intent),
      "energy" => energy(lower, intent)
    }

    {intent, entities, vibe}
  end

  def classify_message(_), do: {"chitchat", %{}, %{"sentiment" => "neutral", "energy" => "medium"}}

  defp persist(event, intent, entities, vibe, t0) do
    latency = System.monotonic_time(:millisecond) - t0

    %Extraction{}
    |> Extraction.changeset(%{
      event_id: event.id,
      intent: intent,
      entities: entities,
      vibe: vibe,
      raw: %{"source" => "rule_v1"},
      latency_ms: max(latency, 0)
    })
    |> Repo.insert()
  end

  defp extract_time(lower) do
    cond do
      m = Regex.run(~r/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/, lower) ->
        hour = parse_hour(Enum.at(m, 1), Enum.at(m, 3))
        %{"after" => hour, "fuzzy" => true}

      m = Regex.run(~r/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/, lower) ->
        hour = parse_hour(Enum.at(m, 1), Enum.at(m, 3))
        min = Enum.at(m, 2)
        %{"time" => "#{hour}:#{min}", "fuzzy" => false}

      m = Regex.run(~r/\b(\d{1,2})\s*(am|pm)\b/, lower) ->
        hour = parse_hour(Enum.at(m, 1), Enum.at(m, 2))
        %{"time" => "#{hour}:00", "fuzzy" => false}

      String.contains?(lower, "saturday") ->
        %{"day" => "saturday", "fuzzy" => true}

      String.contains?(lower, "sunday") ->
        %{"day" => "sunday", "fuzzy" => true}

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
