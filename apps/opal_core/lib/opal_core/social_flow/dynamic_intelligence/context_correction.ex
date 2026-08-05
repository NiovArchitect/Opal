defmodule OpalCore.SocialFlow.DynamicIntelligence.ContextCorrection do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds ~w(
    suppress_group_context
    suppress_opportunity_class
    keep_preference_private
    ask_before_surface
    generic_correction
  )

  schema "dsi_context_corrections" do
    field :kind, :string
    field :text, :string
    field :scope, :string, default: "conversation_group"
    field :experience_type, :string, default: "dinner"
    field :participant_set_key, :string
    field :duration, :string, default: "until_revoked"
    field :audience, :string, default: "self_and_context"
    field :reason_class, :string, default: "user_correction"
    field :global_label, :boolean, default: false
    field :friendship_score_change, :boolean, default: false
    field :active, :boolean, default: true
    field :revoked_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :social_context, OpalCore.SocialFlow.DynamicIntelligence.SocialContext
    belongs_to :opportunity, OpalCore.SocialFlow.DynamicIntelligence.ExperienceOpportunity
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def kinds, do: @kinds

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :conversation_id,
      :social_context_id,
      :opportunity_id,
      :user_id,
      :kind,
      :text,
      :scope,
      :experience_type,
      :participant_set_key,
      :duration,
      :audience,
      :reason_class,
      :global_label,
      :friendship_score_change,
      :active,
      :revoked_at,
      :expires_at
    ])
    |> validate_required([:conversation_id, :user_id, :kind, :text, :scope, :experience_type])
    |> validate_inclusion(:kind, @kinds)
    |> put_change(:global_label, false)
    |> put_change(:friendship_score_change, false)
  end
end
