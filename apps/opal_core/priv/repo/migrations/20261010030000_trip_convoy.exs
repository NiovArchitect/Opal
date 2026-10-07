defmodule OpalCore.Repo.Migrations.TripConvoy do
  use Ecto.Migration

  # Opt-in trip convoy presence — not surveillance.
  # Members share a place label (and optional coords) only while sharing=true.

  def change do
    create table(:trip_convoy_members, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :trip_id, references(:trips, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, :binary_id, null: false
      add :sharing, :boolean, null: false, default: false
      add :place_label, :string
      # Optional — never invent; null unless client supplied real coords
      add :lat, :float
      add :lng, :float
      add :last_ping_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:trip_convoy_members, [:trip_id, :user_id],
             name: :trip_convoy_members_trip_user_index
           )
  end
end
