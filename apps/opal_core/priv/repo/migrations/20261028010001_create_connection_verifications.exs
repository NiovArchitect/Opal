defmodule OpalCore.Repo.Migrations.CreateConnectionVerifications do
  use Ecto.Migration

  # Repair #18 DIR-2 — the connections verification ledger (verification
  # report Part 4.4). Additive only: one new table, no existing table or
  # column touched. One row per verification EVENT (a read-only provider
  # probe, or a recorded function-evidence hook). Statuses in Settings >
  # Connections are COMPUTED from config presence + these rows; a row is
  # never written by a settings page view. No credential value, fragment,
  # or length is ever a column — provider error CODES only.
  def change do
    create table(:connection_verifications, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :connection_id, :string, null: false
      add :kind, :string, null: false
      add :outcome, :string, null: false
      add :provider_error_code, :string
      add :build_ref, :string
      add :recorded_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:connection_verifications, [:connection_id, :recorded_at])
  end
end
