defmodule OpalCore.Repo.Migrations.SharedPlanAlignment do
  use Ecto.Migration

  def change do
    alter table(:shared_plans) do
      add :alignment, :map, default: %{}
    end
  end
end
