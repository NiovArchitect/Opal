defmodule OpalCore.SocialFlow.RelationshipMemory do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "personal_relationship_memories" do
    field :counterpart_user_id, :binary_id
    field :summary, :string
    field :purpose, :string
    field :visibility, :string, default: "private"
    field :review_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :correction_state, :string, default: "none"
    field :deletion_state, :string, default: "active"
    field :handled_at, :utc_datetime_usec
    field :forgotten_at, :utc_datetime_usec

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation

    belongs_to :source_candidate, OpalCore.SocialFlow.MemoryCandidate,
      foreign_key: :source_candidate_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :counterpart_user_id,
      :source_candidate_id,
      :summary,
      :purpose,
      :visibility,
      :review_at,
      :expires_at,
      :correction_state,
      :deletion_state,
      :handled_at,
      :forgotten_at
    ])
    |> validate_required([:owner_user_id, :summary, :purpose, :visibility, :deletion_state])
    |> validate_inclusion(:visibility, ~w(private))
    |> validate_inclusion(:deletion_state, ~w(active deleted forgotten handled))
  end

  def to_contract(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "owner_user_id" => m.owner_user_id,
      "conversation_id" => m.conversation_id,
      "counterpart_user_id" => m.counterpart_user_id,
      "summary" => m.summary,
      "purpose" => m.purpose,
      "visibility" => m.visibility,
      "deletion_state" => m.deletion_state,
      "review_at" => dt(m.review_at),
      "created_at" => dt(m.inserted_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
