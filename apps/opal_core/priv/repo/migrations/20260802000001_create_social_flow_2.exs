defmodule OpalCore.Repo.Migrations.CreateSocialFlow2 do
  use Ecto.Migration

  def change do
    create table(:user_assistance_preferences, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :assistance_level, :string, null: false, default: "balanced"
      add :quiet_hours_start, :string, null: false, default: "22:00"
      add :quiet_hours_end, :string, null: false, default: "08:00"
      add :timezone, :string, null: false, default: "UTC"
      add :max_proactive_signals_per_day, :integer, null: false, default: 3
      add :private_reminder_channel, :string, null: false, default: "in_app"
      add :completion_feedback, :string, null: false, default: "standard"
      add :motion_preference, :string, null: false, default: "system"
      add :shadow_mode, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:user_assistance_preferences, [:user_id])

    create table(:attention_signals, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all)
      add :plan_id, references(:shared_plans, type: :binary_id, on_delete: :nilify_all)
      add :commitment_id, references(:plan_commitments, type: :binary_id, on_delete: :nilify_all)
      add :reminder_id, references(:plan_reminders, type: :binary_id, on_delete: :nilify_all)
      add :memory_id, :binary_id
      add :signal_type, :string, null: false
      add :privacy_class, :string, null: false, default: "private"
      add :status, :string, null: false
      add :copy, :string, null: false
      add :actions, :map, null: false, default: %{}
      add :due_at, :utc_datetime_usec
      add :eligible_at, :utc_datetime_usec
      add :scheduled_for, :utc_datetime_usec
      add :surfaced_at, :utc_datetime_usec
      add :acted_at, :utc_datetime_usec
      add :snoozed_until, :utc_datetime_usec
      add :dismissed_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :suppression_reason, :string
      add :relevance_version, :string, null: false, default: "sf2-0.1"
      add :source_lineage, :map, null: false, default: %{}
      add :consent_proof_id, :binary_id
      add :idempotency_key, :string, null: false
      add :internal_score, :float
      add :shadow_only, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:attention_signals, [:idempotency_key])
    create index(:attention_signals, [:owner_user_id, :status])
    create index(:attention_signals, [:conversation_id])

    create table(:personal_memory_candidates, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all)
      add :counterpart_user_id, :binary_id
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :candidate_type, :string, null: false
      add :candidate_summary, :string, null: false
      add :confidence, :float
      add :uncertainty, {:array, :string}, null: false, default: []
      add :proposed_purpose, :string
      add :suggested_expiry, :utc_datetime_usec
      add :status, :string, null: false
      add :consent_proof_id, :binary_id
      add :ai_job_id, :binary_id
      add :approved_at, :utc_datetime_usec
      add :rejected_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:personal_memory_candidates, [:owner_user_id, :status])

    create table(:personal_relationship_memories, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all)
      add :counterpart_user_id, :binary_id

      add :source_candidate_id,
          references(:personal_memory_candidates, type: :binary_id, on_delete: :nilify_all)

      add :summary, :string, null: false
      add :purpose, :string, null: false
      add :visibility, :string, null: false, default: "private"
      add :review_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :correction_state, :string, null: false, default: "none"
      add :deletion_state, :string, null: false, default: "active"
      add :handled_at, :utc_datetime_usec
      add :forgotten_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:personal_relationship_memories, [:owner_user_id, :deletion_state])

    create table(:completion_events, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, :binary_id
      add :plan_id, :binary_id
      add :commitment_id, :binary_id
      add :reminder_id, :binary_id
      add :memory_id, :binary_id
      add :completion_kind, :string, null: false
      add :visibility, :string, null: false, default: "private"
      add :gratification_copy, :string
      add :shared_message, :string
      add :source, :string, null: false, default: "user_action"
      add :idempotency_key, :string, null: false
      add :completed_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:completion_events, [:idempotency_key])
    create index(:completion_events, [:owner_user_id])

    create table(:assistance_feedback_events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      add :attention_signal_id,
          references(:attention_signals, type: :binary_id, on_delete: :nilify_all)

      add :feedback_type, :string, null: false
      add :payload, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:assistance_feedback_events, [:user_id])

    create table(:shadow_evaluations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, :binary_id, null: false
      add :candidate_id, :string, null: false
      add :eligible, :boolean, null: false
      add :suppression_reason, :string
      add :would_surface, :boolean, null: false
      add :metadata, :map, null: false, default: %{}
      add :evaluated_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:shadow_evaluations, [:owner_user_id])
  end
end
