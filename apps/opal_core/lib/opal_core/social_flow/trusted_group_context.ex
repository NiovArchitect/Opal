defmodule OpalCore.SocialFlow.TrustedGroupContext do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trusted_group_contexts" do
    field :group_type, :string, default: "trusted_friends"
    field :status, :string, default: "active"
    field :min_size, :integer, default: 3
    field :max_size, :integer, default: 8
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(g, attrs) do
    g
    |> cast(attrs, [:conversation_id, :group_type, :status, :min_size, :max_size])
    |> validate_required([:conversation_id, :group_type, :status])
    |> unique_constraint(:conversation_id)
  end
end
