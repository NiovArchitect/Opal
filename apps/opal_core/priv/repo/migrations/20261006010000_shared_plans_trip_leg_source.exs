defmodule OpalCore.Repo.Migrations.SharedPlansTripLegSource do
  use Ecto.Migration

  def up do
    # Allow trip-leg-created plans with no conversation (Phase 4E).
    execute("ALTER TABLE shared_plans ALTER COLUMN conversation_id DROP NOT NULL")

    alter table(:shared_plans) do
      add :source, :string, null: false, default: "conversation"
      add :trip_leg_id, references(:trip_legs, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:shared_plans, [:source])
    create index(:shared_plans, [:trip_leg_id])
  end

  def down do
    # Trip-sourced plans have null conversation_id — remove before restoring NOT NULL.
    execute("DELETE FROM shared_plans WHERE conversation_id IS NULL")

    drop_if_exists index(:shared_plans, [:trip_leg_id])
    drop_if_exists index(:shared_plans, [:source])

    alter table(:shared_plans) do
      remove :trip_leg_id
      remove :source
    end

    execute("ALTER TABLE shared_plans ALTER COLUMN conversation_id SET NOT NULL")
  end
end
