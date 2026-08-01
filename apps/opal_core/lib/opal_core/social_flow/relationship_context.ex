defmodule OpalCore.SocialFlow.RelationshipContext do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "relationship_contexts" do
    field :status, :string, default: "active"
    field :stop_suggestions, :boolean, default: false
    field :archive_shared, :boolean, default: false
    field :note, :string
    field :paused_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :conversation_id,
      :owner_user_id,
      :status,
      :stop_suggestions,
      :archive_shared,
      :note,
      :paused_at,
      :idempotency_key
    ])
    |> validate_required([:conversation_id, :owner_user_id, :status, :idempotency_key])
    |> validate_inclusion(:status, ~w(active paused stopped archived))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "conversation_id" => c.conversation_id,
      "owner_user_id" => c.owner_user_id,
      "status" => c.status,
      "stop_suggestions" => c.stop_suggestions,
      "archive_shared" => c.archive_shared,
      "no_breakup_inference" => true,
      "no_guilt_prompt" => true
    }
  end
end
