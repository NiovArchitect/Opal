defmodule OpalCore.SocialFlow.PrivateDraftAssist do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "private_draft_assists" do
    field :original_draft, :string
    field :suggested_draft, :string
    field :user_edited_draft, :string
    field :status, :string
    field :expires_at, :utc_datetime_usec
    field :sent_message_id, :binary_id

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :insight, OpalCore.SocialFlow.ConversationInsight

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(d, attrs) do
    d
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :insight_id,
      :original_draft,
      :suggested_draft,
      :user_edited_draft,
      :status,
      :expires_at,
      :sent_message_id
    ])
    |> validate_required([:owner_user_id, :conversation_id, :status])
    |> validate_inclusion(:status, ~w(active used discarded expired sent_as_written))
  end

  def to_contract(%__MODULE__{} = d) do
    %{
      "id" => d.id,
      "owner_user_id" => d.owner_user_id,
      "conversation_id" => d.conversation_id,
      "insight_id" => d.insight_id,
      "suggested_draft" => d.suggested_draft,
      "user_edited_draft" => d.user_edited_draft,
      "status" => d.status
    }
  end
end
