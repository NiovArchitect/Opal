defmodule OpalCore.Repo.Migrations.CenterProviderActionJobs do
  use Ecto.Migration

  def change do
    alter table(:opal_conversations) do
      add :planning_context, :map
    end

    create table(:provider_action_jobs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :binary_id, null: false
      add :conversation_id, :binary_id
      add :message_id, :binary_id
      add :plan_id, :binary_id
      add :kind, :string, null: false, default: "places_search"
      add :status, :string, null: false, default: "queued"
      add :provider, :string
      add :search_geography, :string
      add :request, :map, null: false, default: %{}
      add :planning_snapshot, :map, null: false, default: %{}
      add :result, :map
      add :error, :string
      add :started_at, :utc_datetime_usec
      add :finished_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:provider_action_jobs, [:user_id, :inserted_at])
    create index(:provider_action_jobs, [:conversation_id])
    create index(:provider_action_jobs, [:status])
  end
end
