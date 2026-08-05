defmodule OpalCore.SocialFlow.DynamicIntelligence.ParticipationState do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @states ~w(interested not_this_time maybe ask_later keep_private undecided)

  schema "dsi_participation_states" do
    field :state, :string, default: "undecided"
    field :private_reason, :string
    field :responded_at, :utc_datetime_usec
    belongs_to :opportunity, OpalCore.SocialFlow.DynamicIntelligence.ExperienceOpportunity
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def states, do: @states

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :opportunity_id,
      :conversation_id,
      :user_id,
      :state,
      :private_reason,
      :responded_at
    ])
    |> validate_required([:opportunity_id, :conversation_id, :user_id, :state])
    |> validate_inclusion(:state, @states)
    |> unique_constraint([:opportunity_id, :user_id])
  end
end
