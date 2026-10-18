defmodule OpalCore.Repo.Migrations.CreateHouseholds do
  use Ecto.Migration

  # Repair #18 Division B (B5a) — household pod: explicit, consent-based
  # declaration only. Additive only: two new tables. Deliberately NOT
  # built on family_contexts (guardian/youth legal surface).
  def change do
    create table(:households, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :label, :string, null: false
      add :home_label, :string, null: false, default: "Home"
      add :created_by_user_id, :binary_id, null: false
      add :timezone, :string, null: false, default: "America/Los_Angeles"
      add :status, :string, null: false, default: "active"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:households, [:status])

    create table(:household_memberships, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :household_id, :binary_id, null: false
      add :user_id, :binary_id, null: false
      add :role, :string, null: false, default: "member"
      add :status, :string, null: false, default: "invited"
      add :is_primary, :boolean, null: false, default: false
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:household_memberships, [:household_id, :user_id],
             name: :household_memberships_household_user_uniq
           )

    create unique_index(:household_memberships, [:idempotency_key],
             name: :household_memberships_idempotency_uniq
           )

    create index(:household_memberships, [:user_id, :status])
  end
end
