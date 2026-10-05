defmodule OpalCore.Invites.Invite do
  @moduledoc """
  Phase NE-1 — product invite to join Opal (network growth).

  Distinct from relationship invitations (already-on-Opal connects).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @allowed_status ~w(sent opened joined expired)

  schema "invites" do
    field :code, :string
    field :invitee_phone, :string
    field :invitee_email, :string
    field :status, :string
    field :expires_at, :utc_datetime_usec

    belongs_to :inviter, OpalCore.Accounts.User, foreign_key: :inviter_id
    belongs_to :joined_user, OpalCore.Accounts.User, foreign_key: :joined_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def allowed_status, do: @allowed_status

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :inviter_id,
      :code,
      :invitee_phone,
      :invitee_email,
      :status,
      :joined_user_id,
      :expires_at
    ])
    |> validate_required([:inviter_id, :code, :status, :expires_at])
    |> validate_inclusion(:status, @allowed_status)
    |> validate_length(:code, min: 6, max: 32)
    |> unique_constraint(:code)
    |> foreign_key_constraint(:inviter_id)
    |> foreign_key_constraint(:joined_user_id)
  end
end
