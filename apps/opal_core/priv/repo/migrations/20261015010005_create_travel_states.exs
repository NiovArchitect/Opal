defmodule OpalCore.Repo.Migrations.CreateTravelStates do
  use Ecto.Migration

  def change do
    create table(:travel_states, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      # City-level ONLY — never store lat/lng
      add :home_city, :string
      add :current_city, :string
      add :home_timezone, :string, null: false, default: "America/Los_Angeles"
      add :current_timezone, :string, null: false
      add :started_at, :utc_datetime_usec, null: false
      add :ended_at, :utc_datetime_usec
      add :active, :boolean, null: false, default: true
      add :detection_readings, :map, null: false, default: %{}
      add :routine_gap_logged, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:travel_states, [:account_id, :active])
    create index(:travel_states, [:account_id, :started_at])
  end
end
