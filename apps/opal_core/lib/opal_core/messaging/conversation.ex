defmodule OpalCore.Messaging.Conversation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "conversations" do
    field :label, :string
    field :next_server_seq, :integer, default: 1

    has_many :members, OpalCore.Messaging.ConversationMember

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [:id, :label, :next_server_seq])
    |> validate_required([:label])
    |> validate_number(:next_server_seq, greater_than: 0)
  end
end
