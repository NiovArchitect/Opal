defmodule OpalCore.Lives.OpalPay do
  @moduledoc """
  Paste K Phase Q — Opal Pay at venues (QR → pay, test-mode default).

  Q.5 NFC: documented only — iOS NFC is Apple-gated in the US. Ledger rails
  exist; only tap transport would be new. QR is v1.
  """

  import Ecto.Query

  alias Ecto.Multi
  alias OpalCore.Events.Publisher
  alias OpalCore.Lives.{Venue, VenuePayment, VenueReward}
  alias OpalCore.Repo
  alias OpalCore.Wallets
  alias OpalCore.Wallets.{Wallet, WalletTransaction}

  @max_payment_cents 20_000
  @max_payments_per_day 5

  def nfc_note do
    %{
      "build" => false,
      "transport" => "qr_v1",
      "note" =>
        "iOS NFC is Apple-gated in the US. If that changes, ledger and venue-balance rails already exist — only the tap transport is new. QR is the v1 and is not a compromise: same steps, no permission needed."
    }
  end

  def qr_payload(%Venue{} = v) do
    %{
      "venue_id" => v.id,
      "name" => v.name,
      "token" => v.pay_token,
      "qr_data" => "opal://pay/#{v.pay_token}",
      "display_ready" => true,
      "show_at_counter" => "future",
      "test_mode_default" => not live_money?(),
      "live_money_flag" => "OPAL_PAY_LIVE_MONEY",
      "nfc" => nfc_note()
    }
  end

  def pay(token_or_id, payer_id, amount_cents, idempotency_key, opts \\ [])

  def pay(token_or_id, payer_id, amount_cents, idempotency_key, _opts)
      when is_binary(token_or_id) and is_binary(payer_id) and is_integer(amount_cents) and
             amount_cents > 0 and is_binary(idempotency_key) do
    case Repo.get_by(VenuePayment, idempotency_key: idempotency_key) do
      %VenuePayment{} = existing ->
        venue = Repo.get!(Venue, existing.venue_id)
        {:ok, existing, VenuePayment.to_receipt(existing, venue.name), :idempotent}

      nil ->
        do_pay(token_or_id, payer_id, amount_cents, idempotency_key)
    end
  end

  def pay(_, _, _, _, _), do: {:error, :invalid}

  defp do_pay(token_or_id, payer_id, amount_cents, idempotency_key) do
    test_mode? = not live_money?()

    with %Venue{} = venue <- resolve_venue(token_or_id),
         :ok <- check_amount(amount_cents),
         :ok <- check_daily_cap(venue.id, payer_id),
         :ok <- check_laundering(venue.id, payer_id),
         {:ok, wallet} <- Wallets.get_or_create_wallet(payer_id) do
      Multi.new()
      |> Multi.run(:spend, fn repo, _ ->
        w = repo.get!(Wallet, wallet.id)

        if w.balance_cents < amount_cents do
          {:error, :insufficient_balance}
        else
          new_bal = w.balance_cents - amount_cents
          {:ok, _} = w |> Wallet.changeset(%{balance_cents: new_bal}) |> repo.update()

          %WalletTransaction{}
          |> WalletTransaction.changeset(%{
            account_id: payer_id,
            amount_cents: amount_cents,
            type: "spend",
            ref_type: "venue_pay",
            ref_id: idempotency_key,
            balance_after_cents: new_bal,
            idempotency_key: idempotency_key
          })
          |> repo.insert()
        end
      end)
      |> Multi.run(:venue_credit, fn repo, _ ->
        v = repo.get!(Venue, venue.id)

        v
        |> Venue.changeset(%{balance_cents: v.balance_cents + amount_cents})
        |> repo.update()
      end)
      |> Multi.run(:payment, fn repo, %{spend: tx} ->
        %VenuePayment{}
        |> VenuePayment.changeset(%{
          venue_id: venue.id,
          payer_account_id: payer_id,
          amount_cents: amount_cents,
          spend_tx_id: tx.id,
          test_mode: test_mode?,
          status: "completed",
          idempotency_key: idempotency_key,
          metadata: %{"entry" => "customer"}
        })
        |> repo.insert()
      end)
      |> Multi.run(:outbox, fn _repo, %{spend: tx, payment: payment} ->
        Publisher.record(%{
          event_type: "venue.payment",
          event_id: "venue_pay:#{payment.id}",
          aggregate_type: "venue",
          aggregate_id: venue.id,
          partition_key: payer_id,
          privacy_class: "private_authorized",
          purpose: "venue_pay",
          actor_user_id: payer_id,
          payload: %{
            "amount_cents" => amount_cents,
            "test_mode" => test_mode?,
            "transaction_id" => tx.id,
            "payment_id" => payment.id
          }
        })
      end)
      |> Repo.transaction()
      |> case do
        {:ok, %{payment: payment, venue_credit: updated_venue}} ->
          receipt = VenuePayment.to_receipt(payment, updated_venue.name)
          {:ok, payment, receipt, :created}

        {:error, :spend, :insufficient_balance, _} ->
          {:error, :insufficient_balance}

        {:error, _step, reason, _} ->
          {:error, reason}
      end
    else
      nil ->
        {:error, :venue_not_found}

      {:error, _} = err ->
        err
    end
  end

  def live_money?, do: System.get_env("OPAL_PAY_LIVE_MONEY") in ~w(true 1 yes)

  defp resolve_venue(token_or_id) do
    Repo.get_by(Venue, pay_token: token_or_id) || Repo.get(Venue, token_or_id)
  end

  defp check_amount(cents) when cents > @max_payment_cents, do: {:error, :payment_too_large}
  defp check_amount(_), do: :ok

  defp check_daily_cap(venue_id, payer_id) do
    start_of_day =
      DateTime.utc_now() |> DateTime.to_date() |> DateTime.new!(~T[00:00:00], "Etc/UTC")

    count =
      from(p in VenuePayment,
        where:
          p.venue_id == ^venue_id and p.payer_account_id == ^payer_id and
            p.inserted_at >= ^start_of_day and p.status == "completed",
        select: count(p.id)
      )
      |> Repo.one()

    if (count || 0) >= @max_payments_per_day, do: {:error, :daily_pay_capped}, else: :ok
  end

  defp check_laundering(venue_id, payer_id) do
    since = DateTime.utc_now() |> DateTime.add(-24 * 3600, :second)

    recent_pays =
      from(p in VenuePayment,
        where:
          p.venue_id == ^venue_id and p.payer_account_id == ^payer_id and p.inserted_at >= ^since,
        select: count(p.id)
      )
      |> Repo.one()

    recent_rewards =
      from(r in VenueReward,
        where:
          r.venue_id == ^venue_id and r.contributor_account_id == ^payer_id and
            r.inserted_at >= ^since,
        select: count(r.id)
      )
      |> Repo.one()

    if (recent_pays || 0) >= 2 and (recent_rewards || 0) >= 2 do
      _ = from(v in Venue, where: v.id == ^venue_id) |> Repo.update_all(inc: [fraud_flags: 1])
      {:error, :laundering_pattern_frozen}
    else
      :ok
    end
  end
end
