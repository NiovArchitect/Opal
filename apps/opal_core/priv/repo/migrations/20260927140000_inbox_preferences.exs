defmodule OpalCore.Repo.Migrations.InboxPreferences do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :read_receipts_enabled, :boolean, null: false, default: true
      add :message_notifications_enabled, :boolean, null: false, default: true
    end

    alter table(:conversation_members) do
      add :notifications_muted, :boolean, null: false, default: false
    end
  end
end
