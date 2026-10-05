defmodule OpalCore.Repo.Migrations.Celebrations do
  use Ecto.Migration

  def up do
    create table(:celebrations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :binary_id, null: false
      add :person_name, :string, null: false
      add :kind, :string, null: false
      add :month, :integer, null: false
      add :day, :integer, null: false
      add :year, :integer
      add :notes, :string
      # Idempotency: %{"2026" => [14, 7, 1]} — milestones already sent for occurrence year
      add :reminders_sent, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:celebrations, [:user_id])
    create index(:celebrations, [:month, :day])
  end

  def down do
    drop table(:celebrations)
  end
end
