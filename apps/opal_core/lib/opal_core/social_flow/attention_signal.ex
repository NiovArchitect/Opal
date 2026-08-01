defmodule OpalCore.SocialFlow.AttentionSignal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(candidate eligible suppressed scheduled visible acted snoozed dismissed completed expired superseded cancelled failed)
  @types ~w(follow_through due_reminder memory_review needs_answer plan_changed completion_ack)

  schema "attention_signals" do
    field :signal_type, :string
    field :privacy_class, :string, default: "private"
    field :status, :string
    field :copy, :string
    field :actions, :map, default: %{}
    field :due_at, :utc_datetime_usec
    field :eligible_at, :utc_datetime_usec
    field :scheduled_for, :utc_datetime_usec
    field :surfaced_at, :utc_datetime_usec
    field :acted_at, :utc_datetime_usec
    field :snoozed_until, :utc_datetime_usec
    field :dismissed_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :suppression_reason, :string
    field :relevance_version, :string, default: "sf2-0.1"
    field :source_lineage, :map, default: %{}
    field :consent_proof_id, :binary_id
    field :idempotency_key, :string
    field :internal_score, :float
    field :shadow_only, :boolean, default: false
    field :memory_id, :binary_id

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
    belongs_to :commitment, OpalCore.SocialFlow.PlanCommitment
    belongs_to :reminder, OpalCore.SocialFlow.PlanReminder

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def types, do: @types

  def changeset(s, attrs) do
    s
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :plan_id,
      :commitment_id,
      :reminder_id,
      :memory_id,
      :signal_type,
      :privacy_class,
      :status,
      :copy,
      :actions,
      :due_at,
      :eligible_at,
      :scheduled_for,
      :surfaced_at,
      :acted_at,
      :snoozed_until,
      :dismissed_at,
      :completed_at,
      :expires_at,
      :suppression_reason,
      :relevance_version,
      :source_lineage,
      :consent_proof_id,
      :idempotency_key,
      :internal_score,
      :shadow_only
    ])
    |> validate_required([
      :owner_user_id,
      :signal_type,
      :status,
      :copy,
      :idempotency_key,
      :privacy_class
    ])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:signal_type, @types)
    |> validate_inclusion(:privacy_class, ~w(private shared))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = s) do
    actions =
      case s.actions do
        %{"items" => items} when is_list(items) -> items
        list when is_list(list) -> list
        _ -> []
      end

    %{
      "schema_version" => "0.1.0",
      "id" => s.id,
      "owner_user_id" => s.owner_user_id,
      "conversation_id" => s.conversation_id,
      "plan_id" => s.plan_id,
      "commitment_id" => s.commitment_id,
      "reminder_id" => s.reminder_id,
      "memory_id" => s.memory_id,
      "signal_type" => s.signal_type,
      "privacy_class" => s.privacy_class,
      "status" => s.status,
      "copy" => s.copy,
      "actions" => actions,
      "due_at" => dt(s.due_at),
      "surfaced_at" => dt(s.surfaced_at),
      "suppression_reason" => s.suppression_reason,
      "created_at" => dt(s.inserted_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
