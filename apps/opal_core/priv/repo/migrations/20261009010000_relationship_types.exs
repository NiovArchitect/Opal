defmodule OpalCore.Repo.Migrations.RelationshipTypes do
  use Ecto.Migration

  def up do
    create table(:relationship_types, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :contact_user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :type, :string, null: false
      add :communication_bounds, :map

      timestamps(type: :utc_datetime_usec)
    end

    create index(:relationship_types, [:user_id])
    create index(:relationship_types, [:contact_user_id])
    create unique_index(:relationship_types, [:user_id, :contact_user_id])
  end

  def down do
    drop table(:relationship_types)
  end
end
