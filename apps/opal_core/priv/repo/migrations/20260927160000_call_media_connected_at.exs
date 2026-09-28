defmodule OpalCore.Repo.Migrations.CallMediaConnectedAt do
  use Ecto.Migration

  def change do
    alter table(:call_sessions) do
      add :media_connected_at, :utc_datetime_usec
    end
  end
end
