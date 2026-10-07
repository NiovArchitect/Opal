defmodule OpalCore.Repo.Migrations.VibeProfiles do
  use Ecto.Migration

  # Learned vibe profiles for experience curation — not a settings form.
  # Updated from what people actually do (activity RSVPs + tags).

  def change do
    create table(:vibe_profiles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :binary_id, null: false
      # early | flexible | late — inferred, not surveyed
      add :sleep_bias, :string, null: false, default: "flexible"
      # early_morning morning afternoon evening night golden_hour
      add :energy_windows, {:array, :string}, null: false, default: []
      # foodie photography ambiance patio lively quiet ruins cooking market …
      add :interest_tags, {:array, :string}, null: false, default: []
      # Evidence crumbs (never invent): [%{"source" => "trip_activity", "tag" => …, "at" => …}]
      add :evidence, {:array, :map}, null: false, default: []
      add :last_learned_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:vibe_profiles, [:user_id], name: :vibe_profiles_user_id_index)
  end
end
