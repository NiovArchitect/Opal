defmodule OpalCore.Repo.Migrations.P45RecompositionTables do
  use Ecto.Migration

  def change do
    create table(:decision_dependencies, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :decision_id, :binary_id, null: false
      add :entity_type, :string, null: false
      add :entity_id, :string, null: false
      add :context_revision, :integer, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:decision_dependencies, [:entity_type, :entity_id])
    create index(:decision_dependencies, [:decision_id])

    create unique_index(:decision_dependencies, [:decision_id, :entity_type, :entity_id],
             name: :decision_dependencies_decision_entity_uniq
           )

    create table(:event_processing_records, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :event_id, :string, null: false
      add :status, :string, null: false, default: "processed"
      add :error_class, :string
      add :processed_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:event_processing_records, [:event_id])
    create index(:event_processing_records, [:status])

    create table(:world_facts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :fact_type, :string, null: false
      add :entity_id, :string, null: false
      add :source, :string, null: false
      add :value, :map, null: false, default: %{}
      add :observed_at, :utc_datetime_usec, null: false
      add :expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:world_facts, [:entity_id, :fact_type])
    create index(:world_facts, [:source])
  end
end
