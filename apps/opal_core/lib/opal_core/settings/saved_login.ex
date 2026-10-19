defmodule OpalCore.Settings.SavedLogin do
  @moduledoc """
  One saved login (spec 4.C3). The row holds a HOST and a TokenVault
  ciphertext - the value itself is never in a contract, a payload, or
  a log. Hosts only, everywhere outside the vault.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "saved_logins" do
    field :user_id, :binary_id
    field :host, :string
    field :secret_ciphertext, :binary

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(login, attrs) do
    login
    |> cast(attrs, [:host])
    |> validate_required([:host])
    |> validate_length(:host, min: 1, max: 255)
    |> unique_constraint([:user_id, :host], name: :saved_logins_user_id_host_index)
  end

  @doc "The ONLY outward shape: id + host + when. No value, no length."
  def to_contract(%__MODULE__{} = login) do
    %{
      "id" => login.id,
      "host" => login.host,
      "saved_at" => login.inserted_at && DateTime.to_iso8601(login.inserted_at)
    }
  end
end
