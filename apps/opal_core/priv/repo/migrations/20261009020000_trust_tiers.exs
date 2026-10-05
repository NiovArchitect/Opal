defmodule OpalCore.Repo.Migrations.TrustTiers do
  use Ecto.Migration

  def up do
    create table(:trust_tiers, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :tier, :string, null: false
      add :granted_at, :utc_datetime_usec, null: false
      add :granted_by, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:trust_tiers, [:user_id])
  end

  def down do
    drop table(:trust_tiers)
  end
end
