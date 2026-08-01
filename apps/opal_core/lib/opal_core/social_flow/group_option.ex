defmodule OpalCore.SocialFlow.GroupOption do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_plan_options" do
    field :label, :string
    field :start_at, :utc_datetime_usec
    field :timezone, :string, default: "UTC"
    field :location_candidate, :string
    field :status, :string, default: "open"
    field :sort_order, :integer, default: 0
    belongs_to :proposal, OpalCore.SocialFlow.GroupPlanProposal
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(o, attrs) do
    o
    |> cast(attrs, [
      :proposal_id,
      :label,
      :start_at,
      :timezone,
      :location_candidate,
      :status,
      :sort_order
    ])
    |> validate_required([:proposal_id, :label, :status])
  end

  def to_contract(%__MODULE__{} = o) do
    %{
      "id" => o.id,
      "proposal_id" => o.proposal_id,
      "label" => o.label,
      "status" => o.status,
      "sort_order" => o.sort_order
    }
  end
end
