defmodule OpalCore.Intelligence.OnboardingCopy do
  @moduledoc """
  Draft Meet Opal / OpalWorking spoken bubbles via `LlmRespond`.

  Templates are floors. On LLM disabled/error the template is returned unchanged.
  Legal/trust will/won't promises are rejected here — they must stay deterministic FE templates.
  First-run S1 law: no em/en dash or ellipsis in customer strings (hyphen only).
  Privacy: account-scoped memory only; never uploads address books.
  """

  alias OpalCore.Intelligence.{ColdStart, LlmRespond}

  @spoken_moments ~w(
    greeting
    ask_people
    ask_more
    ask_when
    ask_vibe
    calendar_connected
    calendar_dismissed
    taste_done
    spots_ready
    message_preview
  )

  # Trust contract promises — must never be LLM-rewritten.
  @legal_moments ~w(will_send wont_calendar wont_anyone_else wont_book trust_preview_lead)

  @doc """
  Draft copy for an onboarding moment.

  attrs: `%{moment:, template:, name:, vibe:, days:, spot:, when:}` (string or atom keys)

  Returns `{:ok, %{text: binary, source: "llm"|"template"}}` | `{:error, reason}`.
  """
  def draft(account_id, attrs) when is_binary(account_id) and is_map(attrs) do
    moment = normalize_moment(attrs)
    template = attrs[:template] || attrs["template"] || ""

    cond do
      moment in @legal_moments ->
        {:error, :legal_template_only}

      moment not in @spoken_moments ->
        {:error, :unknown_moment}

      not is_binary(template) or String.trim(template) == "" ->
        {:error, :template_required}

      true ->
        do_draft(account_id, moment, String.trim(template), attrs)
    end
  end

  def draft(_, _), do: {:error, :invalid}

  defp do_draft(account_id, moment, template, attrs) do
    name = optional_bin(attrs, :name)
    vibe = optional_bin(attrs, :vibe)
    days = optional_bin(attrs, :days)
    spot = optional_bin(attrs, :spot)
    when_s = optional_bin(attrs, :when) || optional_bin(attrs, :when_label)

    maturity =
      try do
        ColdStart.maturity_prompt_instruction(account_id)
      rescue
        _ ->
          "This is a new relationship with Opal. Be warmly curious; ask short clarifying questions; do not invent history."
      end

    s1_law =
      "First-run copy law: use ASCII hyphen (-) only — never em dash, en dash, or ellipsis. " <>
        "Keep one or two short sentences. Stay faithful to the template floor facts (name, vibe, days, spot)."

    ctx = %{
      action: "onboarding.#{moment}",
      intent: moment,
      template_message: template,
      account_id: account_id,
      entities: %{
        "name" => name,
        "vibe" => vibe,
        "days" => days,
        "spot" => spot,
        "when" => when_s,
        "moment" => moment
      },
      relationship: maturity,
      instruction: s1_law <> " " <> moment_instruction(moment),
      recent_messages: []
    }

    {text, source} = LlmRespond.draft_or_template(ctx, temperature: 0.55)
    cleaned = sanitize_s1(text)

    # Empty after sanitize (e.g. rejected circle question) → template floor.
    final =
      if cleaned == "" do
        sanitize_s1(template)
      else
        cleaned
      end

    final_source = if cleaned == "" and source == "llm", do: "template", else: source
    {:ok, %{text: final, source: final_source}}
  end

  defp moment_instruction("greeting"),
    do:
      "Warm plain-spoken greeting in Opal's playful kid voice. Short. Punchy. Stay faithful to the template. " <>
        "Never invent a follow-up question. Never ask what got them thinking about their circle. " <>
        "Talk TO the user. Never greet a friend by name as if they are the user."

  defp moment_instruction("ask_more"),
    do:
      "Confirm the friend to the USER (Got Maya.). Ask whether to add anyone else or plan with them. " <>
        "Never say Hi to the friend. Never address the friend as if they are answering."

  defp moment_instruction("ask_when"),
    do: "Ask the USER when they want to see this person this week."

  defp moment_instruction("ask_vibe"),
    do:
      "Ask the USER what kind of vibe for the plan ABOUT the friend. Never greet the friend."

  defp moment_instruction("ask_people"),
    do: "Ask who they've been meaning to catch up with."

  defp moment_instruction("calendar_connected"),
    do: "Acknowledge calendar connected and propose the concrete days from the template."

  defp moment_instruction("calendar_dismissed"),
    do: "Acknowledge no calendar and propose the concrete days from the template."

  defp moment_instruction("taste_done"),
    do:
      "Narrate taste honestly. Never invent preferences (no fake Italian etc). If empty, say you'll learn."

  defp moment_instruction("spots_ready"),
    do: "Narrate that plans/spots are ready using the names from the template floor."

  defp moment_instruction("message_preview"),
    do: "Draft a short outbound SMS preview. Keep place/time/vibe facts from the template."

  defp moment_instruction(_), do: "Stay faithful to the template floor."

  defp normalize_moment(attrs) do
    raw = attrs[:moment] || attrs["moment"] || ""
    raw |> to_string() |> String.trim() |> String.downcase()
  end

  defp optional_bin(attrs, key) when is_atom(key) do
    v = attrs[key] || attrs[Atom.to_string(key)]

    cond do
      is_binary(v) and String.trim(v) != "" -> String.trim(v)
      true -> nil
    end
  end

  # Paste W3/W4: no em/en/long dashes; scrub clause-break " - "; no invented circle
  # questions; never greet the friend as if they hold the phone.
  defp sanitize_s1(text) when is_binary(text) do
    cleaned =
      text
      |> String.replace(~r/[—–―]/u, ". ")
      |> String.replace("…", ".")
      |> String.replace("...", ".")
      |> String.replace(~r/\s+-\s+/, ". ")
      |> String.replace(~r/\.\s*\./, ".")
      |> String.trim()

    cond do
      Regex.match?(~r/thinking about your circle/i, cleaned) ->
        ""

      Regex.match?(~r/\bHi\s+[A-Z][a-zA-Z'’-]{1,24}\s*,/u, cleaned) ->
        ""

      Regex.match?(~r/Thanks for sharing that,\s*[A-Z][a-zA-Z'’-]{1,24}\s*\./u, cleaned) ->
        ""

      Regex.match?(~r/\bwhat'?s the vibe you'?re picturing\b/i, cleaned) ->
        ""

      true ->
        cleaned
    end
  end

  defp sanitize_s1(other), do: to_string(other || "")
end
