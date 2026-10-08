defmodule OpalCore.Repo.Migrations.CreateOutcomeSignals do
  use Ecto.Migration

  def change do
    create table(:outcome_signals, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :signal_type, :string, null: false
      add :ref_type, :string, null: false
      add :ref_id, :binary_id
      add :context, :map, null: false, default: %{}
      add :outcome, :string, null: false
      add :strength, :float, null: false, default: 0.5
      add :recorded_at, :utc_datetime_usec, null: false
      add :archived, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:outcome_signals, [:account_id, :ref_type, :ref_id])
    create index(:outcome_signals, [:account_id, :recorded_at])
  end
end
