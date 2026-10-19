defmodule OpalCore.Repo.Migrations.CreateGraphPeopleAdopt1 do
  use Ecto.Migration

  # Repair #18 adoption wave 1 (graph/people cluster) - ADDITIVE ONLY:
  # two new durable owner-scoped tables. No existing table or column is
  # touched. Spark promotion provenance (ST-B) lives in the spark plan's
  # own alignment map (promoted_to_plan_id), not in a new table.
  def change do
    create table(:relationship_intentions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, :binary_id, null: false
      add :subject_user_id, :binary_id, null: false
      # The intention in the owner's own words ("See Maya every month").
      add :title, :string, null: false
      # The owner's own rhythm: how many days between kept plans they
      # are aiming for. Nullable - an intention may carry no rhythm.
      add :cadence_days, :integer
      # The one permitted missed-window surfacing is recorded against
      # the last-kept plan it was surfaced for, so it can fire at most
      # once per kept record (ST-A).
      add :missed_surfaced_for_plan_id, :binary_id

      timestamps(type: :utc_datetime_usec)
    end

    create index(:relationship_intentions, [:owner_user_id])
    create index(:relationship_intentions, [:owner_user_id, :subject_user_id])

    create table(:working_goals, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, :binary_id, null: false
      # The goal in the owner's own words ("See Dad monthly").
      add :title, :string, null: false
      # Links are ids only; the status line is DERIVED from the linked
      # SharedPlan rows at read time (4.C10) - never stored, never
      # invented.
      add :linked_plan_ids, {:array, :binary_id}, null: false, default: []

      timestamps(type: :utc_datetime_usec)
    end

    create index(:working_goals, [:owner_user_id])
  end
end
