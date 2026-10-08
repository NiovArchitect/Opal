defmodule OpalCore.Wallets do
  @moduledoc """
  Stored-value wallet context.

  Money transmitter obligations vary by jurisdiction — founder must review
  before enabling loads in production. See BLOCKED.md.

  All money movements run inside `Repo.transaction` with an outbox
  `Publisher.record/1` event in the SAME transaction.
  """

  import Ecto.Query

  alias Ecto.Multi
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo
  alias OpalCore.Wallets.{Wallet, WalletTransaction}

  @doc "Fetch or create the wallet for an account."
  def get_or_create_wallet(account_id) when is_binary(account_id) do
    case Repo.get_by(Wallet, account_id: account_id) do
      %Wallet{} = w ->
        {:ok, w}

      nil ->
        %Wallet{}
        |> Wallet.changeset(%{
          account_id: account_id,
          balance_cents: 0,
          currency: "USD",
          auto_approve_threshold_cents: 5000
        })
        |> Repo.insert()
        |> case do
          {:ok, w} ->
            {:ok, w}

          {:error, %Ecto.Changeset{} = cs} ->
            # Race: unique account_id — re-read.
            if unique_account_error?(cs) do
              case Repo.get_by(Wallet, account_id: account_id) do
                %Wallet{} = w -> {:ok, w}
                nil -> {:error, cs}
              end
            else
              {:error, cs}
            end
        end
    end
  end

  def get_or_create_wallet(_), do: {:error, :invalid}

  @doc """
  Load funds into the wallet.

  Without `STRIPE_SECRET_KEY` → `{:disabled, "wallet loading not connected"}`.
  With key (or `allow_test_load: true` in test) writes a load transaction.
  """
  def load(wallet, amount_cents, stripe_payment_id, idempotency_key, opts \\ [])

  def load(%Wallet{} = wallet, amount_cents, stripe_payment_id, idempotency_key, opts)
      when is_integer(amount_cents) and amount_cents > 0 and is_binary(idempotency_key) do
    allow_test? = Keyword.get(opts, :allow_test_load, false) == true and Mix.env() == :test

    cond do
      not stripe_configured?() and not allow_test? ->
        {:disabled, "wallet loading not connected"}

      true ->
        case get_by_idempotency(idempotency_key) do
          %WalletTransaction{} = existing ->
            {:ok, existing}

          nil ->
            do_load(wallet, amount_cents, stripe_payment_id, idempotency_key)
        end
    end
  end

  def load(_, _, _, _, _), do: {:error, :invalid}

  @doc """
  Spend from wallet.

  - Insufficient balance → `{:error, :insufficient_balance}`
  - Over auto-approve threshold without `explicit_confirm: true` →
    `{:error, :requires_confirmation}`
  - Same idempotency_key twice → original transaction (single debit)
  """
  def spend(wallet, amount_cents, ref, idempotency_key, opts \\ [])

  def spend(%Wallet{} = wallet, amount_cents, ref, idempotency_key, opts)
      when is_integer(amount_cents) and amount_cents > 0 and is_binary(idempotency_key) do
    case get_by_idempotency(idempotency_key) do
      %WalletTransaction{} = existing ->
        {:ok, existing}

      nil ->
        threshold = wallet.auto_approve_threshold_cents || 5000
        explicit? = Keyword.get(opts, :explicit_confirm, false) == true

        cond do
          amount_cents > threshold and not explicit? ->
            {:error, :requires_confirmation}

          wallet.balance_cents < amount_cents ->
            {:error, :insufficient_balance}

          true ->
            do_spend(wallet, amount_cents, ref, idempotency_key)
        end
    end
  end

  def spend(_, _, _, _, _), do: {:error, :invalid}

  @doc "Refund a prior spend/load transaction by id (idempotent)."
  def refund(wallet, transaction_id, idempotency_key)
      when is_binary(transaction_id) and is_binary(idempotency_key) do
    case get_by_idempotency(idempotency_key) do
      %WalletTransaction{} = existing ->
        {:ok, existing}

      nil ->
        case Repo.get(WalletTransaction, transaction_id) do
          %WalletTransaction{account_id: account_id, type: type, amount_cents: amount} = original
          when account_id == wallet.account_id and type in ["spend", "load"] ->
            # Refund of a spend credits; refund of a load debits (reversal).
            credit? = type == "spend"
            signed = if credit?, do: amount, else: -amount

            if not credit? and wallet.balance_cents + signed < 0 do
              {:error, :insufficient_balance}
            else
              do_refund(wallet, original, signed, idempotency_key)
            end

          %WalletTransaction{} ->
            {:error, :invalid_transaction}

          nil ->
            {:error, :not_found}
        end
    end
  end

  def refund(_, _, _), do: {:error, :invalid}

  @doc "List transactions for an account, newest first."
  def list_transactions(account_id, opts \\ []) when is_binary(account_id) do
    limit = Keyword.get(opts, :limit, 50) |> min(100)

    rows =
      from(t in WalletTransaction,
        where: t.account_id == ^account_id,
        order_by: [desc: t.inserted_at],
        limit: ^limit
      )
      |> Repo.all()

    {:ok, rows}
  end

  def to_contract(%Wallet{} = w) do
    %{
      "id" => w.id,
      "account_id" => w.account_id,
      "balance_cents" => w.balance_cents,
      "currency" => w.currency,
      "auto_approve_threshold_cents" => w.auto_approve_threshold_cents
    }
  end

  def transaction_contract(%WalletTransaction{} = t) do
    %{
      "id" => t.id,
      "account_id" => t.account_id,
      "amount_cents" => t.amount_cents,
      "type" => t.type,
      "ref_type" => t.ref_type,
      "ref_id" => t.ref_id,
      "balance_after_cents" => t.balance_after_cents,
      "idempotency_key" => t.idempotency_key,
      "inserted_at" => t.inserted_at && DateTime.to_iso8601(t.inserted_at)
    }
  end

  # --- internals ---

  defp do_load(%Wallet{} = wallet, amount_cents, stripe_payment_id, idempotency_key) do
    new_balance = wallet.balance_cents + amount_cents

    tx_cs =
      WalletTransaction.changeset(%WalletTransaction{}, %{
        account_id: wallet.account_id,
        amount_cents: amount_cents,
        type: "load",
        ref_type: "stripe_payment",
        ref_id: stripe_payment_id && to_string(stripe_payment_id),
        balance_after_cents: new_balance,
        idempotency_key: idempotency_key
      })

    multi =
      Multi.new()
      |> Multi.update(:wallet, Wallet.changeset(wallet, %{balance_cents: new_balance}))
      |> Multi.insert(:transaction, tx_cs)
      |> Multi.run(:outbox, fn _repo, %{transaction: tx} ->
        Publisher.record(%{
          event_type: "wallet.loaded",
          event_id: "wallet_load:#{tx.id}",
          aggregate_type: "wallet",
          aggregate_id: wallet.id,
          partition_key: wallet.account_id,
          privacy_class: "private_authorized",
          purpose: "wallet_load",
          actor_user_id: wallet.account_id,
          payload: %{
            "amount_cents" => amount_cents,
            "transaction_id" => tx.id,
            "type" => "load"
          }
        })
      end)

    case Repo.transaction(multi) do
      {:ok, %{transaction: tx}} -> {:ok, tx}
      {:error, :transaction, %Ecto.Changeset{} = cs, _} -> {:error, cs}
      {:error, :wallet, %Ecto.Changeset{} = cs, _} -> {:error, cs}
      {:error, :outbox, reason, _} -> {:error, reason}
      {:error, _step, reason, _} -> {:error, reason}
    end
  end

  defp do_spend(%Wallet{} = wallet, amount_cents, ref, idempotency_key) do
    {ref_type, ref_id} = normalize_ref(ref)

    # Re-read wallet inside Multi for race safety
    multi =
      Multi.new()
      |> Multi.run(:locked_wallet, fn repo, _ ->
        case repo.get(Wallet, wallet.id) do
          %Wallet{balance_cents: bal} = w when bal >= amount_cents ->
            {:ok, w}

          %Wallet{} ->
            {:error, :insufficient_balance}

          nil ->
            {:error, :not_found}
        end
      end)
      |> Multi.run(:wallet, fn repo, %{locked_wallet: w} ->
        w
        |> Wallet.changeset(%{balance_cents: w.balance_cents - amount_cents})
        |> repo.update()
      end)
      |> Multi.run(:transaction, fn repo, %{wallet: w} ->
        %WalletTransaction{}
        |> WalletTransaction.changeset(%{
          account_id: w.account_id,
          amount_cents: amount_cents,
          type: "spend",
          ref_type: ref_type,
          ref_id: ref_id,
          balance_after_cents: w.balance_cents,
          idempotency_key: idempotency_key
        })
        |> repo.insert()
      end)
      |> Multi.run(:outbox, fn _repo, %{transaction: tx} ->
        Publisher.record(%{
          event_type: "wallet.spent",
          event_id: "wallet_spend:#{tx.id}",
          aggregate_type: "wallet",
          aggregate_id: wallet.id,
          partition_key: wallet.account_id,
          privacy_class: "private_authorized",
          purpose: "wallet_spend",
          actor_user_id: wallet.account_id,
          payload: %{
            "amount_cents" => amount_cents,
            "transaction_id" => tx.id,
            "type" => "spend"
          }
        })
      end)

    case Repo.transaction(multi) do
      {:ok, %{transaction: tx}} ->
        {:ok, tx}

      {:error, :locked_wallet, :insufficient_balance, _} ->
        {:error, :insufficient_balance}

      {:error, :transaction, %Ecto.Changeset{} = cs, _} ->
        if unique_idempotency_error?(cs) do
          case get_by_idempotency(idempotency_key) do
            %WalletTransaction{} = existing -> {:ok, existing}
            nil -> {:error, cs}
          end
        else
          {:error, cs}
        end

      {:error, :outbox, reason, _} ->
        {:error, reason}

      {:error, _step, reason, _} ->
        {:error, reason}
    end
  end

  defp do_refund(%Wallet{} = wallet, %WalletTransaction{} = original, signed_delta, idempotency_key) do
    amount_abs = abs(signed_delta)
    type = "refund"

    multi =
      Multi.new()
      |> Multi.run(:locked_wallet, fn repo, _ ->
        case repo.get(Wallet, wallet.id) do
          %Wallet{} = w ->
            if w.balance_cents + signed_delta < 0 do
              {:error, :insufficient_balance}
            else
              {:ok, w}
            end

          nil ->
            {:error, :not_found}
        end
      end)
      |> Multi.run(:wallet, fn repo, %{locked_wallet: w} ->
        w
        |> Wallet.changeset(%{balance_cents: w.balance_cents + signed_delta})
        |> repo.update()
      end)
      |> Multi.run(:transaction, fn repo, %{wallet: w} ->
        %WalletTransaction{}
        |> WalletTransaction.changeset(%{
          account_id: w.account_id,
          amount_cents: amount_abs,
          type: type,
          ref_type: "wallet_transaction",
          ref_id: original.id,
          balance_after_cents: w.balance_cents,
          idempotency_key: idempotency_key
        })
        |> repo.insert()
      end)
      |> Multi.run(:outbox, fn _repo, %{transaction: tx} ->
        Publisher.record(%{
          event_type: "wallet.refunded",
          event_id: "wallet_refund:#{tx.id}",
          aggregate_type: "wallet",
          aggregate_id: wallet.id,
          partition_key: wallet.account_id,
          privacy_class: "private_authorized",
          purpose: "wallet_refund",
          actor_user_id: wallet.account_id,
          payload: %{
            "amount_cents" => amount_abs,
            "transaction_id" => tx.id,
            "type" => "refund"
          }
        })
      end)

    case Repo.transaction(multi) do
      {:ok, %{transaction: tx}} -> {:ok, tx}
      {:error, :locked_wallet, :insufficient_balance, _} -> {:error, :insufficient_balance}
      {:error, :outbox, reason, _} -> {:error, reason}
      {:error, _step, reason, _} -> {:error, reason}
    end
  end

  defp get_by_idempotency(key) when is_binary(key) do
    Repo.get_by(WalletTransaction, idempotency_key: key)
  end

  defp normalize_ref(ref) when is_map(ref) do
    {
      to_string(ref[:type] || ref["type"] || "ref"),
      to_string(ref[:id] || ref["id"] || "")
    }
  end

  defp normalize_ref(ref) when is_binary(ref), do: {"ref", ref}
  defp normalize_ref(_), do: {"ref", nil}

  defp stripe_configured? do
    case System.get_env("STRIPE_SECRET_KEY") do
      key when is_binary(key) -> String.trim(key) != ""
      _ -> false
    end
  end

  defp unique_account_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:account_id, {_, meta}} -> meta[:constraint] == :unique
      _ -> false
    end)
  end

  defp unique_idempotency_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:idempotency_key, {_, meta}} -> meta[:constraint] == :unique
      _ -> false
    end)
  end
end
