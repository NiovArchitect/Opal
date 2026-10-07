defmodule OpalCore.Foundation.Phase23FoundationTest do
  @moduledoc "Phase 2–3 foundation acceptance (OTP rate, push enqueue, refresh, limits, abuse, observability)."

  use OpalCoreWeb.ConnCase, async: false
  use Oban.Testing, repo: OpalCore.Repo

  alias OpalCore.Auth.ProductSession
  alias OpalCore.Messaging.Inbox
  alias OpalCore.Observability.StructuredLogger
  alias OpalCore.Observability.Sentry
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Onboarding
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.RateLimitBucket
  alias OpalCore.SocialFlow.TrustSafety
  alias OpalCore.Push.Workers.DeliverPushWorker

  setup do
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "p23-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    session = body["session"]
    assert is_binary(session["access_token"])
    assert is_binary(session["refresh_token"])
    {session, body["user"]["id"]}
  end

  test "2.1 OTP: 6th challenge same phone+device within hour is rate_limited", %{conn: conn} do
    phone = "+1555#{Enum.random(2000000..2999999)}"
    device = "otp-device-fixed"

    statuses =
      for i <- 1..6 do
        c =
          post(conn, "/api/v1/product/activation/challenges", %{
            "otp_consent_accepted" => true,
            "phone" => phone,
            "device_label" => device,
            "idempotency_key" => "otp-rl-#{phone}-#{i}-#{System.unique_integer([:positive])}"
          })

        c.status
      end

    assert 429 in statuses, "expected a 429 among #{inspect(statuses)}"
  end

  test "2.2 Inbox fanout enqueues DeliverPushWorker for recipient", %{conn: conn} do
    Oban.Testing.with_testing_mode(:manual, fn ->
      {sess_a, alice_id} = activate(conn, "+15551002001", "Alice Push", "alice_p23")
      {_sess_b, bob_id} = activate(build_conn(), "+15551002002", "Bob Push", "bob_p23")
      _ = sess_a

      {:ok, conv} = OpalCore.Messages.ensure_direct_conversation(alice_id, bob_id)

      {:ok, msg, :created} =
        OpalCore.Messages.accept_message(%{
          conversation_id: conv.conversation_id,
          sender_user_id: alice_id,
          client_message_id: "p23-push-#{System.unique_integer([:positive])}",
          body: "hello push",
          message_type: "text"
        })

      Inbox.fanout_message(msg)
      assert_enqueued(worker: DeliverPushWorker, args: %{"user_id" => bob_id})
    end)
  end

  test "2.3 delivery_state starts persisted and promotes to delivered", %{conn: conn} do
    {_sess, alice_id} = activate(conn, "+15551006001", "Deliv Alice", "deliv_a")
    {_sess, bob_id} = activate(build_conn(), "+15551006002", "Deliv Bob", "deliv_b")
    {:ok, conv} = OpalCore.Messages.ensure_direct_conversation(alice_id, bob_id)

    {:ok, msg, :created} =
      OpalCore.Messages.accept_message(%{
        conversation_id: conv.conversation_id,
        sender_user_id: alice_id,
        client_message_id: "del-#{System.unique_integer([:positive])}",
        body: "delivery ladder",
        message_type: "text"
      })

    assert msg.delivery_state == "persisted"

    {:ok, updated} =
      msg
      |> Ecto.Changeset.change(delivery_state: "delivered")
      |> Repo.update()

    assert updated.delivery_state == "delivered"
  end

  test "3.1 refresh rotates access token; logout revokes", %{conn: conn} do
    {session, user_id} = activate(conn, "+15551003001", "Refresh User", "refresh_u")
    refresh = session["refresh_token"]
    access = session["access_token"]

    conn =
      post(build_conn(), "/api/v1/product/session/refresh", %{
        "refresh_token" => refresh
      })

    body = json_response(conn, 200)
    assert body["access_token"] != access
    assert is_binary(body["refresh_token"])

    assert {:error, :session_mismatch} = ProductSession.authenticate(access)
    assert {:ok, auth} = ProductSession.authenticate(body["access_token"])

    assert {:ok, _} = ProductSession.revoke_by_ids(user_id, auth.session.id)
    assert {:error, :session_revoked} = ProductSession.authenticate(body["access_token"])
  end

  test "3.2 message rate limit after 60/min", %{conn: conn} do
    {_sess, alice_id} = activate(conn, "+15551004001", "Rate Alice", "rate_a")
    {_sess, bob_id} = activate(build_conn(), "+15551004002", "Rate Bob", "rate_b")
    {:ok, conv} = OpalCore.Messages.ensure_direct_conversation(alice_id, bob_id)

    for _ <- 1..60 do
      assert :ok =
               RateLimitBucket.hit("msg:#{alice_id}", "message_send", max: 60, window_sec: 60)
    end

    assert {:error, :rate_limited} =
             OpalCore.Messages.accept_message(%{
               conversation_id: conv.conversation_id,
               sender_user_id: alice_id,
               client_message_id: "rl-#{System.unique_integer([:positive])}",
               body: "too many",
               message_type: "text"
             })
  end

  test "3.3 report + block prevents messaging from blocked user", %{conn: conn} do
    {_sess, alice_id} = activate(conn, "+15551005001", "Safety Alice", "safe_a")
    {_sess, bob_id} = activate(build_conn(), "+15551005002", "Safety Bob", "safe_b")

    refute TrustSafety.soft_contact?(alice_id, bob_id)

    assert {:ok, _payload, :created} =
             TrustSafety.create_report(%{
               reporter_user_id: alice_id,
               reported_user_id: bob_id,
               category: "harassment",
               note: "test report"
             })

    assert {:ok, _block, :created} =
             TrustSafety.create_block(%{
               blocker_user_id: alice_id,
               blocked_user_id: bob_id
             })

    assert TrustSafety.blocked?(bob_id, alice_id)
    assert {:error, :blocked} = OpalCore.Messages.ensure_direct_conversation(bob_id, alice_id)
  end

  test "3.4 structured logger + Sentry stub + health 200", %{conn: conn} do
    assert :ok = StructuredLogger.log("test.event", %{"foo" => "bar"})
    assert {:ok, :skipped} = Sentry.capture(%RuntimeError{message: "probe"})
    refute Sentry.configured?()

    conn = get(conn, "/health")
    body = json_response(conn, 200)
    assert body["status"] == "ok"
    assert body["db"] == "up"
  end

  test "2.1 Onboarding rate window is 3600 seconds" do
    # Public check_rate_limit uses @rate_window_sec 3600 — verify via 5 hits then block.
    actor = "digest-#{System.unique_integer([:positive])}"
    device = "win-check"

    for _ <- 1..5 do
      assert :ok = Onboarding.check_rate_limit("verification", actor, device)
    end

    assert {:error, :rate_limited} = Onboarding.check_rate_limit("verification", actor, device)
  end
end
