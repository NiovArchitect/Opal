defmodule OpalCore.Repo.Migrations.CreatePlanMemories do
  use Ecto.Migration

  def change do
    create table(:plan_memories, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :plan_id, :binary_id, null: false
      add :user_role, :string, null: false, default: "participant"
      add :user_commitments, {:array, :map}, null: false, default: []
      add :related_conversation_ids, {:array, :binary_id}, null: false, default: []
      add :status, :string, null: false, default: "active"
      add :plan_label, :string
      add :time_label, :string
      add :place_label, :string
      add :start_at, :utc_datetime_usec
      add :end_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:plan_memories, [:account_id, :plan_id],
             name: :plan_memories_account_plan_index
           )

    create index(:plan_memories, [:account_id, :status])
  end
end
