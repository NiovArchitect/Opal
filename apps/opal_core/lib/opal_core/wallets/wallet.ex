defmodule OpalCore.Wallets.Wallet do
  @moduledoc """
  Stored-value wallet. Money transmitter obligations vary by jurisdiction —
  founder must review before enabling loads in production. See BLOCKED.md.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "wallets" do
    field :account_id, :binary_id
    field :balance_cents, :integer, default: 0
    field :currency, :string, default: "USD"
    field :auto_approve_threshold_cents, :integer, default: 5000

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :balance_cents,
      :currency,
      :auto_approve_threshold_cents
    ])
    |> validate_required([:account_id, :balance_cents, :currency, :auto_approve_threshold_cents])
    |> validate_number(:balance_cents, greater_than_or_equal_to: 0)
    |> validate_number(:auto_approve_threshold_cents, greater_than_or_equal_to: 0)
    |> unique_constraint(:account_id, name: :wallets_account_id_index)
  end
end
