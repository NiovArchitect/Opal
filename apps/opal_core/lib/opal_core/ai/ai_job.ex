defmodule OpalCore.AI.AiJob do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(queued processing completed refused failed)
  @terminal ~w(completed refused failed)

  schema "ai_jobs" do
    field :idempotency_key, :string
    field :capability, :string
    field :status, :string
    field :trace_id, :string
    field :schema_version, :string, default: "0.1.0"
    field :request_payload, :map
    field :failure_reason, :string
    field :error_code, :string
    field :deadline_at, :utc_datetime_usec
    field :started_at, :utc_datetime_usec
    field :finished_at, :utc_datetime_usec

    belongs_to :requester_user, OpalCore.Accounts.User, foreign_key: :requester_user_id
    belongs_to :subject_user, OpalCore.Accounts.User, foreign_key: :subject_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :message, OpalCore.Messaging.Message
    belongs_to :consent_proof, OpalCore.Consent.ConsentProof

    has_one :result, OpalCore.AI.AiJobResult

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def terminal_statuses, do: @terminal

  def create_changeset(job, attrs) do
    job
    |> cast(attrs, [
      :id,
      :idempotency_key,
      :capability,
      :status,
      :requester_user_id,
      :subject_user_id,
      :conversation_id,
      :message_id,
      :consent_proof_id,
      :trace_id,
      :schema_version,
      :request_payload,
      :deadline_at
    ])
    |> validate_required([
      :idempotency_key,
      :capability,
      :status,
      :requester_user_id,
      :subject_user_id,
      :conversation_id,
      :message_id,
      :consent_proof_id,
      :trace_id
    ])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:capability, OpalCore.Consent.ConsentProof.capabilities())
    |> unique_constraint(:idempotency_key)
  end

  def transition_changeset(job, attrs) do
    job
    |> cast(attrs, [
      :status,
      :failure_reason,
      :error_code,
      :started_at,
      :finished_at,
      :request_payload
    ])
    |> validate_inclusion(:status, @statuses)
    |> validate_terminal_immutability(job)
  end

  defp validate_terminal_immutability(changeset, %__MODULE__{status: status})
       when status in @terminal do
    if get_change(changeset, :status) && get_change(changeset, :status) != status do
      add_error(changeset, :status, "terminal job cannot leave #{status}")
    else
      changeset
    end
  end

  defp validate_terminal_immutability(changeset, _), do: changeset
end
