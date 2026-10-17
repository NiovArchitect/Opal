defmodule OpalCore.Repo.Migrations.OpalMessagesClientMessageId do
  use Ecto.Migration

  # Repair #13 (W4-3) — idempotency key for Center chat POSTs. Nullable so the
  # migration is non-destructive; a partial unique index enforces one user
  # message per (conversation, client_message_id) only when the key is set.
  def change do
    alter table(:opal_messages) do
      add :client_message_id, :string
    end

    create index(:opal_messages, [:conversation_id, :client_message_id],
             name: :opal_messages_conversation_client_msg_uidx,
             unique: true,
             where: "client_message_id IS NOT NULL"
           )
  end
end
