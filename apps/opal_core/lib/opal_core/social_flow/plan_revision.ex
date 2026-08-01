defmodule OpalCore.SocialFlow.PlanRevision do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(proposed accepted rejected expired superseded)

  schema "plan_revisions" do
    field :prior_revision_id, :binary_id
    field :proposed_changes, :map, default: %{}
    field :status, :string
    field :required_approvals, {:array, :binary_id}, default: []
    field :approvals, :map, default: %{}
    field :accepted_at, :utc_datetime_usec
    field :rejected_at, :utc_datetime_usec

    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
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
      :status,
      :required_approvals,
      :approvals,
      :accepted_at,
      :rejected_at
    ])
    |> validate_required([:plan_id, :proposed_by_user_id, :status, :proposed_changes])
    |> validate_inclusion(:status, @statuses)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "plan_id" => r.plan_id,
      "proposed_by_user_id" => r.proposed_by_user_id,
      "prior_revision_id" => r.prior_revision_id,
      "proposed_changes" => r.proposed_changes || %{},
      "status" => r.status,
      "required_approvals" => r.required_approvals || [],
      "approvals" => r.approvals || %{},
      "accepted_at" => dt(r.accepted_at),
      "created_at" => dt(r.inserted_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
