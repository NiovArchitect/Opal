defmodule OpalCore.SocialFlow.OpenLoop do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "open_loops" do
    field :loop_type, :string
    field :summary, :string
    field :status, :string
    field :source_message_ids, {:array, :binary_id}, default: []
    field :answered_parts, {:array, :string}, default: []
    field :unanswered_parts, {:array, :string}, default: []
    field :resolved_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec
    field :idempotency_key, :string

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :insight, OpalCore.SocialFlow.ConversationInsight

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(o, attrs) do
    o
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :loop_type,
      :summary,
      :status,
      :source_message_ids,
      :answered_parts,
      :unanswered_parts,
      :insight_id,
      :resolved_at,
      :superseded_at,
      :idempotency_key
    ])
    |> validate_required([
      :owner_user_id,
      :conversation_id,
      :loop_type,
      :summary,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:status, ~w(open partially_answered resolved superseded dismissed))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = o) do
    %{
      "id" => o.id,
      "owner_user_id" => o.owner_user_id,
      "conversation_id" => o.conversation_id,
      "loop_type" => o.loop_type,
      "summary" => o.summary,
      "status" => o.status,
      "source_message_ids" => o.source_message_ids || [],
      "answered_parts" => o.answered_parts || [],
      "unanswered_parts" => o.unanswered_parts || [],
      "insight_id" => o.insight_id
    }
  end
end
