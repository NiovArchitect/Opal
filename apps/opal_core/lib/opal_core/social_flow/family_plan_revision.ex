defmodule OpalCore.SocialFlow.FamilyPlanRevision do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "family_plan_revisions" do
    field :revision_number, :integer
    field :proposed_changes, :map, default: %{}
    field :status, :string, default: "proposed"
    field :shared_reason, :string
    field :approved_by_user_id, :binary_id
    field :resolved_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :plan, OpalCore.SocialFlow.FamilyPlan
    belongs_to :proposed_by_user, OpalCore.Accounts.User, foreign_key: :proposed_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :plan_id,
      :proposed_by_user_id,
      :revision_number,
      :proposed_changes,
      :status,
      :shared_reason,
      :approved_by_user_id,
      :resolved_at,
      :idempotency_key
    ])
    |> validate_required([
      :plan_id,
      :proposed_by_user_id,
      :revision_number,
      :status,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key)
  end
end
