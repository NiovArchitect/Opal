defmodule OpalCore.SocialFlow.MemoryCandidate do
  @moduledoc """
  Durable candidate for relationship-aware memory — not yet (or no longer)
  authoritative personal truth.

  States: proposed | visible | approved | rejected | expired | superseded | conflicted
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(proposed visible approved rejected expired superseded conflicted)

  @classes ~w(
    preference
    boundary
    relationship_fact
    recurring_routine
    important_person
    important_place
    stable_constraint
    communication_preference
    decision_preference
    interest
    shared_pattern
  )

  @evidence_kinds ~w(
    explicit_statement
    repeated_behavior
    accepted_plan_pattern
    inference
    confirmed_shared_fact
    provider_external
    user_correction
  )

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

    field :memory_class, :string
    field :evidence_kind, :string
    field :scope, :string
    field :scope_id, :string
    field :subject_user_id, :binary_id
    field :value_key, :string
    field :polarity, :string
    field :sensitive, :boolean, default: false
    field :source_type, :string
    field :observation_count, :integer, default: 1
    field :first_observed_at, :utc_datetime_usec
    field :last_observed_at, :utc_datetime_usec
    field :last_confirmed_at, :utc_datetime_usec
    field :confidence_components, :map, default: %{}
    field :provenance, :map, default: %{}
    field :context_dims, :map, default: %{}
    field :supersedes_candidate_id, :binary_id
    field :contradiction_group_id, :binary_id
    field :promoted_memory_id, :binary_id
    field :idempotency_key, :string

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def classes, do: @classes
  def evidence_kinds, do: @evidence_kinds

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
      :superseded_at,
      :memory_class,
      :evidence_kind,
      :scope,
      :scope_id,
      :subject_user_id,
      :value_key,
      :polarity,
      :sensitive,
      :source_type,
      :observation_count,
      :first_observed_at,
      :last_observed_at,
      :last_confirmed_at,
      :confidence_components,
      :provenance,
      :context_dims,
      :supersedes_candidate_id,
      :contradiction_group_id,
      :promoted_memory_id,
      :idempotency_key
    ])
    |> validate_required([:owner_user_id, :candidate_type, :candidate_summary, :status])
    |> validate_inclusion(:status, @statuses)
    |> maybe_validate_class()
    |> maybe_validate_evidence()
    |> unique_constraint(:idempotency_key, name: :personal_memory_candidates_idempotency_key_uniq)
  end

  def to_contract(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "owner_user_id" => m.owner_user_id,
      "conversation_id" => m.conversation_id,
      "counterpart_user_id" => m.counterpart_user_id,
      "subject_user_id" => m.subject_user_id,
      "candidate_type" => m.candidate_type,
      "memory_class" => m.memory_class,
      "evidence_kind" => m.evidence_kind,
      "candidate_summary" => m.candidate_summary,
      "value_key" => m.value_key,
      "confidence" => m.confidence,
      "confidence_components" => m.confidence_components || %{},
      "uncertainty" => m.uncertainty || [],
      "proposed_purpose" => m.proposed_purpose,
      "scope" => m.scope,
      "scope_id" => m.scope_id,
      "polarity" => m.polarity,
      "sensitive" => m.sensitive == true,
      "source_type" => m.source_type,
      "observation_count" => m.observation_count,
      "status" => m.status,
      "provenance" => m.provenance || %{},
      "context_dims" => m.context_dims || %{},
      "promoted_memory_id" => m.promoted_memory_id,
      "created_at" => DateTime.to_iso8601(m.inserted_at)
    }
  end

  defp maybe_validate_class(cs) do
    case get_field(cs, :memory_class) do
      nil -> cs
      class when class in @classes -> cs
      _ -> add_error(cs, :memory_class, "is invalid")
    end
  end

  defp maybe_validate_evidence(cs) do
    case get_field(cs, :evidence_kind) do
      nil -> cs
      kind when kind in @evidence_kinds -> cs
      _ -> add_error(cs, :evidence_kind, "is invalid")
    end
  end
end
