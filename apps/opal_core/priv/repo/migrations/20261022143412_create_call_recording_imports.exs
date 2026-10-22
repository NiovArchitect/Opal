defmodule OpalCore.Repo.Migrations.CreateCallRecordingImports do
  @moduledoc """
  Repair #25 — imported call recordings.

  One row per imported recording: provenance (source is always
  `imported_recording`), the consent attestation recorded at the
  door, pipeline status with truthful failure reasons, and per-leg
  timing stamps so end-to-end extraction latency is measured from
  stored data, not vibes. Additive only.
  """
  use Ecto.Migration

  def change do
    create table(:call_recording_imports, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :uploader_user_id, :binary_id, null: false
      add :call_id, :binary_id
      add :conversation_id, :binary_id

      # %{"0" => user_id, "1" => user_id} — diarized speaker index to
      # the declared participant, as attested at import time.
      add :speaker_map, :map, null: false, default: %{}

      add :status, :string, null: false, default: "received"
      add :failure_reason, :string

      add :storage_key, :string, null: false
      add :original_filename, :string
      add :content_type, :string, null: false
      add :byte_size, :integer, null: false
      add :sha256, :string, null: false
      add :language, :string, null: false, default: "en-US"

      # Consent lineage for this import: who attested, when, on what basis.
      add :consent_attested_by_user_id, :binary_id, null: false
      add :consent_attested_at, :utc_datetime_usec, null: false
      add :consent_basis, :string, null: false

      add :provider, :string
      add :confidence, :float
      add :segment_count, :integer, null: false, default: 0
      add :unattributed_segment_count, :integer, null: false, default: 0
      add :capsule_ids, :map, null: false, default: %{}

      add :transcription_started_at, :utc_datetime_usec
      add :transcribed_at, :utc_datetime_usec
      add :folded_at, :utc_datetime_usec
      add :transcription_ms, :integer
      add :fold_ms, :integer
      add :total_ms, :integer

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:call_recording_imports, [:uploader_user_id, :sha256],
             name: :call_recording_imports_uploader_sha_index
           )

    create index(:call_recording_imports, [:call_id])
    create index(:call_recording_imports, [:uploader_user_id, :inserted_at])
  end
end
