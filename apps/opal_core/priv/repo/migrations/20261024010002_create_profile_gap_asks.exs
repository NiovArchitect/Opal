defmodule OpalCore.Repo.Migrations.CreateProfileGapAsks do
  @moduledoc """
  Repair #15 Track C — progressive profile-building ask ledger.

  One row per (owner_user_id, person_id, fact_key). Records that a fact was
  asked about, answered, or skipped so the QUIET law (ask at most once, never
  nag) is enforceable across flows and restarts. Additive: new table only.
  """
  use Ecto.Migration

  def up do
    create table(:profile_gap_asks, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :person_id, :binary_id, null: false
      add :fact_key, :string, null: false
      add :status, :string, null: false, default: "asked"
      add :asked_in_flow, :string
      add :answered_value, :string
      add :asked_at, :utc_datetime_usec
      add :resolved_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:profile_gap_asks, [:owner_user_id, :person_id, :fact_key])
    create index(:profile_gap_asks, [:owner_user_id])
  end

  def down do
    drop table(:profile_gap_asks)
  end
end
