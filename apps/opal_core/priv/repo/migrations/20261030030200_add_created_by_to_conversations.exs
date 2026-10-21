defmodule OpalCore.Repo.Migrations.AddCreatedByToConversations do
  use Ecto.Migration

  # Repair #21 (W-5b) - additive only. Group membership removal needs
  # a truthful creator: until now the Conversation record carried no
  # creator at all, so no surface could honestly say who may remove
  # another member. `created_by_user_id` is written at creation by
  # the real creation paths (direct, group, connection establish).
  # Existing rows are backfilled with the earliest member on record
  # for that conversation - the best truth the record holds (every
  # creation path inserts the creator's membership first); rows with
  # no members stay null and read as "no recorded creator", in which
  # case only self-removal (leave) is permitted by the membership
  # machinery.
  def up do
    alter table(:conversations) do
      add :created_by_user_id, :binary_id
    end

    execute("""
    UPDATE conversations c
    SET created_by_user_id = (
      SELECT cm.user_id
      FROM conversation_members cm
      WHERE cm.conversation_id = c.id
      ORDER BY cm.inserted_at ASC, cm.id ASC
      LIMIT 1
    )
    WHERE c.created_by_user_id IS NULL
    """)
  end

  def down do
    alter table(:conversations) do
      remove :created_by_user_id
    end
  end
end
