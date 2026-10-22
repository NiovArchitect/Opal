defmodule OpalCore.Intelligence.LlmMemoryExtract do
  @moduledoc """
  Repair #26 (F-4) — language-aware memory extraction via the scoped
  LLM path.

  The rules-based ingest legs are English-shaped: a Spanish utterance
  transcribed near-verbatim lands zero facts, commitments, or plans.
  This module closes that gap for non-English utterances by asking
  the app's LLM (via `LlmAdapter`, default provider DeepSeek) for a
  strict-JSON extraction of exactly three things the utterance itself
  states: the speaker's dislikes, the speaker's commitments, and any
  plans (with day/time normalized to a small English vocabulary so
  the existing plan-memory writers can consume them unchanged).

  ABSOLUTE LAW — nothing reaches the LLM raw: the prompt is assembled
  through the scoped context builder only
  (`PromptBuilder.build(scoped, conversation_id, text, [])` with
  `scoped = SocialMemory.for_account(account_id)`), exactly the shape
  `LlmExtract` uses (`what_you_know`). Per-account isolation is
  intact: each call runs for ONE account's own scoped context, no
  cross-account data is read or cached here, and the speaker enters
  the prompt ONLY as an account-relative role word ("self" /
  "other party") — never a name or a raw account id added by this
  module.

  Honest degradation: if the LLM is disabled/unready, the call fails,
  or the reply is not parseable strict JSON, this returns
  `{:error, reason}` and the caller extracts nothing. It never
  fabricates an extraction.
  """

  require Logger

  alias OpalCore.Intelligence.{LlmAdapter, PromptBuilder}
  alias OpalCore.SocialMemory.Scoped

  @allowed_days ~w(today tomorrow monday tuesday wednesday thursday friday saturday sunday)

  @system_prompt """
  You are Opal's memory extraction layer for non-English utterances.
  Return ONLY valid JSON — no markdown fences, no commentary — with this exact shape:
  {
    "facts": [{"object": "<verbatim phrase the speaker dislikes or cannot stand>", "kind": "dislike"}],
    "commitments": [{"text": "<verbatim commitment excerpt>"}],
    "plans": [{"activity": null, "day": null, "time_24h": null, "place": null}]
  }
  Extract ONLY what the utterance itself states. Never invent facts,
  commitments, places, or times the speaker did not state.
  """

  @task_instruction """
  Task: extract memory from the utterance in "message", spoken by the
  party identified only as "speaker_role" ("self" = the account owner,
  "other party" = the conversation partner).
  - facts: dislikes the SPEAKER expresses about themselves. Each entry:
    {"object": "<verbatim phrase the speaker dislikes or cannot stand>", "kind": "dislike"}.
  - commitments: things the SPEAKER commits to do. Each entry:
    {"text": "<verbatim commitment excerpt>"}.
  - plans: plans the utterance proposes or states. Each entry:
    {"activity": null or "<activity, verbatim>",
     "day": null or one of "today" | "tomorrow" | "monday" | "tuesday" |
            "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
     "time_24h": null or "HH:MM" in 24-hour form,
     "place": null or "<place, verbatim>"}.
    Normalize day/time words from the utterance's language into that
    vocabulary (e.g. "mañana a las seis" -> day "tomorrow",
    time_24h "18:00" — six in the evening for a social meeting; if a
    social-plan time is genuinely ambiguous, prefer the evening
    reading). Keep activity and place verbatim in the original
    language.
  - Omit nothing the utterance states; add nothing it does not.
    Return empty lists when an utterance states none of a kind.
  Return ONLY the JSON object.
  """

  @doc """
  Extract account-scoped memory from a non-English `text`.

  `scoped` must be the ingesting account's own
  `SocialMemory.for_account(account_id)` handle; a mismatched handle
  is an error, never a silent cross-account read.

  Options:
  - `:speaker` — `:self` when the speaker IS `account_id`,
    `:other` when the speaker is the other party (default `:other`).

  Returns `{:ok, %{facts: [...], commitments: [...], plans: [...]}}`
  (normalized string-keyed maps mirroring the model's JSON), or
  `{:error, reason}` when the LLM is disabled, fails, or returns
  unparseable output — the caller then extracts nothing.
  """
  def extract_account_memory(account_id, scoped, conversation_id, text, opts \\ [])

  def extract_account_memory(
        account_id,
        %Scoped{account_id: scoped_account_id} = scoped,
        conversation_id,
        text,
        opts
      )
      when is_binary(account_id) and is_binary(conversation_id) and is_binary(text) do
    speaker = Keyword.get(opts, :speaker, :other)

    cond do
      scoped_account_id != account_id ->
        {:error, :scope_mismatch}

      speaker not in [:self, :other] ->
        {:error, :invalid_speaker}

      String.trim(text) == "" ->
        {:error, :empty_text}

      true ->
        case LlmAdapter.readiness() do
          :ready -> do_extract(scoped, conversation_id, String.trim(text), speaker)
          {:disabled, reason} -> {:error, {:disabled, reason}}
        end
    end
  end

  def extract_account_memory(_, _, _, _, _), do: {:error, :invalid_args}

  defp do_extract(scoped, conversation_id, text, speaker) do
    built = PromptBuilder.build(scoped, conversation_id, text, [])

    user_payload = %{
      "message" => text,
      "speaker_role" => speaker_role_word(speaker),
      "what_you_know" => built.what_you_know,
      "task" => @task_instruction
    }

    messages = [
      %{role: "system", content: @system_prompt},
      %{role: "user", content: Jason.encode!(user_payload)}
    ]

    case LlmAdapter.chat(messages, temperature: 0.1, response_format: %{type: "json_object"}) do
      {:ok, %{content: content}} ->
        parse_memory(content)

      {:disabled, _} ->
        {:error, :disabled}

      {:error, reason} ->
        Logger.info("llm.memory_extract_api_failed reason=#{inspect(reason)}")
        {:error, reason}
    end
  rescue
    e ->
      Logger.info("llm.memory_extract_failed error=#{Exception.message(e)}")
      {:error, :prompt_build_failed}
  end

  # The speaker enters the prompt ONLY as this account-relative role
  # word — never a name or a raw account id.
  defp speaker_role_word(:self), do: "self"
  defp speaker_role_word(:other), do: "other party"

  defp parse_memory(content) when is_binary(content) do
    cleaned =
      content
      |> String.trim()
      |> String.replace(~r/^```(?:json)?\s*/i, "")
      |> String.replace(~r/\s*```$/, "")
      |> String.trim()

    with {:ok, map} when is_map(map) <- Jason.decode(cleaned),
         {:ok, facts} <- normalize_facts(map["facts"]),
         {:ok, commitments} <- normalize_commitments(map["commitments"]),
         {:ok, plans} <- normalize_plans(map["plans"]) do
      {:ok, %{facts: facts, commitments: commitments, plans: plans}}
    else
      _ -> {:error, :invalid_json}
    end
  end

  defp parse_memory(_), do: {:error, :invalid_json}

  # All keys optional/absent -> empty lists. A present-but-non-list
  # collection is a shape violation, not an empty extraction.
  defp normalize_facts(nil), do: {:ok, []}

  defp normalize_facts(list) when is_list(list) do
    facts =
      Enum.flat_map(list, fn
        %{"object" => object} = entry when is_binary(object) ->
          object = String.trim(object)
          kind = entry["kind"]

          if object != "" and (is_nil(kind) or kind == "dislike") do
            [%{"object" => object, "kind" => "dislike"}]
          else
            []
          end

        _ ->
          []
      end)

    {:ok, facts}
  end

  defp normalize_facts(_), do: :error

  defp normalize_commitments(nil), do: {:ok, []}

  defp normalize_commitments(list) when is_list(list) do
    commitments =
      Enum.flat_map(list, fn
        %{"text" => text} when is_binary(text) ->
          if String.trim(text) != "", do: [%{"text" => text}], else: []

        _ ->
          []
      end)

    {:ok, commitments}
  end

  defp normalize_commitments(_), do: :error

  defp normalize_plans(nil), do: {:ok, []}

  defp normalize_plans(list) when is_list(list) do
    plans =
      Enum.flat_map(list, fn
        entry when is_map(entry) ->
          [
            %{
              "activity" => normalize_optional_text(entry["activity"]),
              "day" => normalize_day(entry["day"]),
              "time_24h" => normalize_time(entry["time_24h"]),
              "place" => normalize_optional_text(entry["place"])
            }
          ]

        _ ->
          []
      end)

    {:ok, plans}
  end

  defp normalize_plans(_), do: :error

  defp normalize_optional_text(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      trimmed -> trimmed
    end
  end

  defp normalize_optional_text(_), do: nil

  defp normalize_day(value) when is_binary(value) do
    day = value |> String.trim() |> String.downcase()
    if day in @allowed_days, do: day, else: nil
  end

  defp normalize_day(_), do: nil

  defp normalize_time(value) when is_binary(value) do
    case Regex.run(~r/^(\d{1,2}):(\d{2})$/, String.trim(value)) do
      [_, hh, mm] ->
        hour = String.to_integer(hh)
        minute = String.to_integer(mm)

        if hour in 0..23 and minute in 0..59 do
          "#{String.pad_leading(Integer.to_string(hour), 2, "0")}:#{mm}"
        end

      _ ->
        nil
    end
  end

  defp normalize_time(_), do: nil
end
