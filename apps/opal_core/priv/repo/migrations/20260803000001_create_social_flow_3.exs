defmodule OpalCore.Repo.Migrations.CreateSocialFlow3 do
  use Ecto.Migration

  def change do
    create table(:conversation_insights, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :insight_type, :string, null: false
      add :privacy_class, :string, null: false, default: "private"
      add :status, :string, null: false
      add :copy, :string, null: false
      add :actions, :map, null: false, default: %{}
      add :evidence_message_ids, {:array, :binary_id}, null: false, default: []
      add :uncertainty, {:array, :string}, null: false, default: []
      add :payload, :map, null: false, default: %{}
      add :suggested_draft, :string
      add :idempotency_key, :string, null: false
      add :dismissed_at, :utc_datetime_usec
      add :resolved_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :correction_label, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:conversation_insights, [:idempotency_key])
    create index(:conversation_insights, [:owner_user_id, :status])
    create index(:conversation_insights, [:conversation_id])

    create table(:open_loops, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :loop_type, :string, null: false
      add :summary, :string, null: false
      add :status, :string, null: false
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :answered_parts, {:array, :string}, null: false, default: []
      add :unanswered_parts, {:array, :string}, null: false, default: []

      add :insight_id,
          references(:conversation_insights, type: :binary_id, on_delete: :nilify_all)

      add :resolved_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:open_loops, [:idempotency_key])
    create index(:open_loops, [:owner_user_id, :status])

    create table(:private_draft_assists, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :insight_id,
          references(:conversation_insights, type: :binary_id, on_delete: :nilify_all)

      add :original_draft, :string
      add :suggested_draft, :string
      add :user_edited_draft, :string
      add :status, :string, null: false
      add :expires_at, :utc_datetime_usec
      add :sent_message_id, :binary_id

      timestamps(type: :utc_datetime_usec)
    end

    create index(:private_draft_assists, [:owner_user_id, :status])

    create table(:decision_summaries, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :confirmed, :map, null: false, default: %{}
      add :still_open, :map, null: false, default: %{}
      add :handled, :map, null: false, default: %{}
      add :source_lineage, :map, null: false, default: %{}
      add :privacy_class, :string, null: false, default: "private"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:decision_summaries, [:owner_user_id, :conversation_id])

    create table(:insight_feedback_events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      add :insight_id,
          references(:conversation_insights, type: :binary_id, on_delete: :nilify_all)

      add :feedback_type, :string, null: false
      add :payload, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:insight_feedback_events, [:user_id])
  end
end
