defmodule OpalCore.Repo.Migrations.CreateSurfacedNudges do
  use Ecto.Migration

  def change do
    create table(:surfaced_nudges, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :type, :string, null: false
      add :ref_id, :binary_id
      add :priority, :integer, null: false, default: 50
      add :reason, :string, null: false
      add :message_draft, :string
      add :conversation_id, :binary_id
      add :surfaced_at, :utc_datetime_usec, null: false
      add :dismissed_count, :integer, null: false, default: 0
      add :suppressed_until, :utc_datetime_usec
      add :status, :string, null: false, default: "active"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:surfaced_nudges, [:account_id, :surfaced_at])
    create index(:surfaced_nudges, [:account_id, :type, :ref_id])
  end
end
