defmodule OpalCore.Repo.Migrations.CreateSocialMomentEngagement do
  use Ecto.Migration

  def change do
    create table(:social_moment_likes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :moment_id, references(:social_moments, type: :binary_id, on_delete: :delete_all), null: false
      add :viewer_user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :status, :string, null: false, default: "active"
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:social_moment_likes, [:moment_id, :viewer_user_id],
             name: :social_moment_likes_moment_viewer_index
           )

    create index(:social_moment_likes, [:viewer_user_id, :status])

    create table(:social_moment_comments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :moment_id, references(:social_moments, type: :binary_id, on_delete: :delete_all), null: false
      add :author_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :body, :text, null: false
      add :deleted_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create index(:social_moment_comments, [:moment_id, :inserted_at])
    create index(:social_moment_comments, [:author_user_id])

    create table(:social_moment_reposts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :moment_id, references(:social_moments, type: :binary_id, on_delete: :delete_all), null: false
      add :viewer_user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :status, :string, null: false, default: "active"
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:social_moment_reposts, [:moment_id, :viewer_user_id],
             name: :social_moment_reposts_moment_viewer_index
           )

    create table(:social_moment_saves, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :moment_id, references(:social_moments, type: :binary_id, on_delete: :delete_all), null: false
      add :viewer_user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :status, :string, null: false, default: "active"
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:social_moment_saves, [:moment_id, :viewer_user_id],
             name: :social_moment_saves_moment_viewer_index
           )

    # Temporary Stories — Story ≠ Memory ≠ Graph
    create table(:temporary_stories, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :author_user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :media_ref, :string, null: false, default: ""
      add :caption, :text, null: false, default: ""
      add :visibility, :string, null: false, default: "close_circle"
      add :expires_at, :utc_datetime_usec, null: false
      add :deleted_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create index(:temporary_stories, [:author_user_id, :expires_at])
    create index(:temporary_stories, [:expires_at])
  end
end
