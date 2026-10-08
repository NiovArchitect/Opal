defmodule OpalCore.Bookings.DreamPathTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Bookings.{EmailWatch, Service}
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.Commitment
  alias OpalCore.Wallets
  alias OpalCore.Wallets.Wallet

  setup do
    prior_duffel = System.get_env("DUFFEL_API_KEY")
    prior_stripe = System.get_env("STRIPE_SECRET_KEY")
    System.delete_env("DUFFEL_API_KEY")
    System.delete_env("STRIPE_SECRET_KEY")

    on_exit(fn ->
      restore("DUFFEL_API_KEY", prior_duffel)
      restore("STRIPE_SECRET_KEY", prior_stripe)
    end)

    account_id = Ecto.UUID.generate()
    %{account_id: account_id}
  end

  defp restore(name, nil), do: System.delete_env(name)
  defp restore(name, val), do: System.put_env(name, val)

  test "dream path: search→pick→wallet load→confirm→email watch (MockProvider, zero real money)",
       %{account_id: account_id} do
    # 1) Search with mock
    assert {:ok, %{kind: :search_results, booking: booking, results: [offer | _]}} =
             Service.search(
               account_id,
               %{
                 "booking_type" => "flight",
                 "destination" => "SFO",
                 "allow_test_mock" => true
               },
               allow_test_mock: true
             )

    assert offer["bookable"] == true
    booking_id = booking["id"]

    # 2) Fund wallet via test load (no Stripe / no real money)
    {:ok, wallet} = Wallets.get_or_create_wallet(account_id)

    assert {:ok, _tx} =
             Wallets.load(wallet, 20_000, "pi_test_dream", "idem-dream-load",
               allow_test_load: true
             )

    funded = Repo.get!(Wallet, wallet.id)
    assert funded.balance_cents == 20_000

    # 3) Confirm with wallet spend under threshold (one-tap)
    assert {:ok, %{kind: :confirmed, confirmation_number: conf, email_watch: watch}} =
             Service.confirm(
               account_id,
               %{
                 "id" => booking_id,
                 "offer_id" => offer["offer_id"],
                 "pay_from_wallet" => true,
                 "amount_cents" => 4500,
                 "allow_test_mock" => true,
                 "idempotency_key" => "idem-dream-spend"
               },
               allow_test_mock: true
             )

    assert is_binary(conf)
    assert String.starts_with?(conf, "MOCK")
    assert watch["status"] == "armed"

    refreshed = Repo.get!(Wallet, wallet.id)
    assert refreshed.balance_cents == 20_000 - 4500

    {:ok, b} = Service.get(account_id, booking_id)
    assert {:ok, %{"status" => "armed"}} = EmailWatch.status(b)
  end

  test "over-threshold spend without explicit_confirm → requires_confirmation", %{
    account_id: account_id
  } do
    assert {:ok, %{booking: booking, results: [offer | _]}} =
             Service.search(
               account_id,
               %{"booking_type" => "flight", "allow_test_mock" => true},
               allow_test_mock: true
             )

    {:ok, wallet} = Wallets.get_or_create_wallet(account_id)

    {:ok, _} =
      Wallets.load(wallet, 50_000, "pi_hi", "idem-hi-load", allow_test_load: true)

    assert {:error, :requires_confirmation} =
             Service.confirm(
               account_id,
               %{
                 "id" => booking["id"],
                 "offer_id" => offer["offer_id"],
                 "pay_from_wallet" => true,
                 "amount_cents" => 6000,
                 "allow_test_mock" => true
               },
               allow_test_mock: true
             )
  end

  test "insufficient balance → honest gate", %{account_id: account_id} do
    assert {:ok, %{booking: booking, results: [offer | _]}} =
             Service.search(
               account_id,
               %{"booking_type" => "flight", "allow_test_mock" => true},
               allow_test_mock: true
             )

    _ = Wallets.get_or_create_wallet(account_id)

    assert {:error, :insufficient_balance} =
             Service.confirm(
               account_id,
               %{
                 "id" => booking["id"],
                 "offer_id" => offer["offer_id"],
                 "pay_from_wallet" => true,
                 "amount_cents" => 1000,
                 "allow_test_mock" => true
               },
               allow_test_mock: true
             )
  end

  test "Duffel test_mode? is explicit only" do
    alias OpalCore.Bookings.Duffel

    refute Duffel.test_mode?("duffel_live_abc", [])
    assert Duffel.test_mode?("duffel_test_abc", [])
    assert Duffel.test_mode?("duffel_live_abc", test_mode: true)

    prior = System.get_env("DUFFEL_TEST_MODE")
    System.put_env("DUFFEL_TEST_MODE", "true")
    assert Duffel.test_mode?("duffel_live_abc", [])
    restore("DUFFEL_TEST_MODE", prior)
  end

  test "privacy: solo flight search tagged with group conversation_id does not leak into group thread" do
    FixturesHelper.seed!()
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    group = Fixtures.conv_group_friends_id()

    assert {:ok, %{kind: :search_results, booking: booking, results: [offer | _]}} =
             Service.search(
               alex,
               %{
                 "booking_type" => "flight",
                 "destination" => "SFO",
                 "conversation_id" => group,
                 "allow_test_mock" => true
               },
               allow_test_mock: true
             )

    offer_id = offer["offer_id"]
    assert is_binary(offer_id)
    booking_id = booking["id"]

    # Search persists account-scoped only — never posts offers into the group thread.
    assert {:ok, msgs} = Messages.list_messages(group, jordan)
    encoded = Jason.encode!(msgs)
    refute encoded =~ offer_id
    refute encoded =~ booking_id
    refute encoded =~ ~r/mock-offer/i
    refute Enum.any?(msgs, fn m ->
             body = m["body"] || ""
             String.contains?(body, "SFO") and String.contains?(String.downcase(body), "flight")
           end)

    # Peer cannot fetch the booking by id (account ownership gate).
    assert {:error, :not_found} = Service.get(jordan, booking_id)
    assert {:ok, _} = Service.get(alex, booking_id)

    # Confirm still stays account-scoped — peer thread + ledger never see confirmation.
    assert {:ok, %{kind: :confirmed, confirmation_number: conf}} =
             Service.confirm(
               alex,
               %{
                 "id" => booking_id,
                 "offer_id" => offer_id,
                 "allow_test_mock" => true
               },
               allow_test_mock: true
             )

    assert is_binary(conf)

    assert {:ok, msgs_after} = Messages.list_messages(group, jordan)
    after_json = Jason.encode!(msgs_after)
    refute after_json =~ conf
    refute after_json =~ booking_id
    refute after_json =~ offer_id

    jordan_commits =
      from(c in Commitment, where: c.account_id == ^jordan)
      |> Repo.all()

    refute Enum.any?(jordan_commits, fn c -> (c.description || "") =~ conf end)

    alex_commits =
      from(c in Commitment, where: c.account_id == ^alex)
      |> Repo.all()

    assert Enum.any?(alex_commits, fn c -> (c.description || "") =~ conf end)
  end
end
