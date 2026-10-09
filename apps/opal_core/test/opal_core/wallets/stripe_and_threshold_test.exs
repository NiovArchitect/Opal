defmodule OpalCore.Wallets.StripeAndThresholdTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Wallets
  alias OpalCore.Wallets.StripeCheckout

  setup do
    prior_key = System.get_env("STRIPE_SECRET_KEY")
    prior_loads = System.get_env("OPAL_WALLET_LOADS_ENABLED")
    System.delete_env("STRIPE_SECRET_KEY")
    System.delete_env("OPAL_WALLET_LOADS_ENABLED")

    on_exit(fn ->
      if prior_key,
        do: System.put_env("STRIPE_SECRET_KEY", prior_key),
        else: System.delete_env("STRIPE_SECRET_KEY")

      if prior_loads,
        do: System.put_env("OPAL_WALLET_LOADS_ENABLED", prior_loads),
        else: System.delete_env("OPAL_WALLET_LOADS_ENABLED")
    end)

    account_id = Ecto.UUID.generate()
    {:ok, wallet} = Wallets.get_or_create_wallet(account_id)
    %{account_id: account_id, wallet: wallet}
  end

  test "checkout without Stripe → disabled", %{account_id: account_id} do
    assert {:disabled, "wallet loading not connected"} =
             StripeCheckout.create_session(account_id, 2500)
  end

  test "checkout with key but loads gated → disabled", %{account_id: account_id} do
    System.put_env("STRIPE_SECRET_KEY", "sk_test_fake_for_unit")
    System.put_env("OPAL_WALLET_LOADS_ENABLED", "false")

    assert {:disabled, "wallet loads gated pending legal approval"} =
             StripeCheckout.create_session(account_id, 2500)

    assert StripeCheckout.key_present?() == true
    assert StripeCheckout.configured?() == false
  end

  test "webhook credits via load idempotent on payment_intent", %{
    account_id: account_id,
    wallet: wallet
  } do
    # Webhook → Wallets.load requires both Stripe key and explicit loads enable.
    System.put_env("STRIPE_SECRET_KEY", "sk_test_fake_for_unit")
    System.put_env("OPAL_WALLET_LOADS_ENABLED", "true")

    event = %{
      "type" => "checkout.session.completed",
      "data" => %{
        "object" => %{
          "amount_total" => 2500,
          "payment_intent" => "pi_test_webhook_1",
          "client_reference_id" => account_id,
          "metadata" => %{"account_id" => account_id, "purpose" => "wallet_load"}
        }
      }
    }

    assert {:ok, tx} = StripeCheckout.handle_webhook_event(event)
    assert tx.amount_cents == 2500

    # Idempotent second delivery
    assert {:ok, tx2} = StripeCheckout.handle_webhook_event(event)
    assert tx2.id == tx.id

    {:ok, refreshed} = Wallets.get_or_create_wallet(account_id)
    assert refreshed.balance_cents == wallet.balance_cents + 2500
  end

  test "update_threshold is runtime tunable", %{account_id: account_id, wallet: wallet} do
    assert {:ok, _} = Wallets.load(wallet, 20_000, "pi_thresh", "idem-thresh-load", allow_test_load: true)
    {:ok, wallet} = Wallets.get_or_create_wallet(account_id)
    assert {:ok, updated} = Wallets.update_threshold(wallet, 7500)
    assert updated.auto_approve_threshold_cents == 7500

    assert {:ok, :needs_explicit} = Wallets.spend_gate(updated, 8000)
    assert {:ok, :auto} = Wallets.spend_gate(updated, 7000)
  end

  test "double-spend still passes" do
    # Re-assert the standing law after Phase 7 changes.
    account_id = Ecto.UUID.generate()
    {:ok, wallet} = Wallets.get_or_create_wallet(account_id)
    assert {:ok, _} = Wallets.load(wallet, 10_000, "pi_ds", "idem-ds-load", allow_test_load: true)
    funded = OpalCore.Repo.get!(OpalCore.Wallets.Wallet, wallet.id)

    assert {:ok, tx1} =
             Wallets.spend(funded, 2000, %{"type" => "booking", "id" => "b1"}, "idem-ds-spend",
               explicit_confirm: true
             )

    assert {:ok, tx2} =
             Wallets.spend(
               OpalCore.Repo.get!(OpalCore.Wallets.Wallet, wallet.id),
               2000,
               %{"type" => "booking", "id" => "b1"},
               "idem-ds-spend",
               explicit_confirm: true
             )

    assert tx1.id == tx2.id
  end
end
