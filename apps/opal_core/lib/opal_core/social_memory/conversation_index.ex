defmodule OpalCore.SocialMemory.ConversationIndex do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "conversation_index" do
    field :account_id, :binary_id
    field :conversation_id, :binary_id
    field :rolling_summary, :string
    field :key_entities, :map, default: %{}
    field :open_questions, {:array, :string}, default: []
    field :message_count_at_summary, :integer, default: 0
    field :message_count, :integer, default: 0
    field :last_activity_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :conversation_id,
      :rolling_summary,
      :key_entities,
      :open_questions,
      :message_count_at_summary,
      :message_count,
      :last_activity_at
    ])
    |> validate_required([:account_id, :conversation_id])
    |> unique_constraint([:account_id, :conversation_id],
      name: :conversation_index_account_conversation_index
    )
  end
end
