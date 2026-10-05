defmodule OpalCore.Repo.Migrations.FinancialProfiles do
  use Ecto.Migration

  def up do
    create table(:financial_profiles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :comfort_level, :string, null: false
      add :dining_range, :map
      add :activity_range, :map
      add :notes, :text

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:financial_profiles, [:user_id])
  end

  def down do
    drop table(:financial_profiles)
  end
end
