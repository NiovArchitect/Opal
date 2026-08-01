defmodule OpalCore.SocialFlow.GroupSharedPlan do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_shared_plans" do
    field :title, :string
    field :status, :string
    field :time_label, :string
    field :location, :string
    field :timezone, :string, default: "UTC"
    field :current_revision_id, :binary_id
    field :participant_ids, {:array, :binary_id}, default: []
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :proposal, OpalCore.SocialFlow.GroupPlanProposal
    belongs_to :created_by_user, OpalCore.Accounts.User, foreign_key: :created_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :conversation_id,
      :proposal_id,
      :title,
      :status,
      :time_label,
      :location,
      :timezone,
      :current_revision_id,
      :created_by_user_id,
      :participant_ids
    ])
    |> validate_required([:conversation_id, :title, :status, :created_by_user_id, :timezone])
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "id" => p.id,
      "conversation_id" => p.conversation_id,
      "proposal_id" => p.proposal_id,
      "title" => p.title,
      "status" => p.status,
      "time_label" => p.time_label,
      "location" => p.location,
      "participant_ids" => p.participant_ids || [],
      "current_revision_id" => p.current_revision_id,
      "created_by_user_id" => p.created_by_user_id
    }
  end
end
