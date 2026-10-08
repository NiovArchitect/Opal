defmodule OpalCore.Repo.Migrations.CreateGroupDecisionStates do
  use Ecto.Migration

  def change do
    create table(:group_decision_states, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :conversation_id, :binary_id, null: false
      add :topic, :string, null: false
      add :proposals, {:array, :map}, null: false, default: []
      add :consensus_status, :string, null: false, default: "open"
      add :silent_participants, {:array, :binary_id}, null: false, default: []
      add :last_activity_at, :utc_datetime_usec
      add :mediation_dismissed_until, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:group_decision_states, [:account_id])
    create unique_index(:group_decision_states, [:account_id, :conversation_id, :topic],
             name: :group_decision_states_account_conv_topic_index
           )
  end
end
