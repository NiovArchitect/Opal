defmodule OpalCore.SocialFlow.DecisionSummary do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "decision_summaries" do
    field :confirmed, :map, default: %{}
    field :still_open, :map, default: %{}
    field :handled, :map, default: %{}
    field :source_lineage, :map, default: %{}
    field :privacy_class, :string, default: "private"

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(s, attrs) do
    s
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :confirmed,
      :still_open,
      :handled,
      :source_lineage,
      :privacy_class
    ])
    |> validate_required([:owner_user_id, :conversation_id, :privacy_class])
    |> validate_inclusion(:privacy_class, ~w(private))
  end

  def to_contract(%__MODULE__{} = s) do
    %{
      "id" => s.id,
      "owner_user_id" => s.owner_user_id,
      "conversation_id" => s.conversation_id,
      "confirmed" => s.confirmed["items"] || s.confirmed["list"] || [],
      "still_open" => s.still_open["items"] || s.still_open["list"] || [],
      "handled" => s.handled["items"] || s.handled["list"] || [],
      "source_lineage" => s.source_lineage || %{},
      "privacy_class" => s.privacy_class,
      "created_at" => DateTime.to_iso8601(s.inserted_at)
    }
  end
end
