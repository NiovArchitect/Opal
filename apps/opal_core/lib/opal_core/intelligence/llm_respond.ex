defmodule OpalCore.Intelligence.LlmRespond do
  @moduledoc """
  Draft Opal's in-thread reply via LLM. Templates remain the floor.

  On disable/API failure returns `{:disabled, _}` / `{:error, _}` so the
  Reasoner keeps the template message and logs `llm_unavailable_using_templates`.
  Never synthesizes fake model text.
  """

  require Logger

  alias OpalCore.Intelligence.LlmAdapter

  @system_prompt """
  You are Opal, a socially brilliant friend who helps people align on plans.
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

  defp do_generate(ctx, opts) do
    temperature = Keyword.get(opts, :temperature, 0.5)

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
      "recent_messages" => normalize_recent(ctx[:recent_messages] || ctx["recent_messages"] || []),
      "instruction" =>
        "Draft Opal's next message only. Stay faithful to context. " <>
          "If action is escalate/clarify, ask one concrete clarifying question. " <>
          "If action is plan.confirm, confirm warmly with specific plan details when present."
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
end
