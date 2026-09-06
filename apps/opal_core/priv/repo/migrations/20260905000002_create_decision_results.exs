defmodule OpalCore.Repo.Migrations.CreateDecisionResults do
  use Ecto.Migration

  def change do
    create table(:decision_results, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :decision_id, references(:decision_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :based_on_context_revision, :integer, null: false
      add :result_revision, :integer, null: false, default: 1
      add :mode, :string, null: false, default: "high"
      add :scope_type, :string, null: false
      add :answer_type, :string, null: false, default: "place"
      add :answer_entity_type, :string, null: false, default: "place"
      add :answer_entity_id, :string, null: false
      add :answer_payload, :map, null: false, default: %{}
      add :truth_state, :string, null: false, default: "provisional"
      add :confidence_class, :string, null: false, default: "high"
      add :confidence_factors, :map, null: false, default: %{}
      add :provider_state, :string, null: false, default: "unverified"
      add :evidence_refs, {:array, :binary_id}, null: false, default: []
      add :invalidation_conditions, {:array, :map}, null: false, default: []
      add :explanation_private, :map, null: false, default: %{}
      add :explanation_shareable, :map, null: false, default: %{}
      add :actions, {:array, :map}, null: false, default: []
      add :candidate_source, :string, null: false, default: "fixture_catalog"
      add :policy_version, :string, null: false, default: "p4.2.high.v1"
      add :model_version, :string
      add :status, :string, null: false, default: "provisional"
      add :correlation_id, :string
      add :graph_id, :binary_id
      add :accepted_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:decision_results, [:decision_id])
    create index(:decision_results, [:status])
    create unique_index(:decision_results, [:decision_id, :based_on_context_revision, :result_revision],
      name: :decision_results_decision_ctx_rev_uniq
    )
  end
end
