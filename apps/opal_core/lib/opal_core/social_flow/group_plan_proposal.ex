defmodule OpalCore.SocialFlow.GroupPlanProposal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_plan_proposals" do
    field :activity, :string
    field :status, :string
    field :visibility, :string, default: "shared"
    field :source_message_ids, {:array, :binary_id}, default: []
    field :participant_ids, {:array, :binary_id}, default: []
    field :required_participant_ids, {:array, :binary_id}, default: []
    field :optional_participant_ids, {:array, :binary_id}, default: []
    field :recommended_copy, :string
    field :raw_candidate, :map
    field :idempotency_key, :string
    field :expires_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec
    field :converted_plan_id, :binary_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :created_by_user, OpalCore.Accounts.User, foreign_key: :created_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :conversation_id,
      :created_by_user_id,
      :activity,
      :status,
      :visibility,
      :source_message_ids,
      :participant_ids,
      :required_participant_ids,
      :optional_participant_ids,
      :recommended_copy,
      :raw_candidate,
      :idempotency_key,
      :expires_at,
      :superseded_at,
      :converted_plan_id
    ])
    |> validate_required([:conversation_id, :created_by_user_id, :status, :idempotency_key])
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "id" => p.id,
      "conversation_id" => p.conversation_id,
      "created_by_user_id" => p.created_by_user_id,
      "activity" => p.activity,
      "status" => p.status,
      "recommended_copy" => p.recommended_copy,
      "participant_ids" => p.participant_ids || [],
      "required_participant_ids" => p.required_participant_ids || [],
      "visibility" => p.visibility
    }
  end
end
