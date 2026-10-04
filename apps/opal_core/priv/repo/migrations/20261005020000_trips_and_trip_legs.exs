defmodule OpalCore.Repo.Migrations.TripsAndTripLegs do
  use Ecto.Migration

  def change do
    create table(:trips, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :title, :string, null: false
      add :destination_label, :string
      add :starts_on, :date
      add :ends_on, :date
      add :created_by_user_id, :binary_id, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:trips, [:created_by_user_id])

    create table(:trip_legs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :trip_id, references(:trips, type: :binary_id, on_delete: :delete_all), null: false
      add :position, :integer, null: false
      add :leg_type, :string, null: false
      add :place_label, :string, null: false
      add :place_ref, :map
      add :starts_on, :date
      add :ends_on, :date
      add :shared_plan_id, references(:shared_plans, type: :binary_id, on_delete: :nilify_all)
      add :notes, :string

      timestamps(type: :utc_datetime_usec)
    end

    create index(:trip_legs, [:trip_id, :position], name: :trip_legs_trip_id_position_index)
    create index(:trip_legs, [:shared_plan_id])
  end
end
