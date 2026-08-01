defmodule OpalCore.Repo.Migrations.CreateSocialFlow11 do
  use Ecto.Migration

  def change do
    create table(:shell_needs_you_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :source_type, :string, null: false
      add :source_id, :binary_id
      add :conversation_id, :binary_id
      add :relationship_context_id, :binary_id
      add :title, :string, null: false
      add :explanation, :string, null: false
      add :primary_action, :string, null: false
      add :secondary_action, :string
      add :urgency_class, :string, null: false, default: "normal"
      add :privacy_class, :string, null: false, default: "private"
      add :status, :string, null: false, default: "open"
      add :due_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :source_evidence, :map, null: false, default: %{}
      add :suppression_reason, :string
      add :completed_at, :utc_datetime_usec
      add :dismissed_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:shell_needs_you_items, [:idempotency_key])
    create index(:shell_needs_you_items, [:owner_user_id, :status])

    create table(:shell_coming_up_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :plan_id, :binary_id
      add :conversation_id, :binary_id
      add :title, :string, null: false
      add :when_label, :string
      add :who_label, :string
      add :where_label, :string
      add :state, :string, null: false, default: "upcoming"
      add :source_type, :string, null: false, default: "plan"
      add :privacy_class, :string, null: false, default: "shared"
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:shell_coming_up_items, [:idempotency_key])
    create index(:shell_coming_up_items, [:owner_user_id, :state])

    create table(:shell_recent_changes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :title, :string, null: false
      add :explanation, :string, null: false
      add :conversation_id, :binary_id
      add :plan_id, :binary_id
      add :material, :boolean, null: false, default: true
      add :privacy_class, :string, null: false, default: "shared"
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:shell_recent_changes, [:idempotency_key])
    create index(:shell_recent_changes, [:owner_user_id])
  end
end
