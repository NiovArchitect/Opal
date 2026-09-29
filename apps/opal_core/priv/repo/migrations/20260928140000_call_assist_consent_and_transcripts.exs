defmodule OpalCore.Repo.Migrations.CallAssistConsentAndTranscripts do
  use Ecto.Migration

  def change do
    create table(:call_assist_consents, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :call_id, references(:call_sessions, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :allowed, :boolean, null: false, default: false
      add :allowed_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec
      add :source, :string, null: false, default: "call_surface"

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:call_assist_consents, [:call_id, :user_id])

    create table(:call_transcript_segments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :call_id, references(:call_sessions, type: :binary_id, on_delete: :delete_all), null: false
      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :nilify_all)
      add :speaker_user_id, references(:users, type: :binary_id, on_delete: :nilify_all), null: false
      add :sequence, :integer, null: false, default: 0
      add :started_at, :utc_datetime_usec
      add :ended_at, :utc_datetime_usec
      add :text, :text, null: false, default: ""
      add :final, :boolean, null: false, default: false
      add :confidence, :float
      add :language, :string
      add :provider, :string, null: false, default: "deepgram"
      add :provider_segment_id, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:call_transcript_segments, [:call_id, :provider_segment_id])
  end
end
