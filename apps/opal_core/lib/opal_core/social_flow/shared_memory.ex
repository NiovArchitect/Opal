defmodule OpalCore.SocialFlow.SharedMemory do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "shared_memories" do
    field :candidate_id, :binary_id
    field :memory_class, :string, default: "shared_relationship"
    field :summary, :string
    field :purpose, :string, default: "shared continuity"
    field :source_message_ids, {:array, :binary_id}, default: []
    field :participant_ids, {:array, :binary_id}, default: []
    field :required_participant_ids, {:array, :binary_id}, default: []
    field :status, :string, default: "pending_consent"
    field :visibility, :string, default: "shared"
    field :review_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :paused_at, :utc_datetime_usec
    field :archived_at, :utc_datetime_usec
    field :deleted_at, :utc_datetime_usec
    field :deletion_state, :string, default: "active"
    field :idempotency_key, :string
    field :metadata, :map, default: %{}
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :conversation_id,
      :candidate_id,
      :memory_class,
      :summary,
      :purpose,
      :source_message_ids,
      :participant_ids,
      :required_participant_ids,
      :status,
      :visibility,
      :review_at,
      :expires_at,
      :paused_at,
      :archived_at,
      :deleted_at,
      :deletion_state,
      :idempotency_key,
      :metadata
    ])
    |> validate_required([:conversation_id, :summary, :status, :idempotency_key, :deletion_state])
    |> validate_inclusion(
      :status,
      ~w(pending_consent active paused archived dissolved deleted declined)
    )
    |> validate_inclusion(:deletion_state, ~w(active deleted forgotten))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "conversation_id" => m.conversation_id,
      "memory_class" => m.memory_class,
      "summary" => m.summary,
      "purpose" => m.purpose,
      "participant_ids" => m.participant_ids || [],
      "required_participant_ids" => m.required_participant_ids || [],
      "status" => m.status,
      "visibility" => m.visibility,
      "deletion_state" => m.deletion_state,
      "review_at" => m.review_at && DateTime.to_iso8601(m.review_at),
      "not_auto_recurrence" => true
    }
  end
end
