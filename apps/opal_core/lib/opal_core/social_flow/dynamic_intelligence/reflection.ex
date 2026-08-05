defmodule OpalCore.SocialFlow.DynamicIntelligence.Reflection do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(eligible suppressed surfaced answered expired)
  @responses ~w(yes maybe not_with_this_group)

  schema "dsi_reflections" do
    field :status, :string, default: "eligible"
    field :prompt, :string, default: "Would you choose a place like this again?"
    field :suppression_reason, :string
    field :response, :string
    field :responded_by_user_id, :binary_id
    field :responded_at, :utc_datetime_usec
    field :surfaced_at, :utc_datetime_usec
    field :idempotency_key, :string
    field :expires_at, :utc_datetime_usec
    belongs_to :opportunity, OpalCore.SocialFlow.DynamicIntelligence.ExperienceOpportunity
    belongs_to :completion, OpalCore.SocialFlow.DynamicIntelligence.ExperienceCompletion
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def responses, do: @responses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :opportunity_id,
      :completion_id,
      :conversation_id,
      :status,
      :prompt,
      :suppression_reason,
      :response,
      :responded_by_user_id,
      :responded_at,
      :surfaced_at,
      :idempotency_key,
      :expires_at
    ])
    |> validate_required([
      :opportunity_id,
      :completion_id,
      :conversation_id,
      :status,
      :prompt,
      :idempotency_key
    ])
    |> validate_inclusion(:status, @statuses)
    |> validate_change(:response, fn
      :response, nil -> []
      :response, val when val in @responses -> []
      :response, _ -> [response: "invalid"]
    end)
    |> unique_constraint(:opportunity_id)
    |> unique_constraint(:idempotency_key)
  end
end
