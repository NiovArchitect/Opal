defmodule OpalCore.SocialFlow.Household do
  @moduledoc """
  Repair #18 Division B (B5a) — a household pod: an explicit, adult,
  consent-based declaration ("we live / plan as one household"), made
  by the people in it. Recognition is declaration only — no address is
  required, no co-location is computed, and no signal the user did not
  provide is ever read by pod code.

  Deliberately NOT a family object and NOT built on the guardian/youth
  `family_contexts` system. A pod is a planning context, not a trust
  tier: membership grants no visibility beyond what pairwise
  Relationships.Access already grants.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(active archived)

  schema "households" do
    field :label, :string
    field :home_label, :string, default: "Home"
    field :created_by_user_id, :binary_id
    field :timezone, :string, default: "America/Los_Angeles"
    field :status, :string, default: "active"

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(household, attrs) do
    household
    |> cast(attrs, [:label, :home_label, :created_by_user_id, :timezone, :status])
    |> validate_required([:label, :created_by_user_id, :timezone, :status])
    |> validate_length(:label, max: 120)
    |> validate_length(:home_label, max: 80)
    |> validate_inclusion(:status, @statuses)
  end
end
