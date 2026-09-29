defmodule OpalCore.Repo.Migrations.UserAssistCallsEnabled do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :assist_calls_enabled, :boolean
    end
  end
end
