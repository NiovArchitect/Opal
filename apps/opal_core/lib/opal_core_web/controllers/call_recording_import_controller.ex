defmodule OpalCoreWeb.CallRecordingImportController do
  @moduledoc """
  Repair #25 — HTTP door for imported call recordings.

  POST /api/v1/product/call-recording-imports (multipart):
  - `file` — the recording (wav/mp3/m4a/webm/ogg)
  - `speaker_user_ids` — JSON array of exactly two participant user
    ids in diarized-speaker order (speaker 0, speaker 1). The
    uploader must be one of them.
  - `consent_attested` — must be "true"; `consent_basis` — the
    attestation's basis. No attestation, no import: the refusal
    happens before a single byte is stored.

  GET one import (participants/uploader only) returns its truthful
  pipeline status and, once folded, the persisted transcript
  segments. Status also streams over PubSub
  (`call_import:<id>`, `call_imports:<user_id>`) — the door itself
  never needs polling to be truthful.
  """
  use OpalCoreWeb, :controller

  alias OpalCore.Calls.RecordingImport
  alias OpalCore.Calls.RecordingImports

  def index(conn, _params) do
    imports =
      conn.assigns.current_user_id
      |> RecordingImports.list_for_user()
      |> Enum.map(&RecordingImport.to_contract/1)

    json(conn, %{"imports" => imports})
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    with {:ok, audio, upload} <- read_upload(params),
         {:ok, speakers} <- decode_speakers(params) do
      attrs = %{
        speaker_user_ids: speakers,
        consent_attested: params["consent_attested"],
        consent_basis: params["consent_basis"],
        content_type: upload.content_type,
        original_filename: upload.filename,
        language: params["language"] || "en-US"
      }

      case RecordingImports.import_recording(user_id, audio, attrs) do
        {:ok, row, origin} ->
          conn
          |> put_status(201)
          |> json(%{"import" => RecordingImport.to_contract(row), "origin" => to_string(origin)})

        {:error, reason} ->
          create_error(conn, reason)
      end
    else
      {:error, reason} -> create_error(conn, reason)
    end
  end

  def show(conn, %{"id" => id}) do
    case RecordingImports.get_for(id, conn.assigns.current_user_id) do
      {:ok, row} ->
        json(conn, %{
          "import" => RecordingImport.to_contract(row),
          "segments" => RecordingImports.segments_for(row)
        })

      {:error, :not_found} ->
        error(conn, 404, "not_found", "Recording import not found")
    end
  end

  defp read_upload(%{"file" => %Plug.Upload{} = upload}) do
    case File.read(upload.path) do
      {:ok, audio} -> {:ok, audio, upload}
      {:error, _} -> {:error, :unreadable_upload}
    end
  end

  defp read_upload(_), do: {:error, :file_required}

  defp decode_speakers(%{"speaker_user_ids" => raw}) when is_list(raw), do: {:ok, raw}

  defp decode_speakers(%{"speaker_user_ids" => raw}) when is_binary(raw) do
    case Jason.decode(raw) do
      {:ok, list} when is_list(list) -> {:ok, list}
      _ -> {:error, :invalid_speakers}
    end
  end

  defp decode_speakers(_), do: {:error, :invalid_speakers}

  defp create_error(conn, reason) do
    case reason do
      :consent_attestation_required ->
        error(
          conn,
          422,
          "consent_attestation_required",
          "Import refused: consent attestation is required"
        )

      :consent_basis_required ->
        error(
          conn,
          422,
          "consent_basis_required",
          "Import refused: state the consent basis for this recording"
        )

      :uploader_not_participant ->
        error(
          conn,
          403,
          "uploader_not_participant",
          "You can only import recordings of calls you participated in"
        )

      :exactly_two_participants_required ->
        error(
          conn,
          422,
          "exactly_two_participants_required",
          "Declare exactly two participants, in speaker order"
        )

      :participants_must_differ ->
        error(conn, 422, "participants_must_differ", "The two participants must differ")

      :unknown_participant ->
        error(conn, 422, "unknown_participant", "A declared participant is not an account")

      :unsupported_format ->
        error(
          conn,
          415,
          "unsupported_format",
          "Recording format not supported by this door (wav, mp3, m4a, webm, ogg)"
        )

      :empty_audio ->
        error(conn, 422, "empty_audio", "The recording is empty")

      :recording_too_large ->
        error(conn, 413, "recording_too_large", "That recording is too large for this door")

      :file_required ->
        error(conn, 422, "file_required", "Attach the recording file")

      :unreadable_upload ->
        error(conn, 422, "unreadable_upload", "The uploaded file could not be read")

      :invalid_speakers ->
        error(
          conn,
          422,
          "invalid_speakers",
          "speaker_user_ids must be a JSON array of two user ids"
        )

      other ->
        error(conn, 422, "import_failed", inspect(other))
    end
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{
      "error_code" => code,
      "message" => message,
      "error" => %{"code" => code, "message" => message}
    })
  end
end
