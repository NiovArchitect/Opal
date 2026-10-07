defmodule OpalCore.Repo.Migrations.IntelligenceEvents do
  use Ecto.Migration

  def change do
    create table(:intelligence_events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :type, :string, null: false
      add :actor_id, :binary_id, null: false
      add :conversation_id, :binary_id
      add :occurred_at, :utc_datetime_usec, null: false
      add :payload, :map, null: false, default: %{}
      add :idempotency_key, :string

      timestamps(type: :utc_datetime_usec)
    end

    create index(:intelligence_events, [:actor_id, :occurred_at])
    create index(:intelligence_events, [:type, :occurred_at])
    create index(:intelligence_events, [:conversation_id, :occurred_at])
    create unique_index(:intelligence_events, [:idempotency_key],
      where: "idempotency_key IS NOT NULL",
      name: :intelligence_events_idempotency_key_index
    )

    create table(:intelligence_extractions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :event_id, references(:intelligence_events, type: :binary_id, on_delete: :delete_all),
        null: false
      add :intent, :string, null: false
      add :entities, :map, null: false, default: %{}
      add :vibe, :map, null: false, default: %{}
      add :raw, :map, null: false, default: %{}
      add :latency_ms, :integer

      timestamps(type: :utc_datetime_usec)
    end

    create index(:intelligence_extractions, [:event_id])
    create index(:intelligence_extractions, [:intent])

    create table(:intelligence_decisions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :event_id, references(:intelligence_events, type: :binary_id, on_delete: :delete_all),
        null: false
      add :extraction_id, references(:intelligence_extractions, type: :binary_id, on_delete: :nilify_all)
      add :action, :string, null: false
      add :reason, :text, null: false
      add :confidence, :float, null: false
      add :payload, :map, null: false, default: %{}
      add :context_snapshot, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:intelligence_decisions, [:event_id])
    create index(:intelligence_decisions, [:action, :confidence])

    create table(:intelligence_actions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :decision_id,
          references(:intelligence_decisions, type: :binary_id, on_delete: :delete_all),
          null: false
      add :status, :string, null: false, default: "pending"
      add :result, :map, null: false, default: %{}
      add :attempts, :integer, null: false, default: 0
      add :idempotency_key, :string

      timestamps(type: :utc_datetime_usec)
    end

    create index(:intelligence_actions, [:decision_id])
    create unique_index(:intelligence_actions, [:idempotency_key],
      where: "idempotency_key IS NOT NULL",
      name: :intelligence_actions_idempotency_key_index
    )

    create table(:intelligence_feedback, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :decision_id, references(:intelligence_decisions, type: :binary_id, on_delete: :nilify_all)
      add :action_id, references(:intelligence_actions, type: :binary_id, on_delete: :nilify_all)
      add :actor_id, :binary_id, null: false
      add :signal, :string, null: false
      add :detail, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:intelligence_feedback, [:actor_id, :inserted_at])
    create index(:intelligence_feedback, [:signal])
  end
end
