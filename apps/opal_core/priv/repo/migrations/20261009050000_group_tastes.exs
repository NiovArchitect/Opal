defmodule OpalCore.Repo.Migrations.GroupTastes do
  use Ecto.Migration

  def up do
    create table(:group_tastes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :group_hash, :string, null: false
      add :member_ids, {:array, :string}, null: false
      add :vibes, :map
      add :cuisines, :map
      add :price_comfort, :string
      add :temporal_patterns, :map
      add :plan_count, :integer, null: false, default: 0
      add :last_plan_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:group_tastes, [:group_hash])
    create index(:group_tastes, [:plan_count])

    alter table(:users) do
      add :group_taste_opt_out, :boolean, null: false, default: false
    end
  end

  def down do
    alter table(:users) do
      remove :group_taste_opt_out
    end

    drop table(:group_tastes)
  end
end
