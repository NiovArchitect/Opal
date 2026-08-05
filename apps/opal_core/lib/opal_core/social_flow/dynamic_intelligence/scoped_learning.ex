defmodule OpalCore.SocialFlow.DynamicIntelligence.ScopedLearning do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @dimensions ~w(quiet_venue moderate_cost timing balanced_travel similar_dinner)
  @sources ~w(explicit_reflection inferred_outcome suppressed)

  schema "dsi_scoped_learnings" do
    field :opportunity_id, :binary_id
    field :completion_id, :binary_id
    field :experience_type, :string, default: "dinner"
    field :participant_set_key, :string
    field :dimension, :string
    field :value, :string
    field :confidence, :float, default: 0.5
    field :active, :boolean, default: true
    field :source, :string, default: "explicit_reflection"
    field :suppressed_by_correction, :boolean, default: false
    field :expires_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def dimensions, do: @dimensions

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :conversation_id,
      :opportunity_id,
      :completion_id,
      :experience_type,
      :participant_set_key,
      :dimension,
      :value,
      :confidence,
      :active,
      :source,
      :suppressed_by_correction,
      :expires_at,
      :idempotency_key
    ])
    |> validate_required([
      :conversation_id,
      :experience_type,
      :participant_set_key,
      :dimension,
      :value,
      :idempotency_key
    ])
    |> validate_inclusion(:dimension, @dimensions)
    |> validate_inclusion(:source, @sources)
    |> unique_constraint(:idempotency_key)
  end
end
