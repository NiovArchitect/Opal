defmodule OpalCore.Repo.Migrations.CreateSupportReportsAndNotificationsPaused do
  use Ecto.Migration

  # Repair #18 DIR-2 / Muse settings audit Group A — additive only.
  # A5: a real support intake (a queue a human reads) for "Report a
  # problem" and "Submit feedback". A report carries ONLY what the
  # page's disclosure lists: the user's words, a category, the kind
  # (problem | feedback), the served build identity the client read
  # from the build stamp, and the account it came from.
  # A2: the Quiet master switch is a real column on the user record,
  # beside the per-kind switches it pauses (which it never rewrites,
  # so unpausing restores them exactly).
  def change do
    create table(:support_reports, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :reference, :string, null: false
      add :user_id, :binary_id, null: false
      add :kind, :string, null: false
      add :category, :string, null: false
      add :body, :string, null: false
      add :build_ref, :string
      add :status, :string, null: false, default: "received"

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:support_reports, [:reference])
    create index(:support_reports, [:user_id, :inserted_at])

    alter table(:users) do
      add :notifications_paused, :boolean, null: false, default: false
    end
  end
end
