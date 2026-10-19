defmodule OpalCore.Invites.PersonalCode do
  @moduledoc """
  A member's personal invite code (spec 4.C4): one durable code per
  account, shareable anywhere, redeemable by many new members - each
  redemption is its own record (`OpalCore.Invites.InviteRedemption`).
  Distinct from the single-use `OpalCore.Invites.Invite`.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "personal_invite_codes" do
    field :user_id, :binary_id
    field :code, :string

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:code])
    |> validate_required([:code])
    |> unique_constraint(:user_id, name: :personal_invite_codes_user_id_index)
    |> unique_constraint(:code, name: :personal_invite_codes_code_index)
  end
end
