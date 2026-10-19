defmodule OpalCore.VoiceNotes do
  @moduledoc """
  ST-H (Repair #18 adoption wave 3) - voice notes in threads.

  A voice note is a real message whose audio lives in the existing
  voice AudioStore (the same store TTS speak uses - it already carries
  audio truthfully: owner-scoped keys, signed expiring share URLs,
  audio content types). The message hint carries the storage key, and
  Message.to_contract/1 mints a fresh signed URL on every read, so
  every participant plays the identical stored audio.

  Transcript leg: ONLY the real Deepgram batch path
  (DeepgramClient.transcribe_batch/2). When Deepgram is configured its
  actual output is stored as the message body. When it is not
  configured - or the provider call fails - the note still sends as
  audio with NO transcript: body stays empty and no transcript claim
  is made anywhere. There is no canned or caller-supplied transcript
  path.

  Correction: the sender may correct the stored transcript; the
  corrected text replaces the body - the single stored transcript
  every later read (and any ingestion reading the message) sees. The
  raw provider guess is not kept as a second copy.
  """

  alias OpalCore.Intelligence.DeepgramClient
  alias OpalCore.Messages
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo
  alias OpalCore.Voice.AudioStore

  @doc """
  Store the audio and persist the voice-note message.

  opts: `:content_type` (default "audio/webm"), `:duration_ms`,
  `:client_message_id`.
  """
  def send_note(conversation_id, sender_id, audio, opts \\ [])
      when is_binary(conversation_id) and is_binary(sender_id) and is_binary(audio) do
    content_type = Keyword.get(opts, :content_type, "audio/webm")

    with {:ok, stored} <-
           AudioStore.put(sender_id, audio, %{content_type: content_type}),
         {:ok, %Message{} = message, origin} <-
           persist(stored, conversation_id, sender_id, opts, transcribe(audio, content_type)) do
      {:ok,
       %{
         message: message,
         origin: origin,
         transcript: transcript_of(message),
         transcription_state: transcription_state(message)
       }}
    end
  end

  def send_note(_, _, _, _), do: {:error, :invalid_attrs}

  @doc "The stored transcript, or nil when the note carries none."
  def transcript_of(%Message{body: body}) when is_binary(body) and body != "", do: body
  def transcript_of(_), do: nil

  @doc """
  Sender-only transcript correction. The corrected text becomes the
  message body - the one stored transcript.
  """
  def correct_transcript(message_id, sender_id, text)
      when is_binary(message_id) and is_binary(sender_id) and is_binary(text) do
    case Repo.get(Message, message_id) do
      %Message{message_type: "voice_note", sender_user_id: ^sender_id} = message ->
        message
        |> Ecto.Changeset.change(body: String.trim(text))
        |> Repo.update()
        |> case do
          {:ok, updated} -> {:ok, updated}
          {:error, _} = err -> err
        end

      %Message{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def correct_transcript(_, _, _), do: {:error, :invalid}

  # The real Deepgram batch path, or an honest no-transcript state.
  defp transcribe(audio, content_type) do
    if DeepgramClient.configured?() do
      case DeepgramClient.transcribe_batch(audio, content_type: content_type) do
        {:ok, dg} -> {:transcribed, dg.transcript || "", dg.confidence}
        _ -> :unavailable
      end
    else
      :unavailable
    end
  end

  defp persist(stored, conversation_id, sender_id, opts, transcription) do
    {body, confidence} =
      case transcription do
        {:transcribed, text, conf} -> {text, conf}
        :unavailable -> {"", nil}
      end

    hint =
      Jason.encode!(%{
        "sk" => stored["storage_key"],
        "vn" => true,
        "mime" => stored["mime_type"],
        "duration_ms" => Keyword.get(opts, :duration_ms),
        "transcription_confidence" => confidence
      })

    Messages.accept_message(%{
      conversation_id: conversation_id,
      sender_user_id: sender_id,
      client_message_id:
        Keyword.get(opts, :client_message_id) ||
          "voicenote-#{System.unique_integer([:positive])}",
      message_type: "voice_note",
      body: body,
      source_language: hint
    })
  end

  defp transcription_state(%Message{body: body}) when is_binary(body) and body != "",
    do: "transcribed"

  defp transcription_state(_), do: "none"
end
