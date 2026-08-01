defmodule OpalCore.SocialFlow.ContinuityCandidate do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "continuity_candidates" do
    field :memory_class, :string
    field :candidate_type, :string
    field :summary, :string
    field :purpose, :string
    field :source_message_ids, {:array, :binary_id}, default: []
    field :required_participant_ids, {:array, :binary_id}, default: []
    field :counterpart_user_id, :binary_id
    field :confidence, :float, default: 0.7
    field :uncertainty, {:array, :string}, default: []
    field :suggested_review_days, :integer, default: 90
    field :status, :string, default: "proposed"
    field :raw_candidate, :map, default: %{}
    field :idempotency_key, :string
    field :expires_at, :utc_datetime_usec
    field :resolved_at, :utc_datetime_usec
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :proposed_by_user, OpalCore.Accounts.User, foreign_key: :proposed_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :conversation_id,
      :proposed_by_user_id,
      :memory_class,
      :candidate_type,
      :summary,
      :purpose,
      :source_message_ids,
      :required_participant_ids,
      :counterpart_user_id,
      :confidence,
      :uncertainty,
      :suggested_review_days,
      :status,
      :raw_candidate,
      :idempotency_key,
      :expires_at,
      :resolved_at
    ])
    |> validate_required([
      :conversation_id,
      :proposed_by_user_id,
      :memory_class,
      :candidate_type,
      :summary,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(
      :memory_class,
      ~w(private personal shared_relationship group plan_carry_forward ephemeral)
    )
    |> validate_inclusion(
      :status,
      ~w(proposed visible pending_consent accepted declined dismissed expired superseded)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "conversation_id" => c.conversation_id,
      "memory_class" => c.memory_class,
      "candidate_type" => c.candidate_type,
      "summary" => c.summary,
      "purpose" => c.purpose,
      "source_message_ids" => c.source_message_ids || [],
      "required_participant_ids" => c.required_participant_ids || [],
      "confidence" => c.confidence,
      "uncertainty" => c.uncertainty || [],
      "status" => c.status,
      "not_permanent_trait" => true,
      "not_diagnosis" => true
    }
  end
end
