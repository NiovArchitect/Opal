defmodule OpalCore.Repo.Migrations.CreateSocialFlow1 do
  use Ecto.Migration

  def change do
    create table(:social_flow_proposals, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :created_by_user_id, references(:users, type: :binary_id, on_delete: :restrict)
      add :ai_job_id, references(:ai_jobs, type: :binary_id, on_delete: :nilify_all)
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :capability, :string, null: false, default: "social_flow_plan_extract"
      add :status, :string, null: false
      add :activity_label, :string
      add :time_candidates, :map, null: false, default: %{}
      add :location_candidate, :string
      add :participant_candidates, {:array, :string}, null: false, default: []
      add :confidence, :float
      add :uncertainty, {:array, :string}, null: false, default: []
      add :recommended_signal_copy, :string
      add :raw_candidate, :map
      add :consent_proof_id, references(:consent_proofs, type: :binary_id, on_delete: :nilify_all)
      add :visibility, :string, null: false, default: "shared"
      add :expires_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec
      add :dismissed_at, :utc_datetime_usec
      add :converted_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:social_flow_proposals, [:conversation_id])
    create index(:social_flow_proposals, [:status])

    create table(:shared_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :title, :string, null: false
      add :status, :string, null: false
      add :start_at, :utc_datetime_usec
      add :end_at, :utc_datetime_usec
      add :timezone, :string, null: false, default: "UTC"
      add :location, :string
      add :time_label, :string

      add :created_from_proposal_id,
          references(:social_flow_proposals, type: :binary_id, on_delete: :nilify_all)

      add :current_revision_id, :binary_id

      add :created_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :cancelled_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:shared_plans, [:conversation_id])

    create table(:plan_participants, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :plan_id, references(:shared_plans, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :role, :string, null: false, default: "participant"
      add :response_state, :string, null: false
      add :responded_at, :utc_datetime_usec
      add :authority_source, :string, null: false, default: "user_action"

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:plan_participants, [:plan_id, :user_id])

    create table(:plan_options, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :proposal_id,
          references(:social_flow_proposals, type: :binary_id, on_delete: :delete_all)

      add :plan_id, references(:shared_plans, type: :binary_id, on_delete: :delete_all)
      add :label, :string, null: false
      add :start_at, :utc_datetime_usec
      add :status, :string, null: false, default: "open"
      add :sort_order, :integer, null: false, default: 0

      timestamps(type: :utc_datetime_usec)
    end

    create index(:plan_options, [:proposal_id])
    create index(:plan_options, [:plan_id])

    create table(:plan_option_responses, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :option_id, references(:plan_options, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :response, :string, null: false
      add :responded_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:plan_option_responses, [:option_id, :user_id])

    create table(:plan_commitments, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :plan_id, references(:shared_plans, type: :binary_id, on_delete: :delete_all),
        null: false

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :description, :string, null: false
      add :visibility, :string, null: false, default: "private"
      add :status, :string, null: false
      add :due_at, :utc_datetime_usec
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :confirmed_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec
      add :cancelled_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:plan_commitments, [:plan_id])
    create index(:plan_commitments, [:owner_user_id])

    create table(:plan_reminders, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :plan_id, references(:shared_plans, type: :binary_id, on_delete: :delete_all)
      add :commitment_id, references(:plan_commitments, type: :binary_id, on_delete: :nilify_all)
      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :visibility, :string, null: false, default: "private"
      add :scheduled_for, :utc_datetime_usec
      add :status, :string, null: false
      add :delivery_policy, :string, null: false, default: "in_app"
      add :content_summary, :string, null: false
      add :source_lineage, :map, null: false, default: %{}
      add :dismissed_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:plan_reminders, [:owner_user_id])
    create index(:plan_reminders, [:plan_id])

    create table(:plan_revisions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :plan_id, references(:shared_plans, type: :binary_id, on_delete: :delete_all),
        null: false

      add :proposed_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :prior_revision_id, :binary_id
      add :proposed_changes, :map, null: false, default: %{}
      add :status, :string, null: false
      add :required_approvals, {:array, :binary_id}, null: false, default: []
      add :approvals, :map, null: false, default: %{}
      add :accepted_at, :utc_datetime_usec
      add :rejected_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:plan_revisions, [:plan_id])

    create table(:social_flow_signals, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :proposal_id,
          references(:social_flow_proposals, type: :binary_id, on_delete: :nilify_all)

      add :plan_id, references(:shared_plans, type: :binary_id, on_delete: :nilify_all)
      add :commitment_id, references(:plan_commitments, type: :binary_id, on_delete: :nilify_all)
      add :reminder_id, references(:plan_reminders, type: :binary_id, on_delete: :nilify_all)
      add :revision_id, references(:plan_revisions, type: :binary_id, on_delete: :nilify_all)
      add :kind, :string, null: false
      add :status, :string, null: false
      add :copy, :string, null: false
      add :visibility, :string, null: false, default: "shared"
      add :actions, :map, null: false, default: %{}
      add :audience_user_id, references(:users, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:social_flow_signals, [:conversation_id])
    create index(:social_flow_signals, [:audience_user_id])

    create table(:social_flow_audit_events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :conversation_id, :binary_id
      add :plan_id, :binary_id
      add :actor_user_id, :binary_id
      add :event_type, :string, null: false
      add :payload, :map, null: false, default: %{}
      add :trace_id, :string

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:social_flow_audit_events, [:conversation_id])
    create index(:social_flow_audit_events, [:plan_id])
  end
end
