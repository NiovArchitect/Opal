defmodule OpalCore.SocialFlow.InvitationContinuation do
  @moduledoc """
  Short-lived server-side resume handle after invitation open.

  Raw share tokens must not be stored permanently in localStorage.
  Clients may hold only the opaque continuation id ephemerally (sessionStorage),
  then exchange it after authentication. Server remains authoritative.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "invitation_continuations" do
    field :continuation_digest, :string
    field :invitation_id, :binary_id
    field :expires_at, :utc_datetime_usec
    field :consumed_at, :utc_datetime_usec
    field :bound_user_id, :binary_id
    field :source, :string, default: "share_link"

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :continuation_digest,
      :invitation_id,
      :expires_at,
      :consumed_at,
      :bound_user_id,
      :source
    ])
    |> validate_required([:continuation_digest, :invitation_id, :expires_at])
    |> unique_constraint(:continuation_digest)
  end
end
