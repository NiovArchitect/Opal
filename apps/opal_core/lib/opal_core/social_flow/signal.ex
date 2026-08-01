defmodule OpalCore.SocialFlow.Signal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds ~w(possible_plan missing_detail agreement commitment private_reminder revision reconnect_summary)
  @statuses ~w(proposed visible acted dismissed snoozed superseded expired corrected)

  schema "social_flow_signals" do
    field :kind, :string
    field :status, :string
    field :copy, :string
    field :visibility, :string, default: "shared"
    field :actions, :map, default: %{}

    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :proposal, OpalCore.SocialFlow.Proposal
    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
    belongs_to :commitment, OpalCore.SocialFlow.PlanCommitment
    belongs_to :reminder, OpalCore.SocialFlow.PlanReminder
    belongs_to :revision, OpalCore.SocialFlow.PlanRevision
    belongs_to :audience_user, OpalCore.Accounts.User, foreign_key: :audience_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(s, attrs) do
    s
    |> cast(attrs, [
      :conversation_id,
      :proposal_id,
      :plan_id,
      :commitment_id,
      :reminder_id,
      :revision_id,
      :kind,
      :status,
      :copy,
      :visibility,
      :actions,
      :audience_user_id
    ])
    |> validate_required([:conversation_id, :kind, :status, :copy, :visibility])
    |> validate_inclusion(:kind, @kinds)
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:visibility, ~w(private shared))
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
      "conversation_id" => s.conversation_id,
      "proposal_id" => s.proposal_id,
      "plan_id" => s.plan_id,
      "commitment_id" => s.commitment_id,
      "reminder_id" => s.reminder_id,
      "revision_id" => s.revision_id,
      "kind" => s.kind,
      "status" => s.status,
      "copy" => s.copy,
      "visibility" => s.visibility,
      "actions" => actions,
      "audience_user_id" => s.audience_user_id,
      "created_at" => DateTime.to_iso8601(s.inserted_at)
    }
  end
end
