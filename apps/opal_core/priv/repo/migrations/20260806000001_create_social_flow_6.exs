defmodule OpalCore.Repo.Migrations.CreateSocialFlow6 do
  use Ecto.Migration

  def change do
    create table(:social_experiences, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :plan_id, :binary_id
      add :experience_type, :string, null: false, default: "dinner"
      add :status, :string, null: false, default: "settled_plan"
      add :title, :string
      add :location_label, :string
      add :time_label, :string
      add :timezone, :string, null: false, default: "UTC"
      add :scheduled_start_at, :utc_datetime_usec
      add :scheduled_end_at, :utc_datetime_usec
      add :readiness_state, :string, null: false, default: "unknown"
      add :day_of_copy, :string
      add :started_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec
      add :cancelled_at, :utc_datetime_usec
      add :closed_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false
      add :participant_ids, {:array, :binary_id}, null: false, default: []

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:social_experiences, [:idempotency_key])
    create index(:social_experiences, [:conversation_id, :status])
    create index(:social_experiences, [:plan_id])

    create table(:experience_participant_states, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :experience_id,
          references(:social_experiences, type: :binary_id, on_delete: :delete_all),
          null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :attendance_state, :string, null: false, default: "expected"
      add :arrival_state, :string, null: false, default: "no_update"
      add :visibility, :string, null: false, default: "group"
      add :source, :string, null: false, default: "explicit"
      add :shared_note, :string
      add :private_note, :string
      add :expected_arrival_label, :string
      add :effective_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:experience_participant_states, [:idempotency_key])
    create unique_index(:experience_participant_states, [:experience_id, :user_id])

    create table(:experience_readiness_items, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :experience_id,
          references(:social_experiences, type: :binary_id, on_delete: :delete_all),
          null: false

      add :item_type, :string, null: false
      add :description, :string, null: false
      add :owner_user_id, :binary_id
      add :status, :string, null: false, default: "open"
      add :visibility, :string, null: false, default: "shared"
      add :due_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec
      add :cancelled_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:experience_readiness_items, [:idempotency_key])
    create index(:experience_readiness_items, [:experience_id, :status])

    create table(:eta_envelopes, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :experience_id,
          references(:social_experiences, type: :binary_id, on_delete: :delete_all),
          null: false

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :visibility_scope, :string, null: false, default: "group"
      add :arrival_start_at, :utc_datetime_usec
      add :arrival_end_at, :utc_datetime_usec
      add :arrival_window_label, :string
      add :precision_class, :string, null: false, default: "approximate_window"
      add :source_class, :string, null: false, default: "user_stated"
      add :confidence, :float, null: false, default: 0.7
      add :generated_at, :utc_datetime_usec, null: false
      add :expires_at, :utc_datetime_usec, null: false
      add :revoked_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec
      add :status, :string, null: false, default: "active"
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:eta_envelopes, [:idempotency_key])
    create index(:eta_envelopes, [:experience_id, :status])

    create table(:experience_change_candidates, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :experience_id,
          references(:social_experiences, type: :binary_id, on_delete: :delete_all),
          null: false

      add :change_type, :string, null: false
      add :source_class, :string, null: false, default: "provider"
      add :source_reference, :string
      add :proposed_changes, :map, null: false, default: %{}
      add :shared_copy, :string
      add :confidence, :float, null: false, default: 0.6
      add :status, :string, null: false, default: "proposed"
      add :expires_at, :utc_datetime_usec
      add :resolved_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:experience_change_candidates, [:idempotency_key])
    create index(:experience_change_candidates, [:experience_id, :status])

    create table(:experience_follow_ups, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :experience_id,
          references(:social_experiences, type: :binary_id, on_delete: :delete_all),
          null: false

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :description, :string, null: false
      add :visibility, :string, null: false, default: "private"
      add :status, :string, null: false, default: "open"
      add :due_at, :utc_datetime_usec
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :completed_at, :utc_datetime_usec
      add :dismissed_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:experience_follow_ups, [:idempotency_key])
    create index(:experience_follow_ups, [:experience_id, :owner_user_id])
  end
end
