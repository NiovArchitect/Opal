defmodule OpalCore.MemoryWallet do
  @moduledoc """
  W-GAP-01 - one memory wallet per account (the wallet record).

  `ensure_wallet/1` is idempotent: the first call for an account
  creates its wallet, every later call returns the same record. The
  unique index on `owner_user_id` is the guarantee; a race between
  two first calls resolves to the one record.

  Reads of capsule CONTENT never happen here - they go through the
  one mediated read facade, `OpalCore.MemoryWallet.CapsuleRead`
  (GYRO-01 kernel). This module is the wallet's identity surface
  only.
  """

  import Ecto.Query

  alias OpalCore.MemoryWallet.Wallet
  alias OpalCore.Repo

  @doc "The account's wallet, or nil when it has not been created yet."
  def wallet_for(owner_user_id) when is_binary(owner_user_id) do
    Repo.one(from(w in Wallet, where: w.owner_user_id == ^owner_user_id))
  end

  def wallet_for(_), do: nil

  @doc "Create the account's wallet if it has none; return the one record."
  def ensure_wallet(owner_user_id) when is_binary(owner_user_id) do
    case wallet_for(owner_user_id) do
      %Wallet{} = wallet ->
        {:ok, wallet}

      nil ->
        %Wallet{}
        |> Wallet.changeset(%{owner_user_id: owner_user_id})
        |> Repo.insert(on_conflict: :nothing, conflict_target: [:owner_user_id])
        |> case do
          {:ok, %Wallet{id: nil}} -> {:ok, wallet_for(owner_user_id)}
          {:ok, wallet} -> {:ok, wallet}
          {:error, changeset} -> {:error, changeset}
        end
    end
  end

  def ensure_wallet(_), do: {:error, :owner_required}
end
