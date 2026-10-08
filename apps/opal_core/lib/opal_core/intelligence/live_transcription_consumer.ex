defmodule OpalCore.Intelligence.LiveTranscriptionConsumer do
  @moduledoc """
  Live call transcription consumer (Paste B Phase 4).

  Gates:
  - No `DEEPGRAM_API_KEY` → `{:disabled, :api_key_missing}` (honest; never stubs live).
  - Consent via `AssistConsent` — both parties must allow for shared transcription;
    this consumer only surfaces nudges to the **caller**.
  - SDP/ICE stay on CallChannel — never Outbox/Kafka.
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Calls.AssistConsent
  alias OpalCore.Events.Publisher
  alias OpalCore.Intelligence.DeepgramClient
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.Repo

  @doc "Readiness for live transcription. Never fakes ready without a key."
  def readiness do
    if DeepgramClient.configured?() do
      {:ready, :deepgram}
    else
      {:disabled, :api_key_missing}
    end
  end

  @doc """
  Consume a live final transcript segment for a call.

  Returns:
  - `{:disabled, reason}` when Deepgram key missing
  - `{:error, :no_consent}` when AssistConsent not active for caller
  - `{:ok, :pushed}` when caller-only push enqueued
  - `{:ok, :skipped}` when nothing actionable
  """
  def consume_final(attrs) when is_map(attrs) do
    case readiness() do
      {:disabled, reason} ->
        {:disabled, reason}

      {:ready, _} ->
        do_consume(attrs)
    end
  end

  def consume_final(_), do: {:error, :invalid}

  defp do_consume(attrs) do
    call_id = attrs[:call_id] || attrs["call_id"]
    caller_user_id = attrs[:caller_user_id] || attrs["caller_user_id"]
    text = attrs[:text] || attrs["text"] || ""
    commitment? = attrs[:looks_like_commitment] || attrs["looks_like_commitment"] || false

    cond do
      not is_binary(call_id) or not is_binary(caller_user_id) ->
        {:error, :invalid}

      not consent_allowed?(call_id, caller_user_id) ->
        Logger.info("live_transcription.skip reason=no_consent call=#{call_id}")
        {:error, :no_consent}

      commitment? and String.trim(text) != "" ->
        push_caller_only(caller_user_id, call_id, text)

      true ->
        {:ok, :skipped}
    end
  end

  defp consent_allowed?(call_id, user_id) do
    from(c in AssistConsent,
      where: c.call_id == ^call_id and c.user_id == ^user_id and c.allowed == true and is_nil(c.revoked_at)
    )
    |> Repo.exists?()
  end

  defp push_caller_only(caller_user_id, call_id, text) do
    summary = text |> String.trim() |> String.slice(0, 120)

    event_id = "live_tx:#{call_id}:#{:erlang.phash2(summary)}"

    _ =
      Publisher.record(%{
        event_type: "action.live_transcription_nudge",
        event_id: event_id,
        aggregate_type: "call",
        aggregate_id: call_id,
        partition_key: caller_user_id,
        privacy_class: "private_authorized",
        purpose: "caller_transcript_nudge",
        payload: %{
          "account_id" => caller_user_id,
          "call_id" => call_id,
          "suggested_summary" => summary,
          "schema_version" => 1
        }
      })

    _ =
      DeliverPushWorker.enqueue(
        caller_user_id,
        "Opal heard a commitment",
        summary,
        %{"type" => "live_transcription_nudge", "call_id" => call_id}
      )

    Logger.info("live_transcription.pushed caller=#{caller_user_id} call=#{call_id}")
    {:ok, :pushed}
  end
end
