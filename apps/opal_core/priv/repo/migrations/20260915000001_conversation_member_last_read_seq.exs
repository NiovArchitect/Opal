defmodule OpalCore.Repo.Migrations.ConversationMemberLastReadSeq do
  use Ecto.Migration

  def change do
    alter table(:conversation_members) do
      add :last_read_server_seq, :integer, null: false, default: 0
    end
  end
end
