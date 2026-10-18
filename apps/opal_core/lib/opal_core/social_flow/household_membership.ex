defmodule OpalCore.SocialFlow.HouseholdMembership do
  @moduledoc """
  Repair #18 Division B (B5a) — one person's membership of one pod.

  Creation is one user's act; membership is each member's own act:
  rows start `invited` and become `active` only when that user accepts.
  Nobody is ever in a pod they did not accept. `is_primary` marks the
  one pod (per user, enforced in the Households context) whose
  defaults plan creation reads.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @roles ~w(admin member)
  @statuses ~w(invited active left declined)

  schema "household_memberships" do
    field :household_id, :binary_id
    field :user_id, :binary_id
    field :role, :string, default: "member"
    field :status, :string, default: "invited"
    field :is_primary, :boolean, default: false
    field :idempotency_key, :string

    timestamps(type: :utc_datetime_usec)
  end

  def roles, do: @roles
  def statuses, do: @statuses

  def changeset(membership, attrs) do
    membership
    |> cast(attrs, [:household_id, :user_id, :role, :status, :is_primary, :idempotency_key])
    |> validate_required([:household_id, :user_id, :role, :status, :idempotency_key])
    |> validate_inclusion(:role, @roles)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:household_id, :user_id],
      name: :household_memberships_household_user_uniq
    )
    |> unique_constraint(:idempotency_key, name: :household_memberships_idempotency_uniq)
  end
end
