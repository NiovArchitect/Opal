defmodule OpalCore.Repo.Migrations.CreateCallSessions do
  use Ecto.Migration

  def change do
    create table(:call_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :caller_user_id, :binary_id, null: false
      add :callee_user_id, :binary_id, null: false
      add :conversation_id, :binary_id
      add :status, :string, null: false, default: "initiated"
      add :ended_reason, :string
      add :correlation_id, :string
      add :answered_at, :utc_datetime_usec
      add :ended_at, :utc_datetime_usec
      add :ringing_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:call_sessions, [:caller_user_id])
    create index(:call_sessions, [:callee_user_id])
    create index(:call_sessions, [:status])
    create index(:call_sessions, [:conversation_id])
  end
end
