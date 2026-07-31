defmodule OpalCore.Repo.Migrations.CreateSlice1Core do
  use Ecto.Migration

  def change do
    execute "CREATE EXTENSION IF NOT EXISTS pgcrypto", "DROP EXTENSION IF EXISTS pgcrypto"

    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :handle, :string, null: false
      add :display_name, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:users, [:handle])

    create table(:conversations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :label, :string, null: false
      add :next_server_seq, :bigint, null: false, default: 1

      timestamps(type: :utc_datetime_usec)
    end

    create table(:conversation_members, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:conversation_members, [:conversation_id, :user_id])
    create index(:conversation_members, [:user_id])

    create table(:messages, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :sender_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :client_message_id, :string, null: false
      add :message_type, :string, null: false
      add :body, :text, null: false, default: ""
      add :source_language, :string
      add :server_seq, :bigint, null: false
      add :delivery_state, :string, null: false, default: "persisted"
      add :ai_processing_state, :string, null: false, default: "not_requested"
      add :schema_version, :string, null: false, default: "0.1.0"

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:messages, [:conversation_id, :client_message_id])
    create unique_index(:messages, [:conversation_id, :server_seq])
    create index(:messages, [:sender_user_id])

    create table(:consent_proofs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :capability, :string, null: false
      add :status, :string, null: false
      add :granted_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec
      add :policy_version, :string, null: false
      add :evidence_type, :string, null: false
      add :evidence_reference, :string, null: false
      add :schema_version, :string, null: false, default: "0.1.0"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:consent_proofs, [:user_id, :conversation_id, :capability])

    create table(:ai_jobs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :idempotency_key, :string, null: false
      add :capability, :string, null: false
      add :status, :string, null: false

      add :requester_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :subject_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :message_id, references(:messages, type: :binary_id, on_delete: :delete_all),
        null: false

      add :consent_proof_id, references(:consent_proofs, type: :binary_id, on_delete: :restrict),
        null: false

      add :trace_id, :string, null: false
      add :schema_version, :string, null: false, default: "0.1.0"
      add :request_payload, :map
      add :failure_reason, :string
      add :error_code, :string
      add :deadline_at, :utc_datetime_usec
      add :started_at, :utc_datetime_usec
      add :finished_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:ai_jobs, [:idempotency_key])
    create index(:ai_jobs, [:conversation_id])
    create index(:ai_jobs, [:requester_user_id])
    create index(:ai_jobs, [:status])

    create table(:ai_job_results, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :ai_job_id, references(:ai_jobs, type: :binary_id, on_delete: :delete_all), null: false
      add :status, :string, null: false
      add :output, :map
      add :model_metadata, :map
      add :safety, :map
      add :response_payload, :map
      add :schema_version, :string, null: false, default: "0.1.0"
      add :completed_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:ai_job_results, [:ai_job_id])

    create table(:oban_jobs, primary_key: false) do
      # Oban will manage its own migration via Oban.Migration — removed
    end

    drop table(:oban_jobs)
  end
end
