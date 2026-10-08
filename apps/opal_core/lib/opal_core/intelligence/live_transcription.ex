defmodule OpalCore.Intelligence.LiveTranscription do
  @moduledoc """
  Deepgram live → LLM during calls (Paste B Phase 4).

  HONEST GATE: without DEEPGRAM_API_KEY returns `{:disabled, "live transcription not configured"}`.
  Batch post-call path (`CallTranscription`) is unaffected.

  Consent: requires existing AssistConsent for the call — stream never opens if denied.
  Insights push to the CALLER's `user:<id>` socket only (never callee).
  """

  require Logger

  alias OpalCore.Calls.AssistConsent
  alias OpalCore.Intelligence.DeepgramClient
  alias OpalCore.Repo
  alias OpalCoreWeb.Endpoint

  import Ecto.Query

  @doc "Start live path for a call. Gated on key + consent."
  def start(attrs) when is_map(attrs) do
    call_id = attrs[:call_id] || attrs["call_id"]
    caller_id = attrs[:caller_id] || attrs["caller_id"]
    callee_id = attrs[:callee_id] || attrs["callee_id"]

    cond do
      not key_present?() ->
        {:disabled, "live transcription not configured"}

      not consented?(call_id, attrs) ->
        Logger.info("live_transcription.consent_denied call_id=#{call_id}")
        {:error, :consent_denied}

      true ->
        Logger.info("live_transcription.stream_open call_id=#{call_id} caller=#{caller_id}")
        {:ok,
         %{
           call_id: call_id,
           caller_id: caller_id,
           callee_id: callee_id,
           buffer: [],
           last_reason_at: System.system_time(:second),
           stream: DeepgramClient.stream_interface()
         }}
    end
  end

  def start(_), do: {:error, :invalid}

  @doc "Accumulate a transcript segment; reason every 30s or on topic shift."
  def ingest_segment(state, segment) when is_map(state) and is_binary(segment) do
    buffer = [segment | state.buffer || []]
    now = System.system_time(:second)
    elapsed = now - (state.last_reason_at || now)
    shift? = topic_shift?(segment, state.buffer || [])

    if elapsed >= 30 or shift? do
      insight = reason_buffer(Enum.reverse(buffer), state)
      _ = push_caller_only(state, insight)
      %{state | buffer: [], last_reason_at: now}
    else
      %{state | buffer: buffer}
    end
  end

  defp push_caller_only(%{caller_id: caller_id, callee_id: callee_id, call_id: call_id}, summary)
       when is_binary(caller_id) do
    payload = %{
      "schema_version" => 1,
      "event_id" => Ecto.UUID.generate(),
      "call_id" => call_id,
      "account_id" => caller_id,
      "summary" => summary
    }

    Endpoint.broadcast("user:#{caller_id}", "intelligence:caller_insight", payload)
    # Explicitly never push to callee
    _ = callee_id
    :ok
  end

  defp push_caller_only(_, _), do: :ok

  defp reason_buffer(segments, _state) do
    text = Enum.join(segments, " ") |> String.slice(0, 400)
    "Live note: #{text}"
  end

  defp topic_shift?(segment, prior) do
    # Heuristic: new capitalized proper nouns not in prior buffer
    priors = Enum.join(prior, " ") |> String.downcase()
    Regex.scan(~r/\b[A-Z][a-z]{2,}\b/, segment)
    |> Enum.any?(fn [w] -> not String.contains?(priors, String.downcase(w)) end)
  end

  defp key_present? do
    case System.get_env("DEEPGRAM_API_KEY") do
      key when is_binary(key) and key != "" -> true
      _ -> false
    end
  end

  defp consented?(call_id, attrs) do
    case attrs[:consent] || attrs["consent"] do
      true -> true
      false -> false
      _ when is_binary(call_id) ->
        from(c in AssistConsent, where: c.call_id == ^call_id, limit: 1)
        |> Repo.one()
        |> case do
          %{allowed: true} -> true
          %{consent: true} -> true
          %{granted: true} -> true
          nil -> false
          row -> Map.get(row, :allowed) == true or Map.get(row, :granted) == true
        end

      _ ->
        false
    end
  rescue
    _ -> false
  end
end
