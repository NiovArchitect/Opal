defmodule OpalCore.Repo.Migrations.PasteFProductSurfaceColumns do
  use Ecto.Migration

  def change do
    alter table(:group_decision_states) do
      add :mediation_meta, :map, default: %{}
    end

    alter table(:weekly_briefings) do
      add :dismissed_at, :utc_datetime_usec
      add :structured, :map, default: %{}
    end
  end
end
