defmodule OpalCore.Calls.AssistConsent do
  @moduledoc """
  Per-call Assist consent. A profile preference is not consent for this call.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "call_assist_consents" do
    field :call_id, :binary_id
    field :user_id, :binary_id
    field :allowed, :boolean, default: false
    field :allowed_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :source, :string, default: "call_surface"

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:call_id, :user_id, :allowed, :allowed_at, :revoked_at, :source])
    |> validate_required([:call_id, :user_id, :allowed])
    |> unique_constraint([:call_id, :user_id])
  end
end
