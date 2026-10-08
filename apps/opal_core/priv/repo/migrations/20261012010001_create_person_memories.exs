defmodule OpalCore.Repo.Migrations.CreatePersonMemories do
  use Ecto.Migration

  def change do
    create table(:person_memories, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :person_id, :binary_id, null: false
      add :relationship_type, :string
      add :vibe_profile_id, :binary_id
      add :cadence_status, :string, null: false, default: "stable"
      add :last_contact_at, :utc_datetime_usec
      add :contact_frequency_days, :float
      add :known_facts, :map, null: false, default: %{}
      add :open_loops, {:array, :map}, null: false, default: []
      add :sentiment_trend, :string, null: false, default: "neutral"
      add :contact_intervals, {:array, :float}, null: false, default: []

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:person_memories, [:account_id, :person_id],
             name: :person_memories_account_person_index
           )

    create index(:person_memories, [:account_id])
  end
end
