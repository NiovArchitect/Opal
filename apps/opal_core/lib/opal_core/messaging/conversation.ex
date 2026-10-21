defmodule OpalCore.Messaging.Conversation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "conversations" do
    field :label, :string
    field :next_server_seq, :integer, default: 1
    # Repair #21 (W-5b): who created this conversation, written at
    # creation by the real creation paths. Nullable: older rows were
    # backfilled from the earliest member on record, and a row with
    # no recorded creator honestly has none.
    field :created_by_user_id, :binary_id

    has_many :members, OpalCore.Messaging.ConversationMember

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [:id, :label, :next_server_seq, :created_by_user_id])
    |> validate_required([:label])
    |> validate_number(:next_server_seq, greater_than: 0)
  end
end
