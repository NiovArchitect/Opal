defmodule OpalCore.SocialFlow.GroupAgreementRule do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_agreement_rules" do
    field :rule_type, :string
    field :required_participant_ids, {:array, :binary_id}, default: []
    field :minimum_acceptances, :integer
    field :tentative_allowed, :boolean, default: false
    field :abstention_behavior, :string, default: "neutral"
    field :visible_to_participants, :boolean, default: true
    belongs_to :proposal, OpalCore.SocialFlow.GroupPlanProposal
    belongs_to :created_by_user, OpalCore.Accounts.User, foreign_key: :created_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :proposal_id,
      :rule_type,
      :required_participant_ids,
      :minimum_acceptances,
      :tentative_allowed,
      :abstention_behavior,
      :created_by_user_id,
      :visible_to_participants
    ])
    |> validate_required([:proposal_id, :rule_type, :created_by_user_id])
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "proposal_id" => r.proposal_id,
      "rule_type" => r.rule_type,
      "required_participant_ids" => r.required_participant_ids || [],
      "tentative_allowed" => r.tentative_allowed,
      "visible_to_participants" => r.visible_to_participants
    }
  end
end
