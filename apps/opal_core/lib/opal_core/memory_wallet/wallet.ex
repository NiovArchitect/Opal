defmodule OpalCore.MemoryWallet.Wallet do
  @moduledoc """
  W-GAP-01 - the memory wallet record: one wallet per account.

  This is the wallet identity surface in the data layer (WALLET_MAP
  section A1). It is NOT the money wallet (`OpalCore.Wallets.Wallet`,
  table `wallets`) - that construct is a Stripe-load ledger and keeps
  its own name space. A memory wallet holds no content itself; it is
  the one record every personal-memory capsule belongs to, and its
  owner is the capsule's hard isolation boundary: a wallet belongs to
  exactly one account, forever.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "memory_wallets" do
    field :owner_user_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(wallet, attrs) do
    wallet
    |> cast(attrs, [:owner_user_id])
    |> validate_required([:owner_user_id])
    |> unique_constraint(:owner_user_id, name: :memory_wallets_owner_user_id_index)
  end

  def to_contract(%__MODULE__{} = wallet) do
    %{
      "id" => wallet.id,
      "owner_user_id" => wallet.owner_user_id,
      "created_at" => wallet.inserted_at && DateTime.to_iso8601(wallet.inserted_at)
    }
  end
end
