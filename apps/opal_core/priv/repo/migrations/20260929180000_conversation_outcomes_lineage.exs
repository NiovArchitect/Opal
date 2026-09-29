defmodule OpalCore.Repo.Migrations.ConversationOutcomesLineage do
  use Ecto.Migration

  def up do
    # Chat and other sources may record outcomes without a call session.
    execute("ALTER TABLE call_outcomes DROP CONSTRAINT IF EXISTS call_outcomes_call_id_fkey")

    alter table(:call_outcomes) do
      modify :call_id, :binary_id, null: true

      add :source_type, :string
      add :proposer_user_id, :binary_id
      add :accepter_user_id, :binary_id
      add :actor_user_id, :binary_id
      add :entity_type, :string
      add :before_value, :string
      add :after_value, :string
      add :status, :string, null: false, default: "recorded"
      add :plan_id, :binary_id
      add :plan_version, :integer
      add :proposal_key, :string
      add :idempotency_key, :string
      add :provenance, :map, null: false, default: %{}
    end

    execute("""
    ALTER TABLE call_outcomes
    ADD CONSTRAINT call_outcomes_call_id_fkey
    FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
    """)

    create unique_index(:call_outcomes, [:idempotency_key],
             name: :call_outcomes_idempotency_key_uniq,
             where: "idempotency_key IS NOT NULL"
           )

    create index(:call_outcomes, [:plan_id])
    create index(:call_outcomes, [:source_type])
    create index(:call_outcomes, [:outcome_type, :conversation_id])

    execute(
      "UPDATE call_outcomes SET outcome_type = 'plan_time_proposed' WHERE outcome_type = 'plan_time_proposal'"
    )

    execute(
      "UPDATE call_outcomes SET outcome_type = 'plan_activity_proposed' WHERE outcome_type = 'activity_proposal'"
    )

    execute(
      "UPDATE call_outcomes SET outcome_type = 'plan_time_changed' WHERE outcome_type = 'plan_time_accepted'"
    )

    execute(
      "UPDATE call_outcomes SET outcome_type = 'plan_activity_changed' WHERE outcome_type = 'activity_accepted'"
    )

    execute("""
    UPDATE call_outcomes
    SET source_type = COALESCE(source_type, 'call_transcript'),
        after_value = COALESCE(after_value, entity_id),
        entity_type = COALESCE(entity_type, 'shared_plan')
    """)
  end

  def down do
    execute(
      "UPDATE call_outcomes SET outcome_type = 'plan_time_proposal' WHERE outcome_type = 'plan_time_proposed'"
    )

    execute(
      "UPDATE call_outcomes SET outcome_type = 'activity_proposal' WHERE outcome_type = 'plan_activity_proposed'"
    )

    execute(
      "UPDATE call_outcomes SET outcome_type = 'plan_time_accepted' WHERE outcome_type = 'plan_time_changed'"
    )

    execute(
      "UPDATE call_outcomes SET outcome_type = 'activity_accepted' WHERE outcome_type = 'plan_activity_changed'"
    )

    drop_if_exists index(:call_outcomes, [:outcome_type, :conversation_id])
    drop_if_exists index(:call_outcomes, [:source_type])
    drop_if_exists index(:call_outcomes, [:plan_id])
    drop_if_exists index(:call_outcomes, [:idempotency_key], name: :call_outcomes_idempotency_key_uniq)

    execute("ALTER TABLE call_outcomes DROP CONSTRAINT IF EXISTS call_outcomes_call_id_fkey")
    execute("DELETE FROM call_outcomes WHERE call_id IS NULL")

    alter table(:call_outcomes) do
      remove :provenance
      remove :idempotency_key
      remove :proposal_key
      remove :plan_version
      remove :plan_id
      remove :status
      remove :after_value
      remove :before_value
      remove :entity_type
      remove :actor_user_id
      remove :accepter_user_id
      remove :proposer_user_id
      remove :source_type

      modify :call_id, :binary_id, null: false
    end

    execute("""
    ALTER TABLE call_outcomes
    ADD CONSTRAINT call_outcomes_call_id_fkey
    FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
    """)
  end
end
