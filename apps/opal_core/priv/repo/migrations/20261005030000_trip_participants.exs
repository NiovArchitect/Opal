defmodule OpalCore.Repo.Migrations.TripParticipants do
  @moduledoc """
  Phase 4C — trip membership (mirrors plan_participants pattern).
  Required so create can accept user_ids[] and list scopes to creator OR participant.
  """

  use Ecto.Migration

  def change do
    create table(:trip_participants, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :trip_id, references(:trips, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, :binary_id, null: false
      add :role, :string, null: false, default: "participant"

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:trip_participants, [:trip_id, :user_id],
             name: :trip_participants_trip_id_user_id_uniq
           )

    create index(:trip_participants, [:user_id])
  end
end
