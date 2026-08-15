defmodule OpalCore.Repo.Migrations.CreateSocialMomentsPublishing do
  use Ecto.Migration

  def change do
    create table(:social_moments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :author_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :caption, :text, null: false, default: ""
      add :social_context, :string
      add :visibility, :string, null: false, default: "friends"
      # audience_user_ids for specific_people; group conversation id optional
      add :audience_user_ids, {:array, :binary_id}, null: false, default: []
      add :group_conversation_id, :binary_id
      add :place_ref, :map, null: false, default: %{}
      add :media_ids, {:array, :binary_id}, null: false, default: []
      add :source_lineage_id, :binary_id
      add :shared_reality_id, :binary_id
      add :moderation_state, :string, null: false, default: "active"
      add :deleted_at, :utc_datetime_usec
      add :edited_at, :utc_datetime_usec
      add :commerce_led, :boolean, null: false, default: false
      add :attribution_eligible, :boolean, null: false, default: false
      timestamps(type: :utc_datetime_usec)
    end

    create index(:social_moments, [:author_user_id, :inserted_at])
    create index(:social_moments, [:visibility, :moderation_state])
    create index(:social_moments, [:deleted_at])

    create table(:social_moment_media, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :storage_backend, :string, null: false, default: "local_dev"
      add :storage_key, :string, null: false
      add :mime_type, :string, null: false, default: "image/jpeg"
      add :byte_size, :integer, null: false, default: 0
      add :width, :integer
      add :height, :integer
      add :processing_state, :string, null: false, default: "ready"
      add :moderation_state, :string, null: false, default: "active"
      add :exif_stripped, :boolean, null: false, default: true
      add :deleted_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create index(:social_moment_media, [:owner_user_id])
    create unique_index(:social_moment_media, [:storage_key])

    create table(:social_moment_hides, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :viewer_user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :moment_id, references(:social_moments, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:social_moment_hides, [:viewer_user_id, :moment_id])

    create table(:social_moment_reports, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :reporter_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :moment_id, references(:social_moments, type: :binary_id, on_delete: :delete_all), null: false
      add :category, :string, null: false, default: "inappropriate_content"
      add :note, :text
      add :status, :string, null: false, default: "submitted"
      add :idempotency_key, :string, null: false
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:social_moment_reports, [:idempotency_key])
    create index(:social_moment_reports, [:moment_id, :status])
  end
end
