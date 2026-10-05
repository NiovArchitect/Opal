defmodule OpalCore.TrustTiers.TrustTier do
  @moduledoc """
  Phase RU-2 — progressive trust tier for one user.

  One row per user. Not a score or paywall — earned access to deeper context.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # new: name, handle, timezone only
  # known: + taste, celebrations, plan history
  # trusted: + financial comfort, relationship types
  # inner_circle: + intimate (user grant only)
  @allowed_tiers ~w(new known trusted inner_circle)
  @granted_by ~w(system user)

  schema "trust_tiers" do
    field :tier, :string
    field :granted_at, :utc_datetime_usec
    field :granted_by, :string

    belongs_to :user, OpalCore.Accounts.User, foreign_key: :user_id

    timestamps(type: :utc_datetime_usec)
  end

  def allowed_tiers, do: @allowed_tiers

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:user_id, :tier, :granted_at, :granted_by])
    |> validate_required([:user_id, :tier, :granted_at, :granted_by])
    |> validate_inclusion(:tier, @allowed_tiers)
    |> validate_inclusion(:granted_by, @granted_by)
    |> unique_constraint(:user_id)
    |> foreign_key_constraint(:user_id)
  end
end
