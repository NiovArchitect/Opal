defmodule OpalCore.Repo.Migrations.CallOutcomes do
  use Ecto.Migration

  def change do
    create table(:call_outcomes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :call_id, references(:call_sessions, type: :binary_id, on_delete: :delete_all), null: false
      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :nilify_all)
      add :source_segment_ids, {:array, :binary_id}, null: false, default: []
      add :outcome_type, :string, null: false
      add :entity_id, :string

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:call_outcomes, [:call_id])
    create index(:call_outcomes, [:conversation_id])
  end
end
