defmodule OpalCore.Invites.InviteReward do
  @moduledoc """
  Phase NE-1 — invite reward counters (track only; redeem later).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "invite_rewards" do
    field :successful_invites, :integer, default: 0

    belongs_to :user, OpalCore.Accounts.User, foreign_key: :user_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:user_id, :successful_invites])
    |> validate_required([:user_id, :successful_invites])
    |> validate_number(:successful_invites, greater_than_or_equal_to: 0)
    |> unique_constraint(:user_id)
    |> foreign_key_constraint(:user_id)
  end
end
