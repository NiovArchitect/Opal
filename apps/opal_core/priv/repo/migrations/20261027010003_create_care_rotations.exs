defmodule OpalCore.Repo.Migrations.CreateCareRotations do
  use Ecto.Migration

  # Repair #18 Division B (B4) — care rotation primitive.
  # Additive only: two new tables, no existing table/column touched, so
  # the Repair #17 fallback build runs against the same database.
  def change do
    create table(:care_rotations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :subject_label, :string, null: false
      add :subject_user_id, :binary_id
      add :pending_subject_user_id, :binary_id
      add :subject_visible, :boolean, null: false, default: false
      add :created_by_user_id, :binary_id, null: false
      add :admin_user_id, :binary_id, null: false
      add :member_user_ids, {:array, :binary_id}, null: false, default: []
      add :pending_member_user_ids, {:array, :binary_id}, null: false, default: []
      add :next_assignee_index, :integer, null: false, default: 0
      add :cadence, :map, null: false, default: %{}
      add :timezone, :string, null: false, default: "America/Los_Angeles"
      add :conversation_id, :binary_id
      add :status, :string, null: false, default: "active"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:care_rotations, [:status])
    create index(:care_rotations, [:admin_user_id])

    create table(:care_check_ins, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :rotation_id, :binary_id, null: false
      add :occurrence_key, :string, null: false
      add :assignee_user_id, :binary_id
      add :slot_user_id, :binary_id
      add :window_start_at, :utc_datetime_usec, null: false
      add :window_end_at, :utc_datetime_usec, null: false
      add :status, :string, null: false, default: "open"
      add :done_by_user_id, :binary_id
      add :done_at, :utc_datetime_usec
      add :note, :string
      add :handoff_from_user_id, :binary_id
      add :handoff_to_user_id, :binary_id
      add :handoff_at, :utc_datetime_usec
      add :handoff_reason, :string
      add :tft_loop_id, :string
      add :missed_surfaced_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:care_check_ins, [:rotation_id, :occurrence_key],
             name: :care_check_ins_rotation_occurrence_uniq
           )

    create index(:care_check_ins, [:rotation_id, :window_end_at])
    create index(:care_check_ins, [:status, :window_end_at])
  end
end
