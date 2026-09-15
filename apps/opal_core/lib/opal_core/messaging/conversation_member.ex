defmodule OpalCore.Messaging.ConversationMember do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "conversation_members" do
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :user, OpalCore.Accounts.User

    # Slice #1 — durable unread: messages with server_seq > this (from others) are unread.
    field :last_read_server_seq, :integer, default: 0

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(member, attrs) do
    member
    |> cast(attrs, [:id, :conversation_id, :user_id, :last_read_server_seq])
    |> validate_required([:conversation_id, :user_id])
    |> unique_constraint([:conversation_id, :user_id])
  end
end
