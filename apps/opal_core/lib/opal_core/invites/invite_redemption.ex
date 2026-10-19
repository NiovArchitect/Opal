defmodule OpalCore.Invites.InviteRedemption do
  @moduledoc """
  One redemption of a personal invite code (spec 4.C4): the real
  account-linking record both sides can see - the redeemer joined
  through the code's owner.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "invite_redemptions" do
    field :personal_code_id, :binary_id
    field :inviter_user_id, :binary_id
    field :redeemer_user_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [])
    |> validate_required([:personal_code_id, :inviter_user_id, :redeemer_user_id])
    |> unique_constraint([:personal_code_id, :redeemer_user_id],
      name: :invite_redemptions_personal_code_id_redeemer_user_id_index
    )
  end
end
