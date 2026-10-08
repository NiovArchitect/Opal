defmodule OpalCore.Repo.Migrations.CreateProactiveAndBriefings do
  use Ecto.Migration

  def up do
    create table(:proactive_thread_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :trigger_type, :string, null: false
      add :trigger_ref_id, :binary_id
      add :opened_at, :utc_datetime_usec, null: false
      add :owner_response, :string
      add :conversation_id, :binary_id

      timestamps(type: :utc_datetime_usec)
    end

    create index(:proactive_thread_logs, [:account_id, :opened_at])

    create table(:weekly_briefings, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :week_start, :date, null: false
      add :content, :text, null: false
      add :generated_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:weekly_briefings, [:account_id, :week_start])

    # Founder-tunable: proactive_opt_out on accounts — additive column if users table exists
    alter table(:users) do
      add_if_not_exists :proactive_opt_out, :boolean, default: false, null: false
    end
  end

  def down do
    alter table(:users) do
      remove_if_exists :proactive_opt_out, :boolean
    end

    drop table(:weekly_briefings)
    drop table(:proactive_thread_logs)
  end
end
