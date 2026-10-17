defmodule OpalCore.Repo.Migrations.AddArchivedAtToOpalConversations do
  use Ecto.Migration

  # Repair #17 (W4-7) — Opal chat sessions. Additive: one new nullable
  # column; the single-conversation unique index is replaced by a partial
  # unique index that enforces exactly one ACTIVE session per user while
  # allowing any number of archived sessions.
  def up do
    alter table(:opal_conversations) do
      add :archived_at, :utc_datetime_usec
    end

    drop unique_index(:opal_conversations, [:user_id])

    create index(:opal_conversations, [:user_id, :archived_at])

    create unique_index(:opal_conversations, [:user_id],
             where: "archived_at IS NULL",
             name: :opal_conversations_active_user_uidx
           )
  end

  def down do
    drop unique_index(:opal_conversations, [:user_id], name: :opal_conversations_active_user_uidx)

    drop index(:opal_conversations, [:user_id, :archived_at])

    create unique_index(:opal_conversations, [:user_id])

    alter table(:opal_conversations) do
      remove :archived_at
    end
  end
end
