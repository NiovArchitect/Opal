defmodule OpalCore.Repo.Migrations.CreateSocialFlow8 do
  use Ecto.Migration

  def change do
    create table(:family_contexts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :label, :string, null: false
      add :status, :string, null: false, default: "active"
      add :policy_version, :string, null: false, default: "sf8-dev-0.1"
      add :legal_disclaimer, :string, null: false, default: "dev_fixture_not_certified"
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:family_contexts, [:idempotency_key])

    create table(:family_memberships, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :role, :string, null: false
      add :account_kind, :string, null: false, default: "adult"
      add :status, :string, null: false, default: "active"
      add :display_name, :string
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:family_memberships, [:idempotency_key])
    create unique_index(:family_memberships, [:family_id, :user_id])

    create table(:guardian_relationships, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :guardian_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :youth_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :authority_class, :string, null: false, default: "primary"
      add :status, :string, null: false, default: "active"
      add :authority_version, :integer, null: false, default: 1
      add :revoked_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:guardian_relationships, [:idempotency_key])
    create index(:guardian_relationships, [:family_id, :youth_user_id, :status])

    create table(:youth_capability_policies, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :youth_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :capability, :string, null: false
      add :mode, :string, null: false, default: "denied"
      add :status, :string, null: false, default: "active"
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:youth_capability_policies, [:idempotency_key])
    create unique_index(:youth_capability_policies, [:family_id, :youth_user_id, :capability])

    create table(:family_conversations, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :kind, :string, null: false, default: "guardian_youth"
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:family_conversations, [:idempotency_key])
    create unique_index(:family_conversations, [:conversation_id])

    create table(:family_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :created_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :title, :string, null: false
      add :status, :string, null: false, default: "proposed"
      add :time_label, :string
      add :location_label, :string
      add :youth_user_id, :binary_id
      add :guardian_user_id, :binary_id
      add :copy_guardian, :string
      add :copy_youth, :string
      add :no_precise_location, :boolean, null: false, default: true
      add :no_background_tracking, :boolean, null: false, default: true
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :idempotency_key, :string, null: false
      add :confirmed_at, :utc_datetime_usec
      add :current_revision, :integer, null: false, default: 1

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:family_plans, [:idempotency_key])
    create index(:family_plans, [:family_id, :status])

    create table(:family_plan_revisions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :plan_id, references(:family_plans, type: :binary_id, on_delete: :delete_all),
        null: false

      add :proposed_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :revision_number, :integer, null: false
      add :proposed_changes, :map, null: false, default: %{}
      add :status, :string, null: false, default: "proposed"
      add :shared_reason, :string
      add :approved_by_user_id, :binary_id
      add :resolved_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:family_plan_revisions, [:idempotency_key])
    create index(:family_plan_revisions, [:plan_id])

    create table(:family_permission_requests, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :youth_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :summary, :string, null: false
      add :status, :string, null: false, default: "pending_review"
      add :missing_details, {:array, :string}, null: false, default: []
      add :details, :map, null: false, default: %{}
      add :guardian_copy, :string
      add :youth_copy, :string
      add :reviewed_by_user_id, :binary_id
      add :reviewed_at, :utc_datetime_usec
      add :resulting_plan_id, :binary_id
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:family_permission_requests, [:idempotency_key])
    create index(:family_permission_requests, [:family_id, :status])

    create table(:approved_contact_requests, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :youth_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :requested_contact_user_id, :binary_id, null: false
      add :reason, :string, null: false
      add :requested_capability, :string, null: false, default: "bounded_chat"
      add :status, :string, null: false, default: "pending"
      add :scope, :string
      add :expires_at, :utc_datetime_usec
      add :reviewed_by_user_id, :binary_id
      add :reviewed_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:approved_contact_requests, [:idempotency_key])

    create table(:approved_contacts, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :youth_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :contact_user_id, :binary_id, null: false
      add :scope, :string, null: false, default: "project"
      add :status, :string, null: false, default: "active"
      add :capabilities, {:array, :string}, null: false, default: []
      add :conversation_id, :binary_id
      add :expires_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec
      add :revoked_by_user_id, :binary_id
      add :idempotency_key, :string, null: false
      add :no_location_sharing, :boolean, null: false, default: true
      add :no_contact_forwarding, :boolean, null: false, default: true

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:approved_contacts, [:idempotency_key])
    create index(:approved_contacts, [:youth_user_id, :status])

    create table(:approved_devices, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :device_label, :string, null: false
      add :platform, :string, null: false, default: "tablet"
      add :status, :string, null: false, default: "pending"
      add :session_ref, :string
      add :approved_by_user_id, :binary_id
      add :approved_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec
      add :last_seen_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:approved_devices, [:idempotency_key])
    create index(:approved_devices, [:user_id, :status])

    create table(:youth_private_reminders, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :family_id, references(:family_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :body, :string, null: false
      add :status, :string, null: false, default: "active"
      add :visibility, :string, null: false, default: "youth_private"
      add :completed_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:youth_private_reminders, [:idempotency_key])
    create index(:youth_private_reminders, [:owner_user_id, :status])
  end
end
