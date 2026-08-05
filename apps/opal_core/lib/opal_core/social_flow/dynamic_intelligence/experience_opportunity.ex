defmodule OpalCore.SocialFlow.DynamicIntelligence.ExperienceOpportunity do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(eligible surfaced suppressed expired confirmed completed revoked dismissed)

  schema "dsi_experience_opportunities" do
    field :status, :string, default: "eligible"
    field :headline, :string
    field :supporting_explanation, :string
    field :see_why, :string
    field :preferred_candidate_id, :string
    field :preferred_display_name, :string
    field :journey_state, :string, default: "forming"
    field :participation_summary, :string
    field :shared_projection, :map, default: %{}
    field :last_surfaced_at, :utc_datetime_usec
    field :dismissed_at, :utc_datetime_usec
    field :dismissal_reason, :string
    field :cooldown_until, :utc_datetime_usec
    field :recent_suggestion_count, :integer, default: 0
    field :expires_at, :utc_datetime_usec
    field :evaluation_key, :string
    field :version, :integer, default: 1
    belongs_to :social_context, OpalCore.SocialFlow.DynamicIntelligence.SocialContext
    belongs_to :conversation, OpalCore.Messaging.Conversation

    has_many :candidates, OpalCore.SocialFlow.DynamicIntelligence.ExperienceCandidate,
      foreign_key: :opportunity_id

    has_many :participation_states, OpalCore.SocialFlow.DynamicIntelligence.ParticipationState,
      foreign_key: :opportunity_id

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :social_context_id,
      :conversation_id,
      :status,
      :headline,
      :supporting_explanation,
      :see_why,
      :preferred_candidate_id,
      :preferred_display_name,
      :journey_state,
      :participation_summary,
      :shared_projection,
      :last_surfaced_at,
      :dismissed_at,
      :dismissal_reason,
      :cooldown_until,
      :recent_suggestion_count,
      :expires_at,
      :evaluation_key,
      :version
    ])
    |> validate_required([
      :social_context_id,
      :conversation_id,
      :status,
      :headline,
      :supporting_explanation,
      :see_why,
      :evaluation_key
    ])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:conversation_id, :evaluation_key],
      name: :dsi_opportunities_conversation_eval_unique
    )
  end
end
