defmodule OpalCore.Repo.Migrations.CreateSocialFlow4 do
  use Ecto.Migration

  def change do
    create table(:trusted_group_contexts, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :group_type, :string, null: false, default: "trusted_friends"
      add :status, :string, null: false, default: "active"
      add :min_size, :integer, null: false, default: 3
      add :max_size, :integer, null: false, default: 8

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:trusted_group_contexts, [:conversation_id])

    create table(:group_plan_proposals, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :created_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :activity, :string
      add :status, :string, null: false
      add :visibility, :string, null: false, default: "shared"
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :participant_ids, {:array, :binary_id}, null: false, default: []
      add :required_participant_ids, {:array, :binary_id}, null: false, default: []
      add :optional_participant_ids, {:array, :binary_id}, null: false, default: []
      add :recommended_copy, :string
      add :raw_candidate, :map
      add :idempotency_key, :string, null: false
      add :expires_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec
      add :converted_plan_id, :binary_id

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:group_plan_proposals, [:idempotency_key])
    create index(:group_plan_proposals, [:conversation_id, :status])

    create table(:group_plan_options, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :proposal_id,
          references(:group_plan_proposals, type: :binary_id, on_delete: :delete_all), null: false

      add :label, :string, null: false
      add :start_at, :utc_datetime_usec
      add :timezone, :string, null: false, default: "UTC"
      add :location_candidate, :string
      add :status, :string, null: false, default: "open"
      add :sort_order, :integer, null: false, default: 0

      timestamps(type: :utc_datetime_usec)
    end

    create index(:group_plan_options, [:proposal_id])

    create table(:group_option_responses, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :option_id, references(:group_plan_options, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :response_state, :string, null: false
      add :private_note, :string
      add :shared_note, :string
      add :responded_at, :utc_datetime_usec, null: false
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:group_option_responses, [:option_id, :user_id])
    create unique_index(:group_option_responses, [:idempotency_key])

    create table(:group_agreement_rules, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :proposal_id,
          references(:group_plan_proposals, type: :binary_id, on_delete: :delete_all), null: false

      add :rule_type, :string, null: false
      add :required_participant_ids, {:array, :binary_id}, null: false, default: []
      add :minimum_acceptances, :integer
      add :tentative_allowed, :boolean, null: false, default: false
      add :abstention_behavior, :string, null: false, default: "neutral"

      add :created_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :visible_to_participants, :boolean, null: false, default: true

      timestamps(type: :utc_datetime_usec)
    end

    create index(:group_agreement_rules, [:proposal_id])

    create table(:group_constraints, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :proposal_id,
          references(:group_plan_proposals, type: :binary_id, on_delete: :nilify_all)

      add :constraint_type, :string, null: false
      add :visibility, :string, null: false, default: "private"
      add :normalized_value, :string, null: false
      add :shared_summary, :string
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :status, :string, null: false, default: "active"
      add :expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:group_constraints, [:owner_user_id, :conversation_id])

    create table(:availability_grants, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :grant_mode, :string, null: false
      add :windows, :map, null: false, default: %{}
      add :status, :string, null: false, default: "active"
      add :revoked_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:availability_grants, [:idempotency_key])
    create index(:availability_grants, [:owner_user_id, :conversation_id])

    create table(:group_shared_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :proposal_id,
          references(:group_plan_proposals, type: :binary_id, on_delete: :nilify_all)

      add :title, :string, null: false
      add :status, :string, null: false
      add :time_label, :string
      add :location, :string
      add :timezone, :string, null: false, default: "UTC"
      add :current_revision_id, :binary_id

      add :created_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :participant_ids, {:array, :binary_id}, null: false, default: []

      timestamps(type: :utc_datetime_usec)
    end

    create index(:group_shared_plans, [:conversation_id])

    create table(:group_responsibilities, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :plan_id, references(:group_shared_plans, type: :binary_id, on_delete: :delete_all),
        null: false

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :description, :string, null: false
      add :status, :string, null: false
      add :visibility, :string, null: false, default: "shared"
      add :accepted_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:group_responsibilities, [:idempotency_key])
    create index(:group_responsibilities, [:plan_id])

    create table(:group_plan_revisions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :plan_id, references(:group_shared_plans, type: :binary_id, on_delete: :delete_all),
        null: false

      add :proposed_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :prior_revision_id, :binary_id
      add :proposed_changes, :map, null: false, default: %{}
      add :shared_reason, :string
      add :status, :string, null: false
      add :required_approvals, {:array, :binary_id}, null: false, default: []
      add :approvals, :map, null: false, default: %{}
      add :accepted_at, :utc_datetime_usec
      add :rejected_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:group_plan_revisions, [:plan_id])
  end
end
