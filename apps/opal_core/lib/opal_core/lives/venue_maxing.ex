defmodule OpalCore.Lives.VenueMaxing do
  @moduledoc """
  Paste K 7.5–7.7 — vibe contributors (facts), in-Opal rewards, private streaks.
  """

  import Ecto.Query

  alias Ecto.Multi
  alias OpalCore.Events.Publisher
  alias OpalCore.Lives.{Venue, VenueContribution, VenueReward, VenueStreak}
  alias OpalCore.Repo
  alias OpalCore.Wallets
  alias OpalCore.Wallets.{Wallet, WalletTransaction}

  def record_attendance(account_id, %Venue{} = venue) when is_binary(account_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    weekday = Date.day_of_week(DateTime.to_date(now))

    {:ok, contrib} =
      upsert_contribution(venue.id, account_id, fn c ->
        %{
          live_attend_count: c.live_attend_count + 1,
          last_attended_at: now
        }
      end)

    _ = upsert_streak(account_id, venue, weekday, now)
    {:ok, contrib}
  end

  def record_sticker(account_id, %Venue{} = venue) when is_binary(account_id) do
    upsert_contribution(venue.id, account_id, fn c ->
      %{sticker_count: c.sticker_count + 1}
    end)
  end

  def list_contributors(venue_id, viewer_id, opts \\ [])
      when is_binary(venue_id) and is_binary(viewer_id) do
    circle? = Keyword.get(opts, :circle?, false)

    rows =
      from(c in VenueContribution,
        where: c.venue_id == ^venue_id,
        order_by: [desc: c.live_attend_count, desc: c.sticker_count],
        limit: 50
      )
      |> Repo.all()

    contracts =
      Enum.map(rows, fn c ->
        if circle?,
          do: VenueContribution.to_circle_contract(c),
          else: VenueContribution.to_stranger_contract(c)
      end)

    {:ok,
     %{
       "contributors" => contracts,
       "scoring" => false,
       "fact_not_rating" => true,
       "people_scoring_ban" => true
     }}
  end

  def private_streaks(account_id) when is_binary(account_id) do
    rows =
      from(s in VenueStreak,
        where: s.account_id == ^account_id and s.count >= 2,
        order_by: [desc: s.count],
        limit: 20
      )
      |> Repo.all()

    Enum.map(rows, fn s ->
      venue = Repo.get(Venue, s.venue_id)
      name = (venue && venue.name) || "a venue"
      VenueStreak.to_private_nudge(s, name)
    end)
  end

  def reward(venue_id, contributor_id, amount_cents, idempotency_key, opts \\ [])

  def reward(venue_id, contributor_id, amount_cents, idempotency_key, _opts)
      when is_binary(venue_id) and is_binary(contributor_id) and is_integer(amount_cents) and
             amount_cents > 0 and is_binary(idempotency_key) do
    case Repo.get_by(VenueReward, idempotency_key: idempotency_key) do
      %VenueReward{} = existing ->
        {:ok, existing, :idempotent}

      nil ->
        do_reward(venue_id, contributor_id, amount_cents, idempotency_key)
    end
  end

  def reward(_, _, _, _, _), do: {:error, :invalid}

  defp do_reward(venue_id, contributor_id, amount_cents, idempotency_key) do
    test_mode? = not (System.get_env("OPAL_PAY_LIVE_MONEY") in ~w(true 1 yes))

    with %Venue{} = venue <- Repo.get(Venue, venue_id),
         true <- venue.balance_cents >= amount_cents,
         {:ok, wallet} <- Wallets.get_or_create_wallet(contributor_id) do
      Multi.new()
      |> Multi.run(:debit_venue, fn repo, _ ->
        v = repo.get!(Venue, venue.id)

        if v.balance_cents < amount_cents do
          {:error, :insufficient_venue_balance}
        else
          v
          |> Venue.changeset(%{balance_cents: v.balance_cents - amount_cents})
          |> repo.update()
        end
      end)
      |> Multi.run(:credit, fn repo, _ ->
        w = repo.get!(Wallet, wallet.id)
        new_bal = w.balance_cents + amount_cents
        {:ok, _} = w |> Wallet.changeset(%{balance_cents: new_bal}) |> repo.update()

        %WalletTransaction{}
        |> WalletTransaction.changeset(%{
          account_id: contributor_id,
          amount_cents: amount_cents,
          type: "adjustment",
          ref_type: "venue_reward",
          ref_id: idempotency_key,
          balance_after_cents: new_bal,
          idempotency_key: idempotency_key <> ":credit"
        })
        |> repo.insert()
      end)
      |> Multi.run(:reward_row, fn repo, %{credit: tx} ->
        %VenueReward{}
        |> VenueReward.changeset(%{
          venue_id: venue.id,
          contributor_account_id: contributor_id,
          amount_cents: amount_cents,
          credit_tx_id: tx.id,
          test_mode: test_mode?,
          idempotency_key: idempotency_key,
          note: "venue reward"
        })
        |> repo.insert()
      end)
      |> Multi.run(:outbox, fn _repo, %{credit: tx} ->
        Publisher.record(%{
          event_type: "venue.reward",
          event_id: "venue_reward:#{tx.id}",
          aggregate_type: "venue",
          aggregate_id: venue.id,
          partition_key: contributor_id,
          privacy_class: "private_authorized",
          purpose: "venue_reward",
          actor_user_id: contributor_id,
          payload: %{"amount_cents" => amount_cents, "transaction_id" => tx.id}
        })
      end)
      |> Repo.transaction()
      |> case do
        {:ok, %{reward_row: row}} ->
          {:ok, row, :created}

        {:error, :debit_venue, :insufficient_venue_balance, _} ->
          {:error, :insufficient_venue_balance}

        {:error, _step, reason, _} ->
          {:error, reason}
      end
    else
      nil ->
        {:error, :not_found}

      false ->
        {:error, :insufficient_venue_balance}

      {:error, _} = err ->
        err
    end
  end

  defp upsert_contribution(venue_id, account_id, update_fun) do
    case Repo.get_by(VenueContribution, venue_id: venue_id, account_id: account_id) do
      %VenueContribution{} = c ->
        c |> VenueContribution.changeset(update_fun.(c)) |> Repo.update()

      nil ->
        base = %VenueContribution{
          venue_id: venue_id,
          account_id: account_id,
          live_attend_count: 0,
          sticker_count: 0
        }

        attrs = update_fun.(base)

        %VenueContribution{}
        |> VenueContribution.changeset(
          Map.merge(%{venue_id: venue_id, account_id: account_id}, attrs)
        )
        |> Repo.insert()
    end
  end

  defp upsert_streak(account_id, %Venue{} = venue, weekday, now) do
    case Repo.get_by(VenueStreak,
           account_id: account_id,
           venue_id: venue.id,
           weekday: weekday
         ) do
      %VenueStreak{} = s ->
        s
        |> VenueStreak.changeset(%{
          count: s.count + 1,
          last_at: now,
          label: "#{venue.name} #{weekday_short(weekday)}s"
        })
        |> Repo.update()

      nil ->
        %VenueStreak{}
        |> VenueStreak.changeset(%{
          account_id: account_id,
          venue_id: venue.id,
          weekday: weekday,
          count: 1,
          last_at: now,
          label: "#{venue.name} #{weekday_short(weekday)}s"
        })
        |> Repo.insert()
    end
  end

  defp weekday_short(5), do: "Friday"
  defp weekday_short(6), do: "Saturday"
  defp weekday_short(n), do: to_string(n)
end
