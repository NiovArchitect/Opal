defmodule OpalCore.Repo.Migrations.ExtendDecisionResultsForLowTradeoff do
  use Ecto.Migration

  def change do
    alter table(:decision_results) do
      add :conflict_id, :string
      add :conflict_type, :string
      add :tradeoff_axis, :string
      add :tradeoff_payload, :map, default: %{}
      add :tradeoff_status, :string
      add :tradeoff_selected, :string
    end

    create index(:decision_results, [:conflict_id])
    create index(:decision_results, [:tradeoff_status])
  end
end
