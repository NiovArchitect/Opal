defmodule OpalCore.Repo.Migrations.CreateSocialFlow9 do
  use Ecto.Migration

  def change do
    create table(:safety_blocks, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :blocker_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :blocked_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :scope, :string, null: false, default: "relationship"
      add :conversation_id, :binary_id
      add :family_id, :binary_id
      add :status, :string, null: false, default: "active"
      add :reason_class, :string
      add :suspended_contact_id, :binary_id
      add :idempotency_key, :string, null: false
      add :revoked_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:safety_blocks, [:idempotency_key])
    create index(:safety_blocks, [:blocker_user_id, :blocked_user_id, :status])
    create index(:safety_blocks, [:blocked_user_id, :status])

    create table(:safety_reports, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :reporter_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :reported_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :category, :string, null: false
      add :status, :string, null: false, default: "submitted"
      add :privacy_class, :string, null: false, default: "reporter_confidential"
      add :note, :string
      add :source_request_ids, {:array, :binary_id}, null: false, default: []
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :policy_version, :string, null: false, default: "sf9-dev-0.1"
      add :triage_proposal, :map, null: false, default: %{}
      add :containment_action, :string
      add :containment_expires_at, :utc_datetime_usec
      add :reporter_visible_status, :string
      add :idempotency_key, :string, null: false
      add :closed_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:safety_reports, [:idempotency_key])
    create index(:safety_reports, [:reporter_user_id, :status])
    create index(:safety_reports, [:reported_user_id, :status])

    create table(:safety_evidence_refs, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :report_id, references(:safety_reports, type: :binary_id, on_delete: :delete_all),
        null: false

      add :source_message_id, :binary_id
      add :content_hash, :string, null: false
      add :minimal_snippet, :string
      add :sender_user_id, :binary_id
      add :conversation_id, :binary_id
      add :captured_at, :utc_datetime_usec, null: false
      add :expires_at, :utc_datetime_usec, null: false
      add :policy_version, :string, null: false, default: "sf9-dev-0.1"
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:safety_evidence_refs, [:idempotency_key])
    create index(:safety_evidence_refs, [:report_id])

    create table(:device_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :device_label, :string, null: false
      add :session_ref, :string, null: false
      add :status, :string, null: false, default: "active"
      add :platform, :string, null: false, default: "phone"
      add :last_seen_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec
      add :revoked_by_user_id, :binary_id
      add :refresh_family, :string, null: false
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:device_sessions, [:idempotency_key])
    create unique_index(:device_sessions, [:session_ref])
    create index(:device_sessions, [:user_id, :status])

    create table(:account_recovery_cases, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :target_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false

      add :initiator_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :family_id, :binary_id
      add :proof_class, :string, null: false, default: "guardian_session"
      add :proof_token_hash, :string
      add :status, :string, null: false, default: "pending"
      add :new_device_label, :string
      add :authority_version, :integer
      add :expires_at, :utc_datetime_usec, null: false
      add :completed_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:account_recovery_cases, [:idempotency_key])
    create index(:account_recovery_cases, [:target_user_id, :status])

    create table(:guardian_authority_reviews, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :family_id, :binary_id, null: false

      add :requested_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :target_guardian_user_id, :binary_id, null: false
      add :youth_user_id, :binary_id, null: false
      add :action, :string, null: false, default: "remove_co_guardian"
      add :status, :string, null: false, default: "blocked_pending_review"
      add :requires_reauth, :boolean, null: false, default: true
      add :reauth_confirmed, :boolean, null: false, default: false
      add :authority_version, :integer, null: false, default: 1
      add :reason, :string
      add :idempotency_key, :string, null: false
      add :resolved_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:guardian_authority_reviews, [:idempotency_key])
    create index(:guardian_authority_reviews, [:family_id, :status])

    create table(:safety_appeals, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :appellant_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :report_id, :binary_id
      add :decision_id, :string, null: false
      add :reason_category, :string, null: false
      add :statement, :string
      add :status, :string, null: false, default: "submitted"
      add :outcome, :string
      add :idempotency_key, :string, null: false
      add :resolved_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:safety_appeals, [:idempotency_key])
    create index(:safety_appeals, [:appellant_user_id, :status])

    create table(:rate_limit_buckets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :bucket_key, :string, null: false
      add :action, :string, null: false
      add :count, :integer, null: false, default: 0
      add :window_started_at, :utc_datetime_usec, null: false
      add :blocked_until, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:rate_limit_buckets, [:bucket_key, :action])

    create table(:contact_request_suspensions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :actor_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :target_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :status, :string, null: false, default: "active"
      add :source_report_id, :binary_id
      add :expires_at, :utc_datetime_usec, null: false
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:contact_request_suspensions, [:idempotency_key])
    create index(:contact_request_suspensions, [:actor_user_id, :target_user_id])
  end
end
