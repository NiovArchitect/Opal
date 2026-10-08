defmodule OpalCore.Repo.Migrations.CreateRoutines do
  use Ecto.Migration

  def change do
    create table(:routines, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :person_id, :binary_id
      add :activity, :string, null: false
      add :cadence, :string, null: false
      add :day_of_week, :integer
      add :day_of_month, :integer
      add :time_of_day, :string
      add :confidence, :float, null: false, default: 0.0
      add :detection_count, :integer, null: false, default: 0
      add :last_occurrence_at, :utc_datetime_usec
      add :streak_broken, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:routines, [:account_id])
    create index(:routines, [:account_id, :streak_broken])

    create unique_index(:routines, [:account_id, :person_id, :activity, :cadence, :day_of_week],
             name: :routines_account_person_activity_cadence_dow_index
           )
  end
end
