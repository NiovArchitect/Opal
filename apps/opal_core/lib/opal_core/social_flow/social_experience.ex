defmodule OpalCore.SocialFlow.SocialExperience do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(
    settled_plan preparation ready day_of in_transit arrival_window
    active_experience completion follow_up closed completed cancelled abandoned expired superseded
  )

  schema "social_experiences" do
    field :plan_id, :binary_id
    field :experience_type, :string, default: "dinner"
    field :status, :string, default: "settled_plan"
    field :title, :string
    field :location_label, :string
    field :time_label, :string
    field :timezone, :string, default: "UTC"
    field :scheduled_start_at, :utc_datetime_usec
    field :scheduled_end_at, :utc_datetime_usec
    field :readiness_state, :string, default: "unknown"
    field :day_of_copy, :string
    field :started_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :cancelled_at, :utc_datetime_usec
    field :closed_at, :utc_datetime_usec
    field :idempotency_key, :string
    field :participant_ids, {:array, :binary_id}, default: []
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(e, attrs) do
    e
    |> cast(attrs, [
      :conversation_id,
      :plan_id,
      :experience_type,
      :status,
      :title,
      :location_label,
      :time_label,
      :timezone,
      :scheduled_start_at,
      :scheduled_end_at,
      :readiness_state,
      :day_of_copy,
      :started_at,
      :completed_at,
      :cancelled_at,
      :closed_at,
      :idempotency_key,
      :participant_ids
    ])
    |> validate_required([:conversation_id, :status, :timezone, :idempotency_key])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = e) do
    %{
      "id" => e.id,
      "conversation_id" => e.conversation_id,
      "plan_id" => e.plan_id,
      "experience_type" => e.experience_type,
      "status" => e.status,
      "title" => e.title,
      "location_label" => e.location_label,
      "time_label" => e.time_label,
      "timezone" => e.timezone,
      "readiness_state" => e.readiness_state,
      "day_of_copy" => e.day_of_copy,
      "participant_ids" => e.participant_ids || []
    }
  end
end
