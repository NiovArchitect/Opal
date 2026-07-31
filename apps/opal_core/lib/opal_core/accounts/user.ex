defmodule OpalCore.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :handle, :string
    field :display_name, :string

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:id, :handle, :display_name])
    |> validate_required([:handle, :display_name])
    |> validate_length(:handle, max: 64)
    |> validate_length(:display_name, max: 128)
    |> unique_constraint(:handle)
  end
end
