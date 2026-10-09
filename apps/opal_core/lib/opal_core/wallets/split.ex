defmodule OpalCore.Wallets.Split do
  @moduledoc """
  Paste I — minimal N-way / 1:1 wallet split helpers.

  Debits the payer, credits the payee, writes outbox events. Peer-facing
  contracts never include balances, thresholds, or ledger history.
  """

  import Ecto.Query

  alias Ecto.Multi
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo
  alias OpalCore.Relationships.Behavior
  alias OpalCore.Wallets
  alias OpalCore.Wallets.{Wallet, WalletTransaction}

  @doc """
  Build a split-request card for `payer` (B) toward `payee` (A).

  Contract fields FE needs: amount, label, confirm/decline — never balances.
  """
  def request(payee_id, payer_id, amount_cents, label, opts \\ [])
      when is_binary(payee_id) and is_binary(payer_id) and is_integer(amount_cents) and
             amount_cents > 0 and is_binary(label) do
    rel = Keyword.get(opts, :relationship_type) || "friend"
    copy = Behavior.split_ask_copy(rel, amount_cents, label)
    group_total = Keyword.get(opts, :group_total_cents)

    card = %{
      "id" => Ecto.UUID.generate(),
      "kind" => "split_request",
      "payee_id" => payee_id,
      "payer_id" => payer_id,
      "amount_cents" => amount_cents,
      "label" => label,
      "body" => copy.body,
      "tone" => copy.tone,
      "shows_balance" => false,
      "choices" => ["confirm", "decline"],
      "shame_free" => true
    }

    card =
      if is_integer(group_total) do
        Map.put(card, "group_total_cents", group_total)
      else
        card
      end

    {:ok, card}
  end

  def request(_, _, _, _, _), do: {:error, :invalid}

  @doc """
  Confirm a split: debit payer, credit payee. Idempotent on `idempotency_key`.

  On insufficient funds returns a kind, non-leaking error contract for the payer
  and a group-visible "waiting" state that never includes balance numbers.
  """
  def confirm(payee_id, payer_id, amount_cents, label, idempotency_key, opts \\ [])
      when is_binary(payee_id) and is_binary(payer_id) and is_integer(amount_cents) and
             amount_cents > 0 and is_binary(idempotency_key) do
    with {:ok, payer_w} <- Wallets.get_or_create_wallet(payer_id),
         {:ok, payee_w} <- Wallets.get_or_create_wallet(payee_id) do
      case existing_transfer(idempotency_key) do
        %WalletTransaction{} = tx ->
          {:ok, receipt_for(tx, label, amount_cents, payee_id, payer_id)}

        nil ->
          do_confirm(payee_w, payer_w, amount_cents, label, idempotency_key, opts)
      end
    end
  end

  def confirm(_, _, _, _, _, _), do: {:error, :invalid}

  @doc """
  Multi-party booking gate: each member must confirm their share before execute.

  Returns `%{status, confirmations, waiting_on, group_total_cents, per_person_cents}`.
  Declines cancel cleanly with zero partial charges.
  """
  def group_booking_gate(member_ids, per_person_cents, opts \\ [])
      when is_list(member_ids) and is_integer(per_person_cents) and per_person_cents > 0 do
    confirms = Keyword.get(opts, :confirmations) || %{}
    declines = MapSet.new(Keyword.get(opts, :declines) || [])

    statuses =
      Enum.map(member_ids, fn id ->
        cond do
          MapSet.member?(declines, id) -> {id, "declined"}
          Map.get(confirms, id) == true -> {id, "confirmed"}
          true -> {id, "pending"}
        end
      end)

    declined? = Enum.any?(statuses, fn {_, s} -> s == "declined" end)
    all_confirmed? = Enum.all?(statuses, fn {_, s} -> s == "confirmed" end)
    waiting = for {id, "pending"} <- statuses, do: id

    status =
      cond do
        declined? -> "cancelled"
        all_confirmed? -> "ready_to_execute"
        true -> "awaiting_confirmations"
      end

    %{
      "status" => status,
      "per_person_cents" => per_person_cents,
      "group_total_cents" => per_person_cents * length(member_ids),
      "confirmations" => Map.new(statuses),
      "waiting_on" => waiting,
      "partial_charges" => false,
      "shows_balance" => false,
      "choices_per_member" => ["confirm", "decline"]
    }
  end

  @doc """
  Insufficient-funds UX for the payer + group-safe waiting card.

  Never embeds the actual balance in either contract.
  """
  def insufficient_contracts(payer_id, amount_cents, label)
      when is_binary(payer_id) and is_integer(amount_cents) do
    payer = %{
      "kind" => "split_insufficient",
      "payer_id" => payer_id,
      "amount_cents" => amount_cents,
      "label" => label,
      "message" => "Not enough — load or decline",
      "choices" => ["load", "decline"],
      "shame_free" => true,
      "shows_balance" => false,
      "leaks_balance" => false
    }

    group = %{
      "kind" => "split_waiting",
      "waiting_on" => payer_id,
      "message" => "Waiting on a member",
      "shows_balance" => false,
      "leaks_balance" => false
    }

    %{payer: payer, group: group}
  end

  @doc "Idempotent refund credit to a wallet (test/provider refund path)."
  def credit_refund(account_id, amount_cents, idempotency_key, label \\ "refund")
      when is_binary(account_id) and is_integer(amount_cents) and amount_cents > 0 and
             is_binary(idempotency_key) do
    with {:ok, wallet} <- Wallets.get_or_create_wallet(account_id) do
      case get_by_idempotency(idempotency_key) do
        %WalletTransaction{} = tx ->
          {:ok,
           %{
             "transaction_id" => tx.id,
             "amount_cents" => amount_cents,
             "label" => label,
             "kind" => "refund_receipt",
             "message" => "Refunded $#{Float.round(amount_cents / 100, 2)}",
             "idempotent" => true,
             "shows_balance" => false
           }}

        nil ->
          do_credit(wallet, amount_cents, idempotency_key, "refund", label)
      end
    end
  end

  # ── internals ────────────────────────────────────────────────────────────

  defp do_confirm(payee_w, payer_w, amount_cents, label, idempotency_key, _opts) do
    if payer_w.balance_cents < amount_cents do
      {:error, {:insufficient_balance, insufficient_contracts(payer_w.account_id, amount_cents, label)}}
    else
      spend_key = idempotency_key <> ":spend"
      credit_key = idempotency_key <> ":credit"

      multi =
        Multi.new()
        |> Multi.run(:payer, fn repo, _ ->
          case repo.get(Wallet, payer_w.id) do
            %Wallet{balance_cents: bal} = w when bal >= amount_cents -> {:ok, w}
            %Wallet{} -> {:error, :insufficient_balance}
            nil -> {:error, :not_found}
          end
        end)
        |> Multi.run(:payee, fn repo, _ ->
          case repo.get(Wallet, payee_w.id) do
            %Wallet{} = w -> {:ok, w}
            nil -> {:error, :not_found}
          end
        end)
        |> Multi.run(:debit_wallet, fn repo, %{payer: w} ->
          w
          |> Wallet.changeset(%{balance_cents: w.balance_cents - amount_cents})
          |> repo.update()
        end)
        |> Multi.run(:debit_tx, fn repo, %{debit_wallet: w} ->
          %WalletTransaction{}
          |> WalletTransaction.changeset(%{
            account_id: w.account_id,
            amount_cents: amount_cents,
            type: "spend",
            ref_type: "split",
            ref_id: label,
            balance_after_cents: w.balance_cents,
            idempotency_key: spend_key
          })
          |> repo.insert()
        end)
        |> Multi.run(:credit_wallet, fn repo, %{payee: w} ->
          w
          |> Wallet.changeset(%{balance_cents: w.balance_cents + amount_cents})
          |> repo.update()
        end)
        |> Multi.run(:credit_tx, fn repo, %{credit_wallet: w} ->
          %WalletTransaction{}
          |> WalletTransaction.changeset(%{
            account_id: w.account_id,
            amount_cents: amount_cents,
            type: "load",
            ref_type: "split_credit",
            ref_id: label,
            balance_after_cents: w.balance_cents,
            idempotency_key: credit_key
          })
          |> repo.insert()
        end)
        |> Multi.run(:outbox_spend, fn _repo, %{debit_tx: tx} ->
          Publisher.record(%{
            event_type: "wallet.split_spent",
            event_id: "wallet_split_spend:#{tx.id}",
            aggregate_type: "wallet",
            aggregate_id: payer_w.id,
            partition_key: payer_w.account_id,
            privacy_class: "private_authorized",
            purpose: "wallet_split",
            actor_user_id: payer_w.account_id,
            payload: %{
              "amount_cents" => amount_cents,
              "label" => label,
              "transaction_id" => tx.id,
              "counterparty_id" => payee_w.account_id
            }
          })
        end)
        |> Multi.run(:outbox_credit, fn _repo, %{credit_tx: tx} ->
          Publisher.record(%{
            event_type: "wallet.split_credited",
            event_id: "wallet_split_credit:#{tx.id}",
            aggregate_type: "wallet",
            aggregate_id: payee_w.id,
            partition_key: payee_w.account_id,
            privacy_class: "private_authorized",
            purpose: "wallet_split",
            actor_user_id: payee_w.account_id,
            payload: %{
              "amount_cents" => amount_cents,
              "label" => label,
              "transaction_id" => tx.id,
              "counterparty_id" => payer_w.account_id
            }
          })
        end)

      case Repo.transaction(multi) do
        {:ok, %{debit_tx: tx}} ->
          {:ok, receipt_for(tx, label, amount_cents, payee_w.account_id, payer_w.account_id)}

        {:error, :payer, :insufficient_balance, _} ->
          {:error,
           {:insufficient_balance, insufficient_contracts(payer_w.account_id, amount_cents, label)}}

        {:error, _step, reason, _} ->
          {:error, reason}
      end
    end
  end

  defp do_credit(%Wallet{} = wallet, amount_cents, idempotency_key, type, label) do
    multi =
      Multi.new()
      |> Multi.run(:wallet, fn repo, _ ->
        case repo.get(Wallet, wallet.id) do
          %Wallet{} = w ->
            w
            |> Wallet.changeset(%{balance_cents: w.balance_cents + amount_cents})
            |> repo.update()

          nil ->
            {:error, :not_found}
        end
      end)
      |> Multi.run(:transaction, fn repo, %{wallet: w} ->
        %WalletTransaction{}
        |> WalletTransaction.changeset(%{
          account_id: w.account_id,
          amount_cents: amount_cents,
          type: type,
          ref_type: "refund",
          ref_id: label,
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
          payload: %{"amount_cents" => amount_cents, "transaction_id" => tx.id, "label" => label}
        })
      end)

    case Repo.transaction(multi) do
      {:ok, %{transaction: tx}} ->
        {:ok,
         %{
           "transaction_id" => tx.id,
           "amount_cents" => amount_cents,
           "label" => label,
           "kind" => "refund_receipt",
           "message" => "Refunded $#{Float.round(amount_cents / 100, 2)}",
           "idempotent" => false,
           "shows_balance" => false
         }}

      {:error, _step, reason, _} ->
        {:error, reason}
    end
  end

  defp receipt_for(%WalletTransaction{} = tx, label, amount_cents, payee_id, payer_id) do
    %{
      "kind" => "split_receipt",
      "transaction_id" => tx.id,
      "amount_cents" => amount_cents,
      "label" => label,
      "payee_id" => payee_id,
      "payer_id" => payer_id,
      "choices" => [],
      "shows_balance" => false,
      "shame_free" => true
    }
  end

  defp existing_transfer(idempotency_key) do
    get_by_idempotency(idempotency_key <> ":spend")
  end

  defp get_by_idempotency(key) do
    from(t in WalletTransaction, where: t.idempotency_key == ^key, limit: 1)
    |> Repo.one()
  end
end
