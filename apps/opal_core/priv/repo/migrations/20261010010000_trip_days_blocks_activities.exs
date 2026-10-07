defmodule OpalCore.Repo.Migrations.TripDaysBlocksActivities do
  use Ecto.Migration

  # Experience curation canvas: Trip → TripDay → TimeBlock → Activity + RSVPs.
  # Soft time labels; free blocks first-class; subgroup via responses.
  # Existing trip_legs stay intact for Phase 4B–4G stop/plan links.

  def change do
    create table(:trip_days, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :trip_id, references(:trips, type: :binary_id, on_delete: :delete_all), null: false
      add :day_index, :integer, null: false
      add :on_date, :date
      add :label, :string, null: false
      add :notes, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:trip_days, [:trip_id, :day_index], name: :trip_days_trip_id_day_index_index)
    create index(:trip_days, [:trip_id])

    create table(:trip_time_blocks, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :trip_day_id, references(:trip_days, type: :binary_id, on_delete: :delete_all),
        null: false

      add :position, :integer, null: false
      # morning | afternoon | evening | night | custom
      add :slot, :string, null: false
      # Loose human label: "morning-ish", "~1pm", "7:30", "golden hour"
      add :time_label, :string, null: false
      # activity | free | transit | meal
      add :block_kind, :string, null: false, default: "activity"
      add :title, :string
      add :notes, :string

      timestamps(type: :utc_datetime_usec)
    end

    create index(:trip_time_blocks, [:trip_day_id, :position],
             name: :trip_time_blocks_day_id_position_index
           )

    create table(:trip_activities, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :trip_time_block_id,
          references(:trip_time_blocks, type: :binary_id, on_delete: :delete_all),
          null: false

      add :position, :integer, null: false, default: 0
      # Real venue / experience name — never "table for four"
      add :venue_name, :string, null: false
      add :venue_area, :string
      # meal | activity | lodging | transit | free | other
      add :activity_kind, :string, null: false, default: "activity"
      add :vibe_tags, {:array, :string}, null: false, default: []
      add :notes, :string
      # Optional bridge to ordered stop / SharedPlan spawn path
      add :trip_leg_id, references(:trip_legs, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:trip_activities, [:trip_time_block_id, :position],
             name: :trip_activities_block_id_position_index
           )

    create index(:trip_activities, [:trip_leg_id])

    create table(:trip_activity_responses, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :trip_activity_id,
          references(:trip_activities, type: :binary_id, on_delete: :delete_all),
          null: false

      add :user_id, :binary_id, null: false
      # in | interested | passed
      add :state, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:trip_activity_responses, [:trip_activity_id, :user_id],
             name: :trip_activity_responses_activity_user_index
           )

    create index(:trip_activity_responses, [:user_id])
  end
end
