defmodule OpalCore.Intelligence.Reasoner do
  @moduledoc """
  Decide what Opal should do from extraction + context.

  Confidence < 0.7 → escalate.user (suggestion, never autonomous action).
  Every decision stores reason string for "Opal noticed…" + audit.

  When LLM is ready, `LlmRespond.generate_response/2` may replace the
  user-facing message draft. Templates remain the floor on disable/API failure
  (`llm_unavailable_using_templates`). The LLM proposes; guardrails dispose.
  """

  require Logger

  alias OpalCore.Intelligence.{Decision, Event, Extraction, LlmRespond}
  alias OpalCore.Repo
  alias OpalCore.Trips.VibeProfiles

  @confidence_floor 0.7

  @doc """
  Reason over an event + extraction. Optional context map:
  - :plan_label, :current_time_label, :participants, :recent_messages, :relationship
  """
  def reason(event, extraction, context \\ %{})

  def reason(%Event{} = event, %Extraction{} = extraction, context) when is_map(context) do
    {action, payload, confidence, reason} = decide(event, extraction, context)

    uncertain? =
      get_in(event.payload, ["transcription_uncertain"]) == true or
        Map.get(context, :transcription_uncertain) == true or
        Map.get(context, "transcription_uncertain") == true

    {action, payload, confidence, reason} =
      cond do
        uncertain? and action not in ["silent", "escalate.user"] ->
          {"escalate.user",
           Map.merge(payload, %{
             "suggested_action" => action,
             "suggestion" => "I didn't catch that clearly — want to confirm?",
             "transcription_uncertain" => true
           }), min(confidence, 0.45),
           reason <> " Transcription uncertain — asking for clarification instead of acting."}

        confidence < @confidence_floor and action not in ["silent", "escalate.user"] ->
          {"escalate.user",
           Map.merge(payload, %{
             "suggested_action" => action,
             "suggestion" => suggestion_copy(action, payload)
           }), confidence, reason <> " Confidence below #{@confidence_floor} — escalating to user."}

        true ->
          {action, payload, confidence, reason}
      end

    {action, payload, confidence, reason} =
      maybe_llm_draft(event, extraction, context, action, payload, confidence, reason)

    %Decision{}
    |> Decision.changeset(%{
      event_id: event.id,
      extraction_id: extraction.id,
      action: action,
      reason: reason,
      confidence: confidence,
      payload: payload,
      context_snapshot: stringify(context)
    })
    |> Repo.insert()
  end

  def reason(_, _, _), do: {:error, :invalid_input}

  defp decide(%Event{type: "message.sent"} = event, %Extraction{} = x, context) do
    body = get_in(event.payload, ["body"]) || ""
    intent = x.intent
    time = get_in(x.entities, ["time"])
    vibe_hint = sleep_bias_hint(event.actor_id)

    case intent do
      "chitchat" ->
        {"silent", %{}, 0.95, "Chitchat — no Opal action needed."}

      "plan.confirm" ->
        {"plan.confirm",
         %{
           "message" => "Locked in!",
           "body" => body
         }, 0.92,
         "User confirmed (plan.confirm). Locking the current proposal and acknowledging in-thread."}

      "plan.counter" ->
        adjusted = adjust_from_counter(time, context)

        {"respond.thread",
         %{
           "message" => adjusted.message,
           "plan_update" => adjusted.plan_update
         }, adjusted.confidence, adjusted.reason}

      "plan.cancel" ->
        {"plan.cancel", %{"message" => "Got it — I'll release this one."}, 0.85,
         "User cancelled (plan.cancel). Releasing plan commitment."}

      "plan.propose" ->
        {"respond.thread",
         %{
           "message" => "I can hold that — want me to float it to the group?"
         }, 0.72,
         "User proposed a plan (plan.propose). Offering to help without over-committing."}

      "plan.question" ->
        {"respond.thread",
         %{"message" => context[:plan_label] || "I'll pull the latest details."}, 0.75,
         "Plan question — answering from current context."}

      "info.share" ->
        {"silent", %{"vibe_note" => true}, 0.8,
         "Info share / vibe signal — record quietly, no thread noise."}

      "clarify" ->
        {"escalate.user",
         %{
           "message" => "Want me to hold that, or are you still deciding?",
           "suggestion" => "Want me to hold that, or are you still deciding?"
         }, 0.55,
         "Ambiguous / clarify intent — ask before acting."}

      "reaction.positive" ->
        {"silent", %{}, 0.9, "Positive reaction — strengthen pattern via feedback later."}

      "reaction.negative" ->
        {"suggest.alternative", %{"message" => "Want a different option?"}, 0.7,
         "Negative reaction — offer alternative without forcing."}

      _ ->
        {"silent", %{}, 0.6, "Unrecognized intent — stay quiet."}
    end
    |> then(fn {a, p, c, r} ->
      r2 =
        if vibe_hint do
          r <> " " <> vibe_hint
        else
          r
        end

      {a, p, c, r2}
    end)
  end

  defp decide(%Event{type: "rsvp.changed"} = event, %Extraction{}, _context) do
    new_state = event.payload["new_state"]
    old_state = event.payload["old_state"]
    venue = event.payload["venue_name"] || "the activity"

    case new_state do
      "in" ->
        {"silent", %{}, 0.9,
         "RSVP in on #{venue} (was #{old_state || "unset"}). Learn vibe; no thread spam."}

      "passed" ->
        {"silent", %{}, 0.85,
         "RSVP passed on #{venue}. Record as negative preference signal for feedback."}

      _ ->
        {"silent", %{}, 0.8, "RSVP #{new_state} on #{venue}."}
    end
  end

  defp decide(_, _, _), do: {"silent", %{}, 0.5, "No rule matched — silent."}

  defp adjust_from_counter(%{"after" => hour} = time, context) when is_binary(hour) do
    # Maya example: after 10 → 10:30 market, honor constraint
    label = context[:plan_label] || context["plan_label"] || "the plan"
    current = context[:current_time_label] || context["current_time_label"] || "earlier"

    %{
      message:
        "Got it — after #{hour} works better. I'll hold #{label} for 10:30 so it honors that.",
      plan_update: %{"time_label" => "10:30", "constraint" => time},
      confidence: 0.88,
      reason:
        "Counter-proposed after #{hour} (plan.counter). Current proposal was #{current}. " <>
          "Adjusting to 10:30 to honor the constraint. Confidence: high."
    }
  end

  defp adjust_from_counter(time, context) when is_map(time) do
    label = context[:plan_label] || "the plan"

    %{
      message: "Noted — I'll reshape #{label} around that timing.",
      plan_update: %{"constraint" => time},
      confidence: 0.74,
      reason: "plan.counter with time entity #{inspect(time)}. Adjusting softly."
    }
  end

  defp adjust_from_counter(_, context) do
    label = context[:plan_label] || "the plan"

    %{
      message: "Want me to move #{label}?",
      plan_update: %{},
      confidence: 0.65,
      reason: "plan.counter without clear time entity — escalate-friendly."
    }
  end

  defp suggestion_copy("respond.thread", %{"message" => msg}), do: msg
  defp suggestion_copy(_, _), do: "Want me to take the next step?"

  defp maybe_llm_draft(event, extraction, context, action, payload, confidence, reason) do
    if action in ["silent"] do
      {action, payload, confidence, reason}
    else
      template =
        payload["message"] || payload["suggestion"] || suggestion_copy(action, payload)

      draft_ctx = %{
        action: action,
        intent: extraction.intent,
        entities: extraction.entities || %{},
        vibe: extraction.vibe || %{},
        plan_label: context[:plan_label] || context["plan_label"],
        current_time_label: context[:current_time_label] || context["current_time_label"],
        participants: context[:participants] || context["participants"],
        relationship: context[:relationship] || context["relationship"],
        vibe_profile: context[:vibe_profile] || context["vibe_profile"],
        account_id: context[:account_id] || context["account_id"] || event.actor_id,
        conversation_id: event.conversation_id || context[:conversation_id] || context["conversation_id"],
        template_message: template,
        recent_messages:
          context[:recent_messages] || context["recent_messages"] ||
            [%{role: "user", content: get_in(event.payload, ["body"]) || ""}]
      }

      case LlmRespond.generate_response(draft_ctx) do
        {:ok, %{content: content, usage: usage}} ->
          Logger.info(
            "intelligence.respond_path=llm action=#{action} " <>
              "prompt_tokens=#{usage.prompt_tokens} completion_tokens=#{usage.completion_tokens}"
          )

          payload2 =
            payload
            |> Map.put("message", content)
            |> Map.put("draft_source", "llm")
            |> then(fn p ->
              if Map.has_key?(p, "suggestion"), do: Map.put(p, "suggestion", content), else: p
            end)

          {action, payload2, confidence, reason <> " LLM draft applied."}

        {:disabled, _} ->
          {action, Map.put(payload, "draft_source", "templates"), confidence, reason}

        {:error, reason_err} ->
          Logger.info(
            "llm_unavailable_using_templates action=#{action} reason=#{inspect(reason_err)}"
          )

          {action, Map.put(payload, "draft_source", "templates"), confidence,
           reason <> " llm_unavailable_using_templates."}
      end
    end
  end

  defp sleep_bias_hint(actor_id) when is_binary(actor_id) do
    case VibeProfiles.get(actor_id) do
      {:ok, %{sleep_bias: "late"}} ->
        "Actor vibe: late sleeper — prefer later windows."

      {:ok, %{sleep_bias: "early"}} ->
        "Actor vibe: early bird — prefer morning windows."

      _ ->
        nil
    end
  end

  defp sleep_bias_hint(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(_), do: %{}
end
