defmodule OpalCore.Repo.Migrations.CreatePlanPrivacyMarks do
  use Ecto.Migration

  # Founder Polish Wave (Cluster C, P3) - additive only.
  #
  # plan_privacy_marks: PER-VIEWER vault state. One row means the
  # row's user moved the plan into THEIR OWN "My private graphs";
  # it hides the plan from that viewer's surfaces only and is
  # invisible to every other party (see PlanPrivacyMark).
  #
  # Data step: every plan carrying the legacy W7 global flag
  # (shared_plans.is_private) gets a mark for its CREATOR, so the
  # creator's vault contents are exactly what they were. Other
  # participants regain their own view of those plans, per the
  # founder's per-viewer rule. The legacy column itself is left in
  # place (no destructive change); nothing reads it as an exclusion
  # anymore.
  def change do
    create table(:plan_privacy_marks, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :binary_id, null: false
      add :plan_id, :binary_id, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:plan_privacy_marks, [:user_id, :plan_id],
             name: :plan_privacy_marks_user_plan_index
           )

    create index(:plan_privacy_marks, [:plan_id])

    execute(
      """
      INSERT INTO plan_privacy_marks (id, user_id, plan_id, inserted_at, updated_at)
      SELECT gen_random_uuid(), created_by_user_id, id, NOW(), NOW()
      FROM shared_plans
      WHERE is_private = true
      ON CONFLICT (user_id, plan_id) DO NOTHING
      """,
      ""
    )
  end
end
