defmodule OpalCore.SocialFlow.DynamicIntelligence.SocialContext do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(candidate eligible surfaced suppressed expired confirmed completed revoked)

  schema "dsi_social_contexts" do
    field :context_type, :string, default: "dinner_forming"
    field :status, :string, default: "candidate"
    field :confidence, :float, default: 0.0
    field :participant_user_ids, {:array, :binary_id}, default: []
    field :shared_facts, :map, default: %{}
    field :private_feature_refs, :map, default: %{}
    field :evaluation_key, :string
    field :message_boundary, :string
    field :suppressed_at, :utc_datetime_usec
    field :suppression_reason, :string
    field :revoked_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :conversation_id,
      :context_type,
      :status,
      :confidence,
      :participant_user_ids,
      :shared_facts,
      :private_feature_refs,
      :evaluation_key,
      :message_boundary,
      :suppressed_at,
      :suppression_reason,
      :revoked_at,
      :expires_at,
      :completed_at
    ])
    |> validate_required([
      :conversation_id,
      :context_type,
      :status,
      :evaluation_key
    ])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:conversation_id, :evaluation_key],
      name: :dsi_social_contexts_conversation_eval_unique
    )
  end
end
