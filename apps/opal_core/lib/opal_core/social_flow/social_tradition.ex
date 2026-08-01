defmodule OpalCore.SocialFlow.SocialTradition do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "social_traditions" do
    field :shared_memory_id, :binary_id
    field :title, :string
    field :summary, :string
    field :tradition_type, :string, default: "relationship"
    field :recurrence_rule, :map, default: %{}
    field :participant_ids, {:array, :binary_id}, default: []
    field :required_participant_ids, {:array, :binary_id}, default: []
    field :status, :string, default: "proposed"
    field :occurrence_count, :integer, default: 0
    field :next_prompt_at, :utc_datetime_usec
    field :paused_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :archived_at, :utc_datetime_usec
    field :idempotency_key, :string
    field :metadata, :map, default: %{}
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(t, attrs) do
    t
    |> cast(attrs, [
      :conversation_id,
      :shared_memory_id,
      :title,
      :summary,
      :tradition_type,
      :recurrence_rule,
      :participant_ids,
      :required_participant_ids,
      :status,
      :occurrence_count,
      :next_prompt_at,
      :paused_at,
      :ended_at,
      :archived_at,
      :idempotency_key,
      :metadata
    ])
    |> validate_required([:conversation_id, :title, :summary, :status, :idempotency_key])
    |> validate_inclusion(
      :status,
      ~w(proposed active paused skipped_once changed ended archived declined)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = t) do
    %{
      "id" => t.id,
      "conversation_id" => t.conversation_id,
      "title" => t.title,
      "summary" => t.summary,
      "tradition_type" => t.tradition_type,
      "recurrence_rule" => t.recurrence_rule || %{},
      "participant_ids" => t.participant_ids || [],
      "status" => t.status,
      "occurrence_count" => t.occurrence_count,
      "no_mandatory_attendance" => true,
      "no_streak" => true,
      "no_guilt_copy" => true
    }
  end
end
