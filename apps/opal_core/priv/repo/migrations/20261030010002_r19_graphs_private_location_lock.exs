defmodule OpalCore.Repo.Migrations.R19GraphsPrivateLocationLock do
  use Ecto.Migration

  # Repair #19 W7 - additive only.
  # - shared_plans.is_private: the owner's per-graph private flag.
  # - shared_plans.place_lat / place_lon: the plan place's coordinates,
  #   nullable; populated only when a real place record carries them.
  #   Without them no distance to the place is ever computed.
  # - plan_location_shares: the per-plan, per-joiner location-sharing
  #   consent record. A row exists ONLY when that joiner opted in for
  #   THIS plan; coords are stored coarse (DeviceLocation rounding).
  # - graph_locks: one passcode lock per account for the Private
  #   graphs area. Only a salted PBKDF2 hash is stored, never the code.
  def change do
    alter table(:shared_plans) do
      add :is_private, :boolean, null: false, default: false
      add :place_lat, :float
      add :place_lon, :float
    end

    create table(:plan_location_shares, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :plan_id, :binary_id, null: false
      add :user_id, :binary_id, null: false
      add :lat, :float, null: false
      add :lon, :float, null: false
      add :expires_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:plan_location_shares, [:plan_id, :user_id],
             name: :plan_location_shares_plan_user_index
           )

    create index(:plan_location_shares, [:plan_id])

    create table(:graph_locks, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :binary_id, null: false
      add :passcode_hash, :binary, null: false
      add :salt, :binary, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:graph_locks, [:user_id], name: :graph_locks_user_id_index)
  end
end
