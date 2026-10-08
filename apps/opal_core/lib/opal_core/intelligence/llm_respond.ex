defmodule OpalCore.Intelligence.LlmRespond do
  @moduledoc """
  Draft Opal's in-thread reply via LLM. Templates remain the floor.

  On disable/API failure returns `{:disabled, _}` / `{:error, _}` so the
  Reasoner keeps the template message and logs `llm_unavailable_using_templates`.
  Never synthesizes fake model text.
  """

  require Logger

  alias OpalCore.Intelligence.LlmAdapter

  alias OpalCore.Intelligence.PromptBuilder
  alias OpalCore.SocialMemory

  @system_prompt """
  You are Opal. You know this user's social world (see 'What you know'). Use it naturally —
  reference shared history, notice conflicts, follow up on open loops — but never recite it
  like a database. Never reveal information about people who aren't part of this conversation.
  If you notice a conflict with another plan, mention it helpfully, not alarmingly.
  Be warm, brief, and specific. Never sound like a bot. Never mention you are AI.
  Never invent people, places, times, or trip details that are not in the context.
  Prefer one or two short sentences. No markdown. No emoji spam.
  """

  @doc """
  Draft a reply from conversation + extraction + relationship context.

  `conversation_context` keys (atoms or strings):
  - `:recent_messages` — [%{role, content}, ...] or plain strings
  - `:intent`, `:entities`, `:vibe`
  - `:plan_label`, `:current_time_label`, `:participants`
  - `:relationship` — short blurb (who this person is)
  - `:vibe_profile` — optional sleep_bias / notes
  - `:template_message` — existing template floor (shown to model as guidance)
  - `:action` — pipeline action (plan.confirm, respond.thread, …)

  Returns `{:ok, %{content, usage, source: "llm"}}` | `{:disabled, _}` | `{:error, _}`.
  """
  def generate_response(conversation_context, opts \\ [])

  def generate_response(conversation_context, opts) when is_map(conversation_context) do
    case LlmAdapter.readiness() do
      :ready ->
        do_generate(conversation_context, opts)

      {:disabled, _} ->
        {:disabled, "LLM not configured"}
    end
  end

  def generate_response(_, _), do: {:error, :invalid_context}

  @doc """
  Draft with honest template floor. Returns `{text, source}` where source is
  `"llm"` or `"template"`. Never invents model text on disable/error.
  """
  def draft_or_template(conversation_context, opts \\ [])

  def draft_or_template(conversation_context, opts) when is_map(conversation_context) do
    template =
      conversation_context[:template_message] || conversation_context["template_message"] || ""

    case generate_response(conversation_context, opts) do
      {:ok, %{content: text}} when is_binary(text) ->
        trimmed = String.trim(text)

        if trimmed == "" do
          {template, "template"}
        else
          {trimmed, "llm"}
        end

      _ ->
        {template, "template"}
    end
  end

  def draft_or_template(_, _), do: {"", "template"}

  defp do_generate(ctx, opts) do
    temperature = Keyword.get(opts, :temperature, 0.5)
    what = memory_section(ctx)
    extra_instruction = ctx[:instruction] || ctx["instruction"]

    base_instruction =
      "Draft Opal's next message only. Stay faithful to context. " <>
        "If action is escalate/clarify, ask one concrete clarifying question. " <>
        "If action is plan.confirm, confirm warmly with specific plan details when present."

    instruction =
      if is_binary(extra_instruction) and String.trim(extra_instruction) != "" do
        base_instruction <> " " <> String.trim(extra_instruction)
      else
        base_instruction
      end

    user_payload = %{
      "action" => ctx[:action] || ctx["action"],
      "intent" => ctx[:intent] || ctx["intent"],
      "entities" => ctx[:entities] || ctx["entities"] || %{},
      "vibe" => ctx[:vibe] || ctx["vibe"] || %{},
      "plan_label" => ctx[:plan_label] || ctx["plan_label"],
      "current_time_label" => ctx[:current_time_label] || ctx["current_time_label"],
      "participants" => ctx[:participants] || ctx["participants"],
      "relationship" => ctx[:relationship] || ctx["relationship"],
      "vibe_profile" => ctx[:vibe_profile] || ctx["vibe_profile"],
      "template_floor" => ctx[:template_message] || ctx["template_message"],
      "what_you_know" => what,
      "recent_messages" => normalize_recent(ctx[:recent_messages] || ctx["recent_messages"] || []),
      "instruction" => instruction
    }

    messages = [
      %{role: "system", content: @system_prompt},
      %{role: "user", content: Jason.encode!(user_payload)}
    ]

    case LlmAdapter.chat(messages, temperature: temperature) do
      {:ok, %{content: content, usage: usage}} ->
        text = content |> String.trim() |> strip_quotes()

        if text == "" do
          {:error, :empty_content}
        else
          {:ok, %{content: text, usage: usage, source: "llm"}}
        end

      other ->
        other
    end
  end

  defp normalize_recent(list) when is_list(list) do
    Enum.map(list, fn
      %{role: r, content: c} -> %{"role" => to_string(r), "content" => to_string(c)}
      %{"role" => r, "content" => c} -> %{"role" => to_string(r), "content" => to_string(c)}
      bin when is_binary(bin) -> %{"role" => "user", "content" => bin}
      other -> %{"role" => "user", "content" => inspect(other)}
    end)
    # Cap history to control cost / prompt size
    |> Enum.take(-12)
  end

  defp normalize_recent(_), do: []

  defp strip_quotes(text) do
    cond do
      String.starts_with?(text, "\"") and String.ends_with?(text, "\"") ->
        String.slice(text, 1..-2//1)

      String.starts_with?(text, "'") and String.ends_with?(text, "'") ->
        String.slice(text, 1..-2//1)

      true ->
        text
    end
  end

  defp memory_section(ctx) do
    account_id = ctx[:account_id] || ctx["account_id"]
    conversation_id = ctx[:conversation_id] || ctx["conversation_id"]
    text = ctx[:template_message] || ""

    cond do
      not SocialMemory.enabled?() ->
        nil

      not is_binary(account_id) or not is_binary(conversation_id) ->
        nil

      true ->
        scoped = SocialMemory.for_account(account_id)
        PromptBuilder.build(scoped, conversation_id, text, []).what_you_know
    end
  rescue
    _ -> nil
  end
end
