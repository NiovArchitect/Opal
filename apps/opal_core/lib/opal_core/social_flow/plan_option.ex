defmodule OpalCore.SocialFlow.PlanOption do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "plan_options" do
    field :label, :string
    field :start_at, :utc_datetime_usec
    field :status, :string, default: "open"
    field :sort_order, :integer, default: 0

    belongs_to :proposal, OpalCore.SocialFlow.Proposal
    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
    has_many :responses, OpalCore.SocialFlow.PlanOptionResponse, foreign_key: :option_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(o, attrs) do
    o
    |> cast(attrs, [:proposal_id, :plan_id, :label, :start_at, :status, :sort_order])
    |> validate_required([:label, :status])
  end

  def to_contract(%__MODULE__{} = o) do
    %{
      "id" => o.id,
      "proposal_id" => o.proposal_id,
      "plan_id" => o.plan_id,
      "label" => o.label,
      "status" => o.status,
      "sort_order" => o.sort_order
    }
  end
end
