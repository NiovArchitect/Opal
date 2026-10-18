defmodule OpalCore.Repo.Migrations.CreateCheckinSweeps do
  @moduledoc """
  Repair #18 Division B, Track B3 - circle check-in sweep.

  Two additive tables only (design section 4.1): the sweep (a frozen
  member snapshot resolved from one existing source) and one response
  row per askable target, PRE-CREATED in status "asked" so
  "unanswered" is a stored state read directly, never a set
  difference computed per surface. The Repair #17 fallback build
  ignores both tables and runs against the same database unchanged.
  """
  use Ecto.Migration

  def up do
    create table(:checkin_sweeps, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :organizer_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :source_kind, :string, null: false
      add :source_ref_id, :binary_id
      add :source_filter, :map, default: %{}
      add :circle_key, :string, null: false
      add :circle_label, :string, null: false
      add :member_ids, {:array, :binary_id}, null: false, default: []
      add :not_askable_ids, {:array, :binary_id}, null: false, default: []
      add :minor_ids, {:array, :binary_id}, null: false, default: []
      add :prompt_theme, :string
      add :status, :string, null: false, default: "open"
      add :expires_at, :utc_datetime_usec, null: false
      add :closed_at, :utc_datetime_usec
      add :close_reason, :string
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:checkin_sweeps, [:idempotency_key])
    create index(:checkin_sweeps, [:organizer_user_id, :inserted_at])

    # The one-open-sweep-per-circle law, enforced by the database.
    execute(
      "CREATE UNIQUE INDEX checkin_sweeps_one_open_per_circle " <>
        "ON checkin_sweeps (organizer_user_id, circle_key) WHERE status = 'open'",
      "DROP INDEX checkin_sweeps_one_open_per_circle"
    )

    create table(:checkin_responses, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :sweep_id,
          references(:checkin_sweeps, type: :binary_id, on_delete: :delete_all),
          null: false

      add :member_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :status, :string, null: false, default: "asked"
      add :okay, :string
      add :where_text, :string
      add :needs_text, :string
      add :free_text, :string
      add :shared_area, :map
      add :answer_source, :string
      add :delivery_state, :string, null: false, default: "deliverable"
      add :responded_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:checkin_responses, [:sweep_id, :member_user_id])
    create index(:checkin_responses, [:sweep_id])
  end

  def down do
    drop table(:checkin_responses)
    drop table(:checkin_sweeps)
  end
end
