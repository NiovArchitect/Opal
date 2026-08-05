defmodule OpalCore.SocialFlow.DynamicIntelligence.ExperienceCompletion do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @evidence_classes ~w(explicit_confirmation)
  @labels ~w(Happened Handled Complete)

  schema "dsi_experience_completions" do
    field :status, :string, default: "completed"
    field :continuity_label, :string, default: "Happened"
    field :evidence_class, :string, default: "explicit_confirmation"
    field :idempotency_key, :string
    field :completed_at, :utc_datetime_usec
    field :shared_safe_summary, :string
    field :preferred_candidate_id, :string
    belongs_to :opportunity, OpalCore.SocialFlow.DynamicIntelligence.ExperienceOpportunity
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :confirmed_by_user, OpalCore.Accounts.User, foreign_key: :confirmed_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :opportunity_id,
      :conversation_id,
      :confirmed_by_user_id,
      :status,
      :continuity_label,
      :evidence_class,
      :idempotency_key,
      :completed_at,
      :shared_safe_summary,
      :preferred_candidate_id
    ])
    |> validate_required([
      :opportunity_id,
      :conversation_id,
      :confirmed_by_user_id,
      :status,
      :continuity_label,
      :evidence_class,
      :idempotency_key,
      :completed_at
    ])
    |> validate_inclusion(:evidence_class, @evidence_classes)
    |> validate_inclusion(:continuity_label, @labels)
    |> unique_constraint(:opportunity_id)
    |> unique_constraint(:idempotency_key)
  end
end
