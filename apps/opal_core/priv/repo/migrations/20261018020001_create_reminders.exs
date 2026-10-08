defmodule OpalCore.Repo.Migrations.CreateReminders do
  use Ecto.Migration

  def change do
    # Paste G Phase 8 — user-command reminders (NOT AttentionBudget-gated).
    create table(:reminders, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :task, :string, null: false
      add :remind_at, :utc_datetime_usec, null: false
      add :status, :string, null: false, default: "pending"
      # Optional recurrence: %{"frequency" => "weekly", "day_of_week" => 2} (0=Sun)
      add :recurrence, :map
      add :conversation_id, :binary_id
      add :delivered_at, :utc_datetime_usec
      add :overdue, :boolean, null: false, default: false
      add :metadata, :map, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:reminders, [:account_id, :status, :remind_at],
             name: :reminders_account_status_remind_at_index
           )

    create index(:reminders, [:remind_at],
             where: "status = 'pending'",
             name: :reminders_pending_remind_at_index
           )
  end
end
