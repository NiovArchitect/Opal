defmodule OpalCore.SocialFlow.FamilyConversation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "family_conversations" do
    field :kind, :string, default: "guardian_youth"
    field :idempotency_key, :string
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [:family_id, :conversation_id, :kind, :idempotency_key])
    |> validate_required([:family_id, :conversation_id, :kind, :idempotency_key])
    |> unique_constraint(:idempotency_key)
  end
end
