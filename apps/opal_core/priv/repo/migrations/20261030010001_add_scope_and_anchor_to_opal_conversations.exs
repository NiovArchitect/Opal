defmodule OpalCore.Repo.Migrations.AddScopeAndAnchorToOpalConversations do
  use Ecto.Migration

  # Repair #19 (W14 + Orbits supersession) — additive only.
  # An Opal conversation may be SCOPED at birth (person / plan /
  # person-thread conversation it came from) and carries ONE primary
  # ANCHOR (type + id) — its orbit. The anchor is the one filing
  # truth; facets stay derived and are never stored. orbit_private is
  # the orbit's private flag (item-9 gate seam; verification is wired
  # by the coordinator, this migration only carries the flag).
  def up do
    alter table(:opal_conversations) do
      add :context_person_id, :binary_id
      add :context_plan_id, :binary_id
      add :context_conversation_id, :binary_id
      add :anchor_type, :string
      # A string, not a uuid: place anchors carry provider place ids.
      add :anchor_id, :string
      add :anchor_label, :string
      add :orbit_private, :boolean, default: false, null: false
      # Conversation chrome (Repair #19 addition): the user's own
      # pin + archive. Distinct from archived_at, which is session
      # ROTATION (superseded by a newer chat) — conflating the two
      # would hide every rotated session from the log.
      add :pinned_at, :utc_datetime_usec
      add :user_archived_at, :utc_datetime_usec
    end

    create index(:opal_conversations, [:user_id, :context_person_id],
             name: :opal_conversations_user_person_idx
           )

    create index(:opal_conversations, [:user_id, :anchor_type, :anchor_id],
             name: :opal_conversations_user_anchor_idx
           )
  end

  def down do
    drop index(:opal_conversations, [:user_id, :anchor_type, :anchor_id],
           name: :opal_conversations_user_anchor_idx
         )

    drop index(:opal_conversations, [:user_id, :context_person_id],
           name: :opal_conversations_user_person_idx
         )

    alter table(:opal_conversations) do
      remove :user_archived_at
      remove :pinned_at
      remove :orbit_private
      remove :anchor_label
      remove :anchor_id
      remove :anchor_type
      remove :context_conversation_id
      remove :context_plan_id
      remove :context_person_id
    end
  end
end
