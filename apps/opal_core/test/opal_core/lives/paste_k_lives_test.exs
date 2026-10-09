defmodule OpalCore.Lives.PasteKLivesTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Lives
  alias OpalCore.Lives.{StickerCatalog, Stickers, Verification, Venue}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SafetyReport
  alias OpalCore.Wallets
  alias OpalCore.Wallets.{Wallet, WalletTransaction}

  setup do
    host = Ecto.UUID.generate()
    viewer = Ecto.UUID.generate()
    %{host: host, viewer: viewer}
  end

  defp fund!(account_id, cents) do
    {:ok, w} = Wallets.get_or_create_wallet(account_id)
    {:ok, w} = w |> Wallet.changeset(%{balance_cents: cents}) |> Repo.update()
    w
  end

  defp go_live_full!(host, place_id) do
    {:ok, result} =
      Lives.go_live(host, place_id,
        allow_fixture: true,
        name: "Rooftop Bar",
        address: "100 Skyline Ave",
        types: ["bar", "establishment"]
      )

    {:ok, venue} =
      result.venue
      |> Venue.changeset(%{status: "full", quarantine_until: nil})
      |> Repo.update()

    %{live_room: result.live_room, venue: venue}
  end

  test "0.1g / 1.2 / 2.2 — go-live requires place_id; free-text rejected", %{host: host} do
    assert {:error, :place_id_required} = Lives.go_live(host, "")
    assert {:error, :venue_not_found, msg} = Lives.go_live(host, %{name: "Some random bar"})
    assert msg =~ "couldn't find"

    copy = Lives.go_live_copy()
    assert copy["required"] == true
    assert copy["skip_allowed"] == false
    assert is_nil(copy["default"])
  end

  test "V.1 — residential place_id rejected", %{host: host} do
    assert {:error, :residential, msg} =
             Lives.go_live(host, "fixture_residential_home",
               allow_fixture: true,
               residential: true,
               types: ["street_address", "premise"]
             )

    assert msg == "lives happen at venues"
  end

  test "V.1 residential? helper" do
    assert Verification.residential?(["street_address", "premise"])
    refute Verification.residential?(["bar", "establishment"])
    assert Verification.residential?([])
  end

  test "V.2 — new venue starts in quarantine; stickers disabled", %{host: host, viewer: viewer} do
    {:ok, result} =
      Lives.go_live(host, "fixture_new_quarantine_#{System.unique_integer([:positive])}",
        allow_fixture: true,
        name: "New Spot",
        types: ["cafe", "establishment"]
      )

    assert result.venue.status == "quarantine"
    refute Venue.stickers_enabled?(result.venue)

    fund!(viewer, 10_000)

    assert {:error, :stickers_disabled_quarantine} =
             Lives.send_sticker(result.live_room.id, viewer, "fire", "idem-q-1")
  end

  test "V.3 — 3 presence reports flag live and freeze heat", %{host: host} do
    %{live_room: room} = go_live_full!(host, "fixture_presence_#{System.unique_integer([:positive])}")

    reporters = for _ <- 1..3, do: Ecto.UUID.generate()

    assert {:ok, %{flagged: false}} =
             Lives.report_host_not_here(room.id, Enum.at(reporters, 0))

    assert {:ok, %{flagged: false}} =
             Lives.report_host_not_here(room.id, Enum.at(reporters, 1))

    assert {:ok, %{flagged: true, live_room: flagged}} =
             Lives.report_host_not_here(room.id, Enum.at(reporters, 2))

    assert flagged.heat_contribution_frozen == true
    assert flagged.status == "flagged"
    assert flagged.presence_report_count == 3
  end

  test "V.4 — max 5 lives per venue per host per day", %{host: host} do
    place = "fixture_rate_#{System.unique_integer([:positive])}"

    for i <- 1..5 do
      assert {:ok, _} =
               Lives.go_live(host, place,
                 allow_fixture: true,
                 name: "Rate Bar",
                 types: ["bar", "establishment"],
                 title: "live-#{i}"
               )
    end

    assert {:error, :venue_live_rate_limited} =
             Lives.go_live(host, place,
               allow_fixture: true,
               name: "Rate Bar",
               types: ["bar", "establishment"]
             )
  end

  test "V.5 — venue report categories accepted on SafetyReport" do
    assert "fake_venue" in SafetyReport.categories()
    assert "not_a_real_place" in SafetyReport.categories()
    assert "host_isnt_here" in SafetyReport.categories()
  end

  test "S.1 — catalog has 6 stickers; 70/30 split", do: do_catalog()

  defp do_catalog do
    assert length(StickerCatalog.all()) == 6
    split = StickerCatalog.split(1000)
    assert split.host_share_cents == 700
    assert split.venue_share_cents == 300
    contract = StickerCatalog.to_contract()
    assert contract["honesty"] =~ "test credits"
    assert contract["split"]["opal_bps"] == 0
  end

  test "S.1/S.3/S.4 — sticker purchase debits viewer, credits host 70%, escrow 30%, idempotent",
       %{host: host, viewer: viewer} do
    %{live_room: room, venue: venue} =
      go_live_full!(host, "fixture_sticker_#{System.unique_integer([:positive])}")

    fund!(viewer, 10_000)
    fund!(host, 0)

    assert {:ok, sticker, :created} =
             Lives.send_sticker(room.id, viewer, "fire", "idem-sticker-1")

    assert sticker.amount_cents == 500
    assert sticker.host_share_cents == 350
    assert sticker.venue_share_cents == 150
    assert sticker.test_mode == true

    assert Repo.get_by!(Wallet, account_id: viewer).balance_cents == 9500
    assert Repo.get_by!(Wallet, account_id: host).balance_cents == 350
    assert Repo.get!(Venue, venue.id).escrow_balance_cents == 150

    assert {:ok, again, :idempotent} =
             Lives.send_sticker(room.id, viewer, "fire", "idem-sticker-1")

    assert again.id == sticker.id
    assert Repo.get_by!(Wallet, account_id: viewer).balance_cents == 9500

    display = Stickers.host_display(sticker, "Maya")
    assert display["body"] =~ "Maya sent"
    assert display["shows_venue_escrow"] == false
    assert display["honesty"] =~ "test credits"
  end

  test "S.3 — self-gifting forbidden", %{host: host} do
    %{live_room: room} = go_live_full!(host, "fixture_self_#{System.unique_integer([:positive])}")
    fund!(host, 10_000)

    assert {:error, :self_gifting_forbidden} =
             Lives.send_sticker(room.id, host, "heart", "idem-self-1")
  end

  test "Q.1/Q.2/Q.3 — venue QR pay debits customer, credits venue, test payment label",
       %{viewer: viewer, host: host} do
    %{venue: venue} = go_live_full!(host, "fixture_pay_#{System.unique_integer([:positive])}")
    fund!(viewer, 50_000)

    qr = Lives.venue_qr(venue.id) |> elem(1)
    assert qr["qr_data"] =~ "opal://pay/"
    assert qr["nfc"]["build"] == false

    assert {:ok, _payment, receipt, :created} =
             Lives.pay_venue(venue.pay_token, viewer, 2500, "idem-pay-1")

    assert receipt["test_mode"] == true
    assert receipt["test_payment_label"] == "test payment"
    assert Repo.get_by!(Wallet, account_id: viewer).balance_cents == 47_500
    assert Repo.get!(Venue, venue.id).balance_cents == 2500

    assert {:ok, _, receipt2, :idempotent} =
             Lives.pay_venue(venue.pay_token, viewer, 2500, "idem-pay-1")

    assert receipt2["id"] == receipt["id"]
  end

  test "Q.4 — payment over $200 rejected", %{viewer: viewer, host: host} do
    %{venue: venue} = go_live_full!(host, "fixture_cap_#{System.unique_integer([:positive])}")
    fund!(viewer, 100_000)

    assert {:error, :payment_too_large} =
             Lives.pay_venue(venue.pay_token, viewer, 20_001, "idem-big")
  end

  test "7.5–7.7 — contributors are facts; streaks private; venue reward credits wallet",
       %{host: host, viewer: viewer} do
    %{live_room: room, venue: venue} =
      go_live_full!(host, "fixture_max_#{System.unique_integer([:positive])}")

    fund!(viewer, 10_000)
    {:ok, _, _} = Lives.send_sticker(room.id, viewer, "star", "idem-max-sticker")

    {:ok, payload} = Lives.contributors(venue.id, viewer, circle?: false)
    assert payload["scoring"] == false
    assert payload["fact_not_rating"] == true
    assert is_list(payload["contributors"])

    # Seed venue balance for reward
    {:ok, _} =
      venue
      |> Venue.changeset(%{balance_cents: 5000})
      |> Repo.update()

    assert {:ok, reward, :created} =
             Lives.reward_contributor(venue.id, viewer, 500, "idem-reward-1")

    assert reward.test_mode == true
    assert Repo.get_by!(Wallet, account_id: viewer).balance_cents == 10_000 - 100 + 500
  end

  test "money flags default off" do
    refute Lives.sticker_live_money?()
    refute Lives.pay_live_money?()
  end

  test "wallet credit helper is idempotent", %{viewer: viewer} do
    fund!(viewer, 100)
    {:ok, w} = Wallets.get_or_create_wallet(viewer)

    assert {:ok, tx1} =
             Wallets.credit(w, 50, %{type: "test", id: "1"}, "idem-credit-x")

    assert {:ok, tx2} =
             Wallets.credit(Repo.get!(Wallet, w.id), 50, %{type: "test", id: "1"}, "idem-credit-x")

    assert tx1.id == tx2.id
    assert Repo.get!(Wallet, w.id).balance_cents == 150
    assert Repo.aggregate(WalletTransaction, :count, :id) >= 1
  end
end
