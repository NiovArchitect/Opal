defmodule OpalCore.SocialFlow.Proposal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(proposed visible approved_for_coordination dismissed expired superseded converted)

  schema "social_flow_proposals" do
    field :source_message_ids, {:array, :binary_id}, default: []
    field :capability, :string, default: "social_flow_plan_extract"
    field :status, :string
    field :activity_label, :string
    field :time_candidates, :map, default: %{}
    field :location_candidate, :string
    field :participant_candidates, {:array, :string}, default: []
    field :confidence, :float
    field :uncertainty, {:array, :string}, default: []
    field :recommended_signal_copy, :string
    field :raw_candidate, :map
    field :visibility, :string, default: "shared"
    field :expires_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec
    field :dismissed_at, :utc_datetime_usec
    field :converted_at, :utc_datetime_usec

    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :created_by_user, OpalCore.Accounts.User, foreign_key: :created_by_user_id
    belongs_to :ai_job, OpalCore.AI.AiJob
    belongs_to :consent_proof, OpalCore.Consent.ConsentProof

    has_many :options, OpalCore.SocialFlow.PlanOption

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(proposal, attrs) do
    proposal
    |> cast(attrs, [
      :id,
      :conversation_id,
      :created_by_user_id,
      :ai_job_id,
      :source_message_ids,
      :capability,
      :status,
      :activity_label,
      :time_candidates,
      :location_candidate,
      :participant_candidates,
      :confidence,
      :uncertainty,
      :recommended_signal_copy,
      :raw_candidate,
      :consent_proof_id,
      :visibility,
      :expires_at,
      :superseded_at,
      :dismissed_at,
      :converted_at
    ])
    |> validate_required([:conversation_id, :status, :capability])
    |> validate_inclusion(:status, @statuses)
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "schema_version" => "0.1.0",
      "id" => p.id,
      "conversation_id" => p.conversation_id,
      "status" => p.status,
      "activity_label" => p.activity_label,
      "time_candidates" => p.time_candidates || %{},
      "confidence" => p.confidence,
      "uncertainty" => p.uncertainty || [],
      "recommended_signal_copy" => p.recommended_signal_copy,
      "source_message_ids" => p.source_message_ids || [],
      "visibility" => p.visibility,
      "created_at" => dt(p.inserted_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
