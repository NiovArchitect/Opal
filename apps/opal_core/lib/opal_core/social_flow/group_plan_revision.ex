defmodule OpalCore.SocialFlow.GroupPlanRevision do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_plan_revisions" do
    field :prior_revision_id, :binary_id
    field :proposed_changes, :map, default: %{}
    field :shared_reason, :string
    field :status, :string
    field :required_approvals, {:array, :binary_id}, default: []
    field :approvals, :map, default: %{}
    field :accepted_at, :utc_datetime_usec
    field :rejected_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    belongs_to :plan, OpalCore.SocialFlow.GroupSharedPlan
    belongs_to :proposed_by_user, OpalCore.Accounts.User, foreign_key: :proposed_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :plan_id,
      :proposed_by_user_id,
      :prior_revision_id,
      :proposed_changes,
      :shared_reason,
      :status,
      :required_approvals,
      :approvals,
      :accepted_at,
      :rejected_at,
      :expires_at
    ])
    |> validate_required([:plan_id, :proposed_by_user_id, :status, :proposed_changes])
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "plan_id" => r.plan_id,
      "proposed_by_user_id" => r.proposed_by_user_id,
      "proposed_changes" => r.proposed_changes || %{},
      "shared_reason" => r.shared_reason,
      "status" => r.status,
      "required_approvals" => r.required_approvals || [],
      "approvals" => r.approvals || %{},
      "expires_at" => if(r.expires_at, do: DateTime.to_iso8601(r.expires_at), else: nil)
    }
  end
end
