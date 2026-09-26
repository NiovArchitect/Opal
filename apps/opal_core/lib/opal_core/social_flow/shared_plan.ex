defmodule OpalCore.SocialFlow.SharedPlan do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(tentative agreed changed cancelled completed)

  schema "shared_plans" do
    field :title, :string
    field :status, :string
    field :start_at, :utc_datetime_usec
    field :end_at, :utc_datetime_usec
    field :timezone, :string, default: "UTC"
    field :location, :string
    field :time_label, :string
    field :current_revision_id, :binary_id
    field :cancelled_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :alignment, :map, default: %{}

    belongs_to :conversation, OpalCore.Messaging.Conversation

    belongs_to :created_from_proposal, OpalCore.SocialFlow.Proposal,
      foreign_key: :created_from_proposal_id

    belongs_to :created_by_user, OpalCore.Accounts.User, foreign_key: :created_by_user_id

    has_many :participants, OpalCore.SocialFlow.PlanParticipant, foreign_key: :plan_id
    has_many :commitments, OpalCore.SocialFlow.PlanCommitment, foreign_key: :plan_id
    has_many :reminders, OpalCore.SocialFlow.PlanReminder, foreign_key: :plan_id
    has_many :revisions, OpalCore.SocialFlow.PlanRevision, foreign_key: :plan_id

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(plan, attrs) do
    plan
    |> cast(attrs, [
      :id,
      :conversation_id,
      :title,
      :status,
      :start_at,
      :end_at,
      :timezone,
      :location,
      :time_label,
      :created_from_proposal_id,
      :current_revision_id,
      :created_by_user_id,
      :cancelled_at,
      :completed_at,
      :alignment
    ])
    |> validate_required([:conversation_id, :title, :status, :created_by_user_id, :timezone])
    |> validate_inclusion(:status, @statuses)
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "schema_version" => "0.1.0",
      "id" => p.id,
      "conversation_id" => p.conversation_id,
      "title" => p.title,
      "status" => p.status,
      "start_at" => dt(p.start_at),
      "end_at" => dt(p.end_at),
      "timezone" => p.timezone,
      "location" => p.location,
      "time_label" => p.time_label,
      "created_from_proposal_id" => p.created_from_proposal_id,
      "current_revision_id" => p.current_revision_id,
      "created_by_user_id" => p.created_by_user_id,
      "created_at" => dt(p.inserted_at),
      "cancelled_at" => dt(p.cancelled_at),
      "completed_at" => dt(p.completed_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
