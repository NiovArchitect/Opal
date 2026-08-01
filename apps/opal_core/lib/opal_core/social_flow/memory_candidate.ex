defmodule OpalCore.SocialFlow.MemoryCandidate do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(proposed visible approved rejected expired superseded)

  schema "personal_memory_candidates" do
    field :counterpart_user_id, :binary_id
    field :source_message_ids, {:array, :binary_id}, default: []
    field :candidate_type, :string
    field :candidate_summary, :string
    field :confidence, :float
    field :uncertainty, {:array, :string}, default: []
    field :proposed_purpose, :string
    field :suggested_expiry, :utc_datetime_usec
    field :status, :string
    field :consent_proof_id, :binary_id
    field :ai_job_id, :binary_id
    field :approved_at, :utc_datetime_usec
    field :rejected_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :counterpart_user_id,
      :source_message_ids,
      :candidate_type,
      :candidate_summary,
      :confidence,
      :uncertainty,
      :proposed_purpose,
      :suggested_expiry,
      :status,
      :consent_proof_id,
      :ai_job_id,
      :approved_at,
      :rejected_at,
      :expires_at,
      :superseded_at
    ])
    |> validate_required([:owner_user_id, :candidate_type, :candidate_summary, :status])
    |> validate_inclusion(:status, @statuses)
  end

  def to_contract(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "owner_user_id" => m.owner_user_id,
      "conversation_id" => m.conversation_id,
      "counterpart_user_id" => m.counterpart_user_id,
      "candidate_type" => m.candidate_type,
      "candidate_summary" => m.candidate_summary,
      "confidence" => m.confidence,
      "uncertainty" => m.uncertainty || [],
      "proposed_purpose" => m.proposed_purpose,
      "status" => m.status,
      "created_at" => DateTime.to_iso8601(m.inserted_at)
    }
  end
end
