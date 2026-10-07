defmodule OpalCore.Intelligence.AudioIngestor do
  @moduledoc """
  Voice message → Deepgram transcript → intelligence pipeline.

  Persists a `voice_transcript` chat message (body = transcript text humans + Opal read),
  writes a `message.received` intelligence event with audio metadata, then runs
  Extractor → Reasoner → Executor unchanged.

  Low transcription confidence (< #{OpalCore.Intelligence.DeepgramClient.confidence_floor()})
  sets `transcription_uncertain: true` so the Reasoner escalates instead of acting boldly.
  """

  require Logger

  alias OpalCore.Intelligence.{DeepgramClient, EventIngestor, Pipeline}
  alias OpalCore.Messages
  alias OpalCore.Messaging.Message

  @doc """
  Ingest a voice note.

  opts:
  - `:content_type` (default audio/webm)
  - `:audio_url` (optional stored URL)
  - `:duration_ms`
  - `:client_message_id`
  - `:stub_transcript` / `:stub_confidence` (tests)
  """
  def ingest_voice_message(audio, conversation_id, sender_id, opts \\ [])
      when is_binary(audio) and is_binary(conversation_id) and is_binary(sender_id) do
    dg_opts =
      opts
      |> Keyword.take([:content_type, :stub_transcript, :stub_confidence])

    with {:ok, dg} <- DeepgramClient.transcribe_batch(audio, dg_opts),
         uncertain? <- DeepgramClient.uncertain?(dg.confidence),
         {:ok, %Message{} = message, origin} <- persist_message(dg, conversation_id, sender_id, opts),
         {:ok, event} <-
           ingest_event(dg, message, conversation_id, sender_id, uncertain?, opts),
         {:ok, chain} <- run_pipeline(message, event, uncertain?) do
      {:ok,
       %{
         message: message,
         origin: origin,
         event: event,
         transcript: dg.transcript,
         confidence: dg.confidence,
         stub: dg.stub == true,
         transcription_uncertain: uncertain?,
         chain: chain
       }}
    else
      {:error, _} = err -> err
      other -> {:error, other}
    end
  end

  def ingest_voice_message(_, _, _, _), do: {:error, :invalid_attrs}

  defp persist_message(dg, conversation_id, sender_id, opts) do
    client_id =
      Keyword.get(opts, :client_message_id) ||
        "voice-#{System.unique_integer([:positive])}"

    audio_url = Keyword.get(opts, :audio_url)
    duration_ms = Keyword.get(opts, :duration_ms)

    # Body is the transcript — extraction + humans read the same text.
    # media fields carried via source_language tag + body prefix when URL present
    # until a dedicated media column lands; FE also gets them on the API response.
    body = dg.transcript || ""

    attrs = %{
      conversation_id: conversation_id,
      sender_user_id: sender_id,
      client_message_id: client_id,
      message_type: "voice_transcript",
      body: body,
      source_language: encode_media_hint(audio_url, duration_ms, dg)
    }

    Messages.accept_message(attrs)
  end

  defp encode_media_hint(audio_url, duration_ms, dg) do
    Jason.encode!(%{
      "audio_url" => audio_url,
      "duration_ms" => duration_ms,
      "transcription_confidence" => dg.confidence,
      "stub" => dg.stub == true
    })
  rescue
    _ -> nil
  end

  defp ingest_event(dg, message, conversation_id, sender_id, uncertain?, opts) do
    EventIngestor.ingest(%{
      type: "message.received",
      actor_id: sender_id,
      conversation_id: conversation_id,
      idempotency_key: "message.received:voice:#{message.id}",
      payload: %{
        "message_id" => message.id,
        "body" => dg.transcript,
        "transcript" => dg.transcript,
        "audio_url" => Keyword.get(opts, :audio_url),
        "transcription_confidence" => dg.confidence,
        "transcription_uncertain" => uncertain?,
        "stub" => dg.stub == true,
        "segments" => dg.segments,
        "message_type" => "voice_transcript"
      }
    })
  end

  defp run_pipeline(message, event, uncertain?) do
    context = %{
      "conversation_id" => message.conversation_id,
      :conversation_id => message.conversation_id,
      :transcription_uncertain => uncertain?,
      "transcription_uncertain" => uncertain?
    }

    # Reuse message pipeline path: treat as message.sent for Extractor classify,
    # but prefer the message.received event body already stored.
    case Pipeline.on_message_created(message, context) do
      {:ok, _} = ok -> ok
      {:error, _} = err ->
        Logger.warning("audio_ingestor.pipeline_failed event=#{event.id} err=#{inspect(err)}")
        err
    end
  end
end
