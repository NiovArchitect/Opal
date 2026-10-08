defmodule OpalCore.Repo.Migrations.CreateArtifacts do
  use Ecto.Migration

  def change do
    create table(:artifacts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :kind, :string, null: false
      # Source object id: SharedPlan id for event_plan, Trip id for trip_itinerary.
      add :plan_id, :binary_id, null: false
      add :version, :integer, null: false, default: 1
      add :html_or_path, :text, null: false
      add :signed_token, :string, null: false
      add :expires_at, :utc_datetime_usec, null: false
      add :outdated_at, :utc_datetime_usec
      add :source_fingerprint, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:artifacts, [:signed_token])
    create index(:artifacts, [:account_id, :kind, :plan_id])
    create index(:artifacts, [:plan_id, :version])
    create index(:artifacts, [:expires_at])
  end
end
