defmodule OpalCoreWeb.StripeWebhookHonestyTest do
  @moduledoc """
  Repair #18 Phase 2 — BS-16: the Stripe webhook accepted UNSIGNED JSON
  whenever Mix.env() was :test or :dev (staging is a dev-mode build), so
  only the wallet-loads gate flag stood between an unsigned
  `checkout.session.completed` payload and a wallet credit.

  Failing-first: the unsigned test below returned 200 {"received":true}
  on the old code in the test env. The request uses a non-JSON content
  type on purpose: Plug.Parsers passes those bodies through unread,
  which is exactly the shape under which the old controller's
  read_body fallback received (and, in :test/:dev, accepted) the raw
  unsigned payload. Loads stay LAW-GATED OFF — this suite never
  enables them; it proves the unsigned path is unreachable and that a
  properly signed, fresh webhook is the only accepted shape.
  """
  use OpalCoreWeb.ConnCase, async: false

  @secret "whsec_test_secret_for_bs16"

  setup do
    saved = System.get_env("STRIPE_WEBHOOK_SECRET")
    System.delete_env("STRIPE_WEBHOOK_SECRET")
    saved_loads = System.get_env("OPAL_WALLET_LOADS_ENABLED")
    System.delete_env("OPAL_WALLET_LOADS_ENABLED")

    on_exit(fn ->
      restore("STRIPE_WEBHOOK_SECRET", saved)
      restore("OPAL_WALLET_LOADS_ENABLED", saved_loads)
    end)

    :ok
  end

  defp restore(key, nil), do: System.delete_env(key)
  defp restore(key, val), do: System.put_env(key, val)

  defp sign(raw, secret, timestamp) do
    v1 =
      :crypto.mac(:hmac, :sha256, secret, "#{timestamp}.#{raw}")
      |> Base.encode16(case: :lower)

    "t=#{timestamp},v1=#{v1}"
  end

  defp post_raw(conn, raw, signature \\ nil) do
    conn =
      conn
      |> put_req_header("content-type", "text/plain")

    conn =
      if signature,
        do: put_req_header(conn, "stripe-signature", signature),
        else: conn

    post(conn, "/webhooks/stripe", raw)
  end

  @ignored_event ~s({"type":"bs16.ping","data":{"object":{}}})

  test "unsigned JSON is rejected even in the test env (the old dev/test hole)", %{
    conn: conn
  } do
    conn = post_raw(conn, @ignored_event)
    assert conn.status == 400
    assert Jason.decode!(conn.resp_body)["error"] == "webhook_secret_missing"
  end

  test "unsigned checkout.session.completed can never reach the credit path", %{conn: conn} do
    raw =
      Jason.encode!(%{
        "type" => "checkout.session.completed",
        "data" => %{
          "object" => %{
            "metadata" => %{"purpose" => "wallet_load", "account_id" => "nobody"},
            "client_reference_id" => "nobody",
            "amount_total" => 5000,
            "payment_intent" => "pi_bs16_unsigned"
          }
        }
      })

    conn = post_raw(conn, raw)
    assert conn.status == 400
  end

  test "with a secret set, a missing signature is invalid_signature", %{conn: conn} do
    System.put_env("STRIPE_WEBHOOK_SECRET", @secret)
    conn = post_raw(conn, @ignored_event)
    assert conn.status == 400
    assert Jason.decode!(conn.resp_body)["error"] == "invalid_signature"
  end

  test "with a secret set, a wrong signature is invalid_signature", %{conn: conn} do
    System.put_env("STRIPE_WEBHOOK_SECRET", @secret)
    now = System.system_time(:second)
    conn = post_raw(conn, @ignored_event, sign(@ignored_event, "whsec_wrong", now))
    assert conn.status == 400
    assert Jason.decode!(conn.resp_body)["error"] == "invalid_signature"
  end

  test "a captured signature replayed outside the tolerance window is rejected", %{
    conn: conn
  } do
    System.put_env("STRIPE_WEBHOOK_SECRET", @secret)
    # One hour old — far outside Stripe's 5-minute tolerance.
    stale = System.system_time(:second) - 3600
    conn = post_raw(conn, @ignored_event, sign(@ignored_event, @secret, stale))
    assert conn.status == 400
    assert Jason.decode!(conn.resp_body)["error"] == "invalid_signature"
  end

  test "a correctly signed, fresh webhook is accepted (non-crediting event)", %{conn: conn} do
    System.put_env("STRIPE_WEBHOOK_SECRET", @secret)
    now = System.system_time(:second)
    conn = post_raw(conn, @ignored_event, sign(@ignored_event, @secret, now))
    assert conn.status == 200
    assert Jason.decode!(conn.resp_body)["received"] == true
  end

  test "a signed JSON webhook verifies over the real parsed-path body", %{conn: conn} do
    # application/json goes through Plug.Parsers; the CacheBodyReader
    # must hand the controller the exact raw bytes or the HMAC over
    # "<t>.<payload>" can never match (pre-fix it read "").
    System.put_env("STRIPE_WEBHOOK_SECRET", @secret)
    now = System.system_time(:second)

    conn =
      conn
      |> put_req_header("content-type", "application/json")
      |> put_req_header("stripe-signature", sign(@ignored_event, @secret, now))
      |> post("/webhooks/stripe", @ignored_event)

    assert conn.status == 200
    assert Jason.decode!(conn.resp_body)["received"] == true
  end

  test "an unsigned JSON webhook is rejected on the parsed path too", %{conn: conn} do
    System.put_env("STRIPE_WEBHOOK_SECRET", @secret)

    conn =
      conn
      |> put_req_header("content-type", "application/json")
      |> post("/webhooks/stripe", @ignored_event)

    assert conn.status == 400
    assert Jason.decode!(conn.resp_body)["error"] == "invalid_signature"
  end
end
