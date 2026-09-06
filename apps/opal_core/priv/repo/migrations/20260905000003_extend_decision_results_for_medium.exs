defmodule OpalCore.Repo.Migrations.ExtendDecisionResultsForMedium do
  use Ecto.Migration

  def change do
    alter table(:decision_results) do
      modify :answer_entity_id, :string, null: true
      add :question_id, :string
      add :question_dimension, :string
      add :question_payload, :map, default: %{}
      add :question_status, :string
      add :question_target_user_id, :binary_id
    end

    create index(:decision_results, [:question_id])
    create index(:decision_results, [:question_status])
  end
end
