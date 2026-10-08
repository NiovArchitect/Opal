defmodule OpalCore.WalletsTest do
  use OpalCore.DataCase, async: false

  alias Ecto.Multi
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo
  alias OpalCore.Wallets
  alias OpalCore.Wallets.{Wallet, WalletTransaction}

  setup do
    prior = System.get_env("STRIPE_SECRET_KEY")
    System.delete_env("STRIPE_SECRET_KEY")

    on_exit(fn ->
      if prior, do: System.put_env("STRIPE_SECRET_KEY", prior), else: System.delete_env("STRIPE_SECRET_KEY")
    end)

    account_id = Ecto.UUID.generate()
    {:ok, wallet} = Wallets.get_or_create_wallet(account_id)
    %{account_id: account_id, wallet: wallet}
  end

  test "load without Stripe → disabled", %{wallet: wallet} do
    assert {:disabled, "wallet loading not connected"} =
             Wallets.load(wallet, 1000, "pi_test", "idem-load-disabled-1")
  end

  test "double-spend same idempotency key → one row, single debit", %{
    account_id: account_id,
    wallet: wallet
  } do
    {:ok, funded} = fund!(wallet, 10_000)

    assert {:ok, tx1} =
             Wallets.spend(funded, 2000, %{"type" => "booking", "id" => "b1"}, "idem-spend-dup",
               explicit_confirm: true
             )

    assert {:ok, tx2} =
             Wallets.spend(
               Repo.get!(Wallet, funded.id),
               2000,
               %{"type" => "booking", "id" => "b1"},
               "idem-spend-dup",
               explicit_confirm: true
             )

    assert tx1.id == tx2.id

    rows =
      from(t in WalletTransaction,
        where: t.account_id == ^account_id and t.type == "spend"
      )
      |> Repo.all()

    assert length(rows) == 1

    refreshed = Repo.get!(Wallet, funded.id)
    assert refreshed.balance_cents == 8000
  end

  test "insufficient balance → error", %{wallet: wallet} do
    {:ok, funded} = fund!(wallet, 500)

    assert {:error, :insufficient_balance} =
             Wallets.spend(funded, 600, "ref", "idem-insuf", explicit_confirm: true)
  end

  test "$60 spend without explicit_confirm → requires_confirmation", %{wallet: wallet} do
    {:ok, funded} = fund!(wallet, 10_000)

    assert {:error, :requires_confirmation} =
             Wallets.spend(funded, 6000, "ref", "idem-thresh-1")
  end

  test "$60 spend with explicit_confirm → spends", %{wallet: wallet} do
    {:ok, funded} = fund!(wallet, 10_000)

    assert {:ok, tx} =
             Wallets.spend(funded, 6000, "ref", "idem-thresh-2", explicit_confirm: true)

    assert tx.type == "spend"
    assert tx.amount_cents == 6000
    assert Repo.get!(Wallet, funded.id).balance_cents == 4000
  end

  test "spend succeeds and outbox row exists with matching event", %{
    account_id: account_id,
    wallet: wallet
  } do
    {:ok, funded} = fund!(wallet, 5000)

    assert {:ok, tx} =
             Wallets.spend(funded, 1000, "ref", "idem-outbox-ok", explicit_confirm: true)

    row =
      from(o in EventOutbox, where: o.event_type == "wallet.spent")
      |> Repo.all()
      |> Enum.find(fn o -> get_in(o.envelope, ["payload", "transaction_id"]) == tx.id end)

    assert row
    assert row.topic_family == "opal.wallet.events"
    assert row.privacy_class == "private_authorized"
    assert row.partition_key == account_id
    assert get_in(row.envelope, ["payload", "amount_cents"]) == 1000
    assert get_in(row.envelope, ["payload", "type"]) == "spend"
    refute Map.has_key?(row.envelope["payload"] || %{}, "card_number")
  end

  test "invalid outbox attrs roll back via Multi — balance unchanged", %{wallet: wallet} do
    {:ok, funded} = fund!(wallet, 5000)
    before = funded.balance_cents

    multi =
      Multi.new()
      |> Multi.update(:wallet, Wallet.changeset(funded, %{balance_cents: before - 1000}))
      |> Multi.run(:outbox, fn _repo, _ ->
        # Missing required :partition_key → DomainEvent.build raises / errors
        try do
          Publisher.record(%{
            event_type: "wallet.spent",
            payload: %{"amount_cents" => 1000, "type" => "spend"}
          })
        rescue
          e in [KeyError, ArgumentError] -> {:error, e}
        end
      end)

    assert {:error, :outbox, _, _} = Repo.transaction(multi)
    assert Repo.get!(Wallet, funded.id).balance_cents == before
  end

  defp fund!(%Wallet{} = wallet, amount_cents) do
    assert {:ok, tx} =
             Wallets.load(wallet, amount_cents, "pi_test_#{System.unique_integer([:positive])}",
               "idem-fund-#{System.unique_integer([:positive])}",
               allow_test_load: true
             )

    assert tx.type == "load"
    {:ok, Repo.get!(Wallet, wallet.id)}
  end
end
