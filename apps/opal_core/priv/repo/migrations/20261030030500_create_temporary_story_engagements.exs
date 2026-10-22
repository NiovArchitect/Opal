defmodule OpalCore.Repo.Migrations.CreateTemporaryStoryEngagements do
  use Ecto.Migration

  # Repair #24 (WS-1, audit D-M) - the story-engagement record.
  # One table, three kinds (comment / reply / mention) - see
  # OpalCore.SocialFlow.TemporaryStoryEngagement for the design.
  # Additive only: no existing table is altered.
  def change do
    create table(:temporary_story_engagements, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :story_id,
          references(:temporary_stories, type: :binary_id, on_delete: :delete_all),
          null: false

      add :actor_user_id,
          references(:users, type: :binary_id, on_delete: :restrict),
          null: false

      add :target_user_id,
          references(:users, type: :binary_id, on_delete: :delete_all)

      add :kind, :string, null: false
      add :body, :text
      add :deleted_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create index(:temporary_story_engagements, [:story_id, :kind, :inserted_at],
             name: :story_engagements_story_kind_index
           )

    create index(:temporary_story_engagements, [:target_user_id, :kind],
             name: :story_engagements_target_kind_index
           )

    create index(:temporary_story_engagements, [:actor_user_id, :kind],
             name: :story_engagements_actor_kind_index
           )
  end
end
