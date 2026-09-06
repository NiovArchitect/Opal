defmodule OpalCore.Repo.Migrations.CreateDecisionContexts do
  use Ecto.Migration

  def change do
    create table(:decision_contexts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :initiator_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :revision, :integer, null: false, default: 1
      add :scope_type, :string, null: false
      add :scope_ids, {:array, :binary_id}, null: false, default: []
      add :participant_ids, {:array, :binary_id}, null: false, default: []
      add :intent, :string, null: false
      add :status, :string, null: false, default: "active"
      add :graph_id, :binary_id
      add :journey_id, :binary_id
      add :time_context, :map, null: false, default: %{}
      add :location_context, :map, null: false, default: %{}
      add :availability_context, :map, null: false, default: %{}
      add :budget_context, :map, null: false, default: %{}
      add :preference_context, :map, null: false, default: %{}
      add :provider_context, :map, null: false, default: %{}
      add :hard_constraints, :map, null: false, default: %{}
      add :soft_preferences, :map, null: false, default: %{}
      add :unknowns, {:array, :string}, null: false, default: []
      add :conflicts, {:array, :map}, null: false, default: []
      add :invalidation_conditions, {:array, :map}, null: false, default: []
      add :correlation_id, :string
      add :privacy_default, :string, null: false, default: "shared_group"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:decision_contexts, [:initiator_user_id])
    create index(:decision_contexts, [:status])
    create index(:decision_contexts, [:graph_id])
    create index(:decision_contexts, [:journey_id])
    create index(:decision_contexts, [:intent])

    create table(:decision_evidences, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :decision_id, references(:decision_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :dimension, :string, null: false
      add :claim, :map, null: false, default: %{}
      add :privacy_class, :string, null: false
      add :source_type, :string, null: false
      add :source_ref, :string
      add :confidence, :float
      add :freshness, :string, null: false, default: "fresh"
      add :observed_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :constraint_kind, :string, null: false, default: "soft"
      add :introduced_at_revision, :integer, null: false
      add :superseded_at_revision, :integer
      add :owner_user_id, :binary_id
      add :stale, :boolean, null: false, default: false
      add :conflicted, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:decision_evidences, [:decision_id, :dimension])
    create index(:decision_evidences, [:decision_id, :privacy_class])
    create index(:decision_evidences, [:decision_id, :introduced_at_revision])

    create table(:decision_mutation_keys, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :actor_user_id, :binary_id, null: false
      add :idempotency_key, :string, null: false
      add :decision_id, references(:decision_contexts, type: :binary_id, on_delete: :delete_all),
        null: false

      add :result_revision, :integer, null: false
      add :operation, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:decision_mutation_keys, [:actor_user_id, :idempotency_key])
    create index(:decision_mutation_keys, [:decision_id])
  end
end
