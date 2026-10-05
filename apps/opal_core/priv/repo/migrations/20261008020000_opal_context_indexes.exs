defmodule OpalCore.Repo.Migrations.OpalContextIndexes do
  use Ecto.Migration

  def up do
    create_if_not_exists index(:shared_plans, [:inserted_at])
    create_if_not_exists index(:plan_participants, [:user_id])
    create_if_not_exists index(:messages, [:conversation_id, :inserted_at])
    create_if_not_exists index(:messages, [:inserted_at])
  end

  def down do
    drop_if_exists index(:messages, [:inserted_at])
    drop_if_exists index(:messages, [:conversation_id, :inserted_at])
    drop_if_exists index(:plan_participants, [:user_id])
    drop_if_exists index(:shared_plans, [:inserted_at])
  end
end
