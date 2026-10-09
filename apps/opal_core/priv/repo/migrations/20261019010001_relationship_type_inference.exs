defmodule OpalCore.Repo.Migrations.RelationshipTypeInference do
  use Ecto.Migration

  def up do
    alter table(:relationship_types) do
      # explicit | provisional | confirmed
      add :source, :string, null: false, default: "explicit"
      # pending_confirm | confirmed | dismissed | nil (for explicit never-prompted)
      add :inference_status, :string
      add :inference_shown_at, :utc_datetime_usec
      add :inference_resolved_at, :utc_datetime_usec
      add :inference_signals, :map
    end

    create index(:relationship_types, [:user_id, :inference_status])
  end

  def down do
    drop_if_exists index(:relationship_types, [:user_id, :inference_status])

    alter table(:relationship_types) do
      remove :source
      remove :inference_status
      remove :inference_shown_at
      remove :inference_resolved_at
      remove :inference_signals
    end
  end
end
