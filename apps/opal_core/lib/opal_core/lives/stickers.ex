defmodule OpalCore.Lives.Stickers do
  @moduledoc """
  Paste K Phase S — sticker economy (70/30 host/venue, test-mode default).
  All ledger moves share one Multi (Paste G double-spend impossible).
  """

  import Ecto.Query

  alias Ecto.Multi
  alias OpalCore.Events.Publisher
  alias OpalCore.Lives.{LiveRoom, LiveSticker, StickerCatalog, Venue, VenueMaxing, Verification}
  alias OpalCore.Repo
  alias OpalCore.Wallets
  alias OpalCore.Wallets.{Wallet, WalletTransaction}

  @max_stickers_per_min 10
  @max_cents_per_live_per_viewer 5000

  def purchase(live_room_id, sender_id, sticker_key, idempotency_key, opts \\ [])

  def purchase(live_room_id, sender_id, sticker_key, idempotency_key, _opts)
      when is_binary(live_room_id) and is_binary(sender_id) and is_binary(sticker_key) and
             is_binary(idempotency_key) do
    case Repo.get_by(LiveSticker, idempotency_key: idempotency_key) do
      %LiveSticker{} = existing ->
        {:ok, existing, :idempotent}

      nil ->
        do_purchase(live_room_id, sender_id, sticker_key, idempotency_key)
    end
  end

  def purchase(_, _, _, _, _), do: {:error, :invalid}

  defp do_purchase(live_room_id, sender_id, sticker_key, idempotency_key) do
    test_mode? = not live_money?()

    with %{} = sticker <- StickerCatalog.get(sticker_key) || :unknown_sticker,
         %LiveRoom{} = room <- Repo.get(LiveRoom, live_room_id) || :live_not_found,
         %Venue{} = venue0 <- Repo.get(Venue, room.venue_id) || :venue_not_found,
         venue = Verification.maybe_graduate_quarantine(venue0),
         :ok <- reject_self_gift(room, sender_id),
         :ok <- reject_if_not_live(room),
         :ok <- reject_if_stickers_disabled(venue),
         :ok <- check_velocity(sender_id),
         :ok <- check_live_cap(live_room_id, sender_id, sticker.amount_cents),
         :ok <- check_circular(sender_id, room.host_account_id),
         {:ok, viewer_wallet} <- Wallets.get_or_create_wallet(sender_id),
         {:ok, host_wallet} <- Wallets.get_or_create_wallet(room.host_account_id) do
      split = StickerCatalog.split(sticker.amount_cents)
      accrue? = Venue.escrow_accrues?(venue)
      venue_share = if accrue?, do: split.venue_share_cents, else: 0

      Multi.new()
      |> Multi.run(:spend, fn repo, _ ->
        w = repo.get!(Wallet, viewer_wallet.id)

        if w.balance_cents < sticker.amount_cents do
          {:error, :insufficient_balance}
        else
          new_bal = w.balance_cents - sticker.amount_cents
          {:ok, _} = w |> Wallet.changeset(%{balance_cents: new_bal}) |> repo.update()

          %WalletTransaction{}
          |> WalletTransaction.changeset(%{
            account_id: sender_id,
            amount_cents: sticker.amount_cents,
            type: "spend",
            ref_type: "live_sticker",
            ref_id: idempotency_key,
            balance_after_cents: new_bal,
            idempotency_key: idempotency_key
          })
          |> repo.insert()
        end
      end)
      |> Multi.run(:host_credit, fn repo, %{spend: spend_tx} ->
        if split.host_share_cents <= 0 do
          {:ok, nil}
        else
          w = repo.get!(Wallet, host_wallet.id)
          new_bal = w.balance_cents + split.host_share_cents
          {:ok, _} = w |> Wallet.changeset(%{balance_cents: new_bal}) |> repo.update()

          %WalletTransaction{}
          |> WalletTransaction.changeset(%{
            account_id: room.host_account_id,
            amount_cents: split.host_share_cents,
            type: "adjustment",
            ref_type: "sticker_host",
            ref_id: spend_tx.id,
            balance_after_cents: new_bal,
            idempotency_key: idempotency_key <> ":host"
          })
          |> repo.insert()
        end
      end)
      |> Multi.run(:venue_escrow, fn repo, _ ->
        if venue_share > 0 do
          v = repo.get!(Venue, venue.id)

          v
          |> Venue.changeset(%{
            escrow_balance_cents: v.escrow_balance_cents + venue_share,
            balance_cents: v.balance_cents + venue_share
          })
          |> repo.update()
        else
          {:ok, venue}
        end
      end)
      |> Multi.run(:sticker_row, fn repo, %{spend: spend_tx, host_credit: host_tx} ->
        %LiveSticker{}
        |> LiveSticker.changeset(%{
          live_room_id: live_room_id,
          venue_id: venue.id,
          sender_account_id: sender_id,
          host_account_id: room.host_account_id,
          sticker_key: sticker_key,
          amount_cents: sticker.amount_cents,
          host_share_cents: split.host_share_cents,
          venue_share_cents: venue_share,
          spend_tx_id: spend_tx.id,
          host_credit_tx_id: host_tx && host_tx.id,
          test_mode: test_mode?,
          idempotency_key: idempotency_key
        })
        |> repo.insert()
      end)
      |> Multi.run(:outbox, fn _repo, %{spend: spend_tx} ->
        Publisher.record(%{
          event_type: "live.sticker_sent",
          event_id: "live_sticker:#{spend_tx.id}",
          aggregate_type: "live_room",
          aggregate_id: live_room_id,
          partition_key: sender_id,
          privacy_class: "private_authorized",
          purpose: "live_sticker",
          actor_user_id: sender_id,
          payload: %{
            "amount_cents" => sticker.amount_cents,
            "sticker_key" => sticker_key,
            "test_mode" => test_mode?,
            "transaction_id" => spend_tx.id
          }
        })
      end)
      |> Repo.transaction()
      |> case do
        {:ok, %{sticker_row: row}} ->
          _ = VenueMaxing.record_sticker(sender_id, venue)
          {:ok, row, :created}

        {:error, :spend, :insufficient_balance, _} ->
          {:error, :insufficient_balance}

        {:error, :sticker_row, %Ecto.Changeset{} = cs, _} ->
          if unique_idem?(cs) do
            {:ok, Repo.get_by!(LiveSticker, idempotency_key: idempotency_key), :idempotent}
          else
            {:error, cs}
          end

        {:error, :spend, %Ecto.Changeset{} = cs, _} ->
          if unique_idem?(cs) do
            {:ok, Repo.get_by!(LiveSticker, idempotency_key: idempotency_key), :idempotent}
          else
            {:error, cs}
          end

        {:error, _step, reason, _} ->
          {:error, reason}
      end
    else
      :unknown_sticker ->
        {:error, :unknown_sticker}

      :live_not_found ->
        {:error, :not_found}

      :venue_not_found ->
        {:error, :not_found}

      {:error, _} = err ->
        err
    end
  end

  def host_display(sticker, sender_name \\ "Someone") do
    cat = StickerCatalog.get(sticker.sticker_key)
    emoji = (cat && cat.emoji) || "✨"
    dollars = sticker.host_share_cents / 100.0

    %{
      "body" =>
        "#{sender_name} sent #{emoji} (+$#{:erlang.float_to_binary(dollars, decimals: 2)})",
      "overlay_seconds" => 3,
      "test_mode" => sticker.test_mode,
      "honesty" => if(sticker.test_mode, do: "Stickers use test credits for now.", else: nil),
      "shows_venue_escrow" => false
    }
  end

  def live_money?, do: System.get_env("OPAL_STICKER_LIVE_MONEY") in ~w(true 1 yes)

  defp reject_self_gift(%LiveRoom{host_account_id: host}, sender) when host == sender,
    do: {:error, :self_gifting_forbidden}

  defp reject_self_gift(_, _), do: :ok

  defp reject_if_not_live(%LiveRoom{status: status}) when status in ~w(live flagged), do: :ok
  defp reject_if_not_live(_), do: {:error, :live_not_active}

  defp reject_if_stickers_disabled(%Venue{} = v) do
    if Venue.stickers_enabled?(v), do: :ok, else: {:error, :stickers_disabled_quarantine}
  end

  defp check_velocity(sender_id) do
    since = DateTime.utc_now() |> DateTime.add(-60, :second)

    count =
      from(s in LiveSticker,
        where: s.sender_account_id == ^sender_id and s.inserted_at >= ^since,
        select: count(s.id)
      )
      |> Repo.one()

    if (count || 0) >= @max_stickers_per_min, do: {:error, :velocity_limited}, else: :ok
  end

  defp check_live_cap(live_room_id, sender_id, add_cents) do
    spent =
      from(s in LiveSticker,
        where: s.live_room_id == ^live_room_id and s.sender_account_id == ^sender_id,
        select: coalesce(sum(s.amount_cents), 0)
      )
      |> Repo.one()

    if (spent || 0) + add_cents > @max_cents_per_live_per_viewer,
      do: {:error, :live_spend_capped},
      else: :ok
  end

  defp check_circular(sender_id, host_id) do
    since = DateTime.utc_now() |> DateTime.add(-24 * 3600, :second)

    reverse? =
      from(s in LiveSticker,
        join: r in LiveRoom,
        on: r.id == s.live_room_id,
        where:
          s.sender_account_id == ^host_id and r.host_account_id == ^sender_id and
            s.inserted_at >= ^since,
        select: count(s.id)
      )
      |> Repo.one()

    if (reverse? || 0) > 0 do
      forward =
        from(s in LiveSticker,
          join: r in LiveRoom,
          on: r.id == s.live_room_id,
          where:
            s.sender_account_id == ^sender_id and r.host_account_id == ^host_id and
              s.inserted_at >= ^since,
          select: count(s.id)
        )
        |> Repo.one()

      if (forward || 0) >= 5, do: {:error, :circular_gifting_flagged}, else: :ok
    else
      :ok
    end
  end

  defp unique_idem?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:idempotency_key, {_, meta}} -> meta[:constraint] == :unique
      _ -> false
    end)
  end
end
