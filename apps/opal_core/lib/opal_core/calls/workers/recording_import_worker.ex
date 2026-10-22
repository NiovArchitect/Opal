defmodule OpalCore.Calls.Workers.RecordingImportWorker do
  @moduledoc """
  Repair #25 — runs one imported recording through the real
  extraction pipeline:

  1. read the stored audio,
  2. transcribe it with the REAL Deepgram batch path — via
     `OpalCore.Intelligence.CallTranscription`, the same post-call
     machinery in-app calls use, whose consent lookup reads the
     `AssistConsent` rows the import door recorded from the
     attestation (no override is passed, ever),
  3. fold the diarized segments into per-party memory
     (`RecordingImports.fold/4`),
  4. land the import in `done` — or in `failed` with the true
     reason. An unconfigured Deepgram is a failure state with the
     words "transcription not configured", never a fabricated
     transcript (BS-4 law).

  max_attempts is 1: a failed import stays failed and visible; a
  re-import of the same bytes by the same uploader returns the
  existing row at the door. Segment persistence is idempotent
  (provider_segment_id), so a manual re-run cannot double-fold.
  """

  use Oban.Worker, queue: :imports, max_attempts: 1

  require Logger

  alias OpalCore.Calls.{AudioDecode, RecordingImport, RecordingImports, RecordingStore}
  alias OpalCore.Intelligence.CallTranscription
  alias OpalCore.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"import_id" => import_id}}) do
    case Repo.get(RecordingImport, import_id) do
      nil ->
        :ok

      %RecordingImport{status: status} when status in ["done", "failed"] ->
        :ok

      %RecordingImport{} = row ->
        run(row)
    end
  end

  def perform(_), do: :ok

  defp run(row) do
    {:ok, row} = RecordingImports.begin_transcription(row)

    with {:ok, audio} <- RecordingStore.read(row.storage_key),
         {:ok, audio, content_type} <- decode(row, audio),
         {:ok, call} <- fetch_call(row),
         {:ok, result} <- transcribe(row, audio, content_type) do
      {:ok, row} =
        RecordingImports.begin_fold(row, %{
          provider: "deepgram",
          confidence: result.confidence
        })

      {:ok, fold_meta} =
        RecordingImports.fold(row, call, result.segments, result.confidence)

      {:ok, _row} = RecordingImports.complete(row, fold_meta)
      :ok
    else
      {:error, reason} ->
        message = if is_binary(reason), do: reason, else: inspect(reason)
        {:ok, _} = RecordingImports.fail(row, message)
        :ok
    end
  end

  # Repair #26 (F-1) — Deepgram diarizes MP3/M4A imports to a single
  # speaker but splits WAV cleanly, so non-WAV audio is decoded to
  # WAV server-side before transcription. WAV uploads pass through
  # `AudioDecode.to_wav/2` unchanged and never touch a decoder. The
  # stored original file is NEVER replaced: only the in-memory
  # binary handed to transcription (and its content type) changes.
  # A decode failure fails the import honestly with the true reason.
  defp decode(row, audio) do
    case AudioDecode.to_wav(audio, row.content_type) do
      {:ok, wav} ->
        {:ok, wav, "audio/wav"}

      {:error, reason} ->
        Logger.warning(
          "recording_import.audio_decode_failed import=#{row.id} reason=#{inspect(reason)}"
        )

        {:error, "audio_decode_failed: #{inspect(reason)}"}
    end
  end

  defp fetch_call(%RecordingImport{call_id: call_id}) do
    case Repo.get(OpalCore.Calls.CallSession, call_id) do
      nil -> {:error, "call_record_missing"}
      call -> {:ok, call}
    end
  end

  defp transcribe(row, audio, content_type) do
    attrs = %{
      call_id: row.call_id,
      recording_audio: audio,
      content_type: content_type,
      language: row.language,
      participant_ids: RecordingImport.participant_ids(row),
      conversation_id: row.conversation_id
    }

    case CallTranscription.after_call_ended(attrs) do
      {:ok, %{transcribed: true, segments: segments, confidence: confidence}} ->
        {:ok, %{segments: segments, confidence: confidence}}

      {:ok, %{transcribed: false, reason: :no_consent}} ->
        {:error, "consent_missing"}

      {:ok, %{transcribed: false, reason: reason}} ->
        {:error, "not_transcribed: #{inspect(reason)}"}

      {:disabled, reason} ->
        {:error, "transcription_not_configured: #{reason}"}

      {:error, reason} ->
        {:error, "transcription_failed: #{inspect(reason)}"}

      other ->
        {:error, "transcription_failed: #{inspect(other)}"}
    end
  end
end
