defmodule OpalCore.Wallets.WalletTransaction do
  @moduledoc """
  Ledger row for wallet money movement. Idempotent via unique idempotency_key.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @types ~w(load spend refund adjustment)

  schema "wallet_transactions" do
    field :account_id, :binary_id
    field :amount_cents, :integer
    field :type, :string
    field :ref_type, :string
    field :ref_id, :string
    field :balance_after_cents, :integer
    field :idempotency_key, :string

    timestamps(type: :utc_datetime_usec)
  end

  def types, do: @types

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :amount_cents,
      :type,
      :ref_type,
      :ref_id,
      :balance_after_cents,
      :idempotency_key
    ])
    |> validate_required([
      :account_id,
      :amount_cents,
      :type,
      :balance_after_cents,
      :idempotency_key
    ])
    |> validate_inclusion(:type, @types)
    |> unique_constraint(:idempotency_key, name: :wallet_transactions_idempotency_key_index)
  end
end
