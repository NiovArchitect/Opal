defmodule OpalCore.Repo.Migrations.CreateIntelligenceDailyMetrics do
  use Ecto.Migration

  def change do
    create table(:intelligence_daily_metrics, primary_key: false) do
      add :id, :binary_id, primary_key: true
      # nil account_id = global aggregate row for the day
      add :account_id, :binary_id
      add :day, :date, null: false
      add :metrics, :map, null: false, default: %{}
      add :alerts, {:array, :string}, null: false, default: []

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:intelligence_daily_metrics, [:account_id, :day],
             name: :intelligence_daily_metrics_account_day_index,
             where: "account_id IS NOT NULL"
           )

    create unique_index(:intelligence_daily_metrics, [:day],
             name: :intelligence_daily_metrics_global_day_index,
             where: "account_id IS NULL"
           )

    create index(:intelligence_daily_metrics, [:day])
  end
end
