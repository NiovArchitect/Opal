defmodule OpalCoreWeb.SettingsConnectionsTest do
  @moduledoc """
  Repair #18 DIR-2 — Settings > Connections status contract cases
  FR-18-08..FR-18-15 (connections-verification-report.md Part 4.7).

  Every case drives the REAL projection (OpalCore.Settings.Connections)
  and, for FR-18-09 / the endpoint case, the real HTTP surface
  (GET /api/v1/product/settings/connections). Verification states are
  entered through VerificationLedger.record/1 — the same writer the
  probe runner and function-evidence hooks use — never by painting a
  status. Founder-gated live halves (F-1 post-step text arrival,
  F-3 real consent + revoke tap) stay phone-confirmed (class A+P in
  the catalog); their mechanics are proven here in test env.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.Settings.{Connections, VerificationLedger}
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  # ------------------------------------------------------------------
  # helpers
  # ------------------------------------------------------------------

  defp make_user do
    uid = System.unique_integer([:positive])

    {:ok, user} =
      %User{}
      |> User.changeset(%{display_name: "Conn #{uid}", handle: "conn-#{uid}"})
      |> Repo.insert()

    user
  end

  defp with_env(vars, fun) do
    previous = Map.new(vars, fn {k, _} -> {k, System.get_env(k)} end)
    Enum.each(vars, fn {k, v} -> if v, do: System.put_env(k, v), else: System.delete_env(k) end)

    try do
      fun.()
    after
      Enum.each(previous, fn
        {k, nil} -> System.delete_env(k)
        {k, v} -> System.put_env(k, v)
      end)
    end
  end

  defp with_app_env(key, value, fun) do
    previous = Application.get_env(:opal_core, key)
    Application.put_env(:opal_core, key, value)

    try do
      fun.()
    after
      if is_nil(previous) do
        Application.delete_env(:opal_core, key)
      else
        Application.put_env(:opal_core, key, previous)
      end
    end
  end

  defp row(payload, id), do: Enum.find(payload["connections"], &(&1["id"] == id))

  defp record(id, kind, outcome, at \\ DateTime.utc_now()) do
    assert {:ok, _} =
             VerificationLedger.record(%{
               connection_id: id,
               kind: kind,
               outcome: outcome,
               recorded_at: at
             })
  end

  defp record_working(id, at \\ DateTime.utc_now()) do
    record(id, "probe", "pass", at)
    record(id, "function_evidence", "pass", at)
  end

  defp days_ago(n), do: DateTime.add(DateTime.utc_now(), -n * 86_400, :second)

  # ------------------------------------------------------------------
  # Endpoint shape + absent integrations (Part 4.1 / 4.2)
  # ------------------------------------------------------------------

  defp activate(conn, phone, name, handle) do
    alias OpalCore.SocialFlow.PhoneVerification.Provider

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "conn-ch-#{handle}-#{System.unique_integer([:positive])}"
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
    {body["session"]["access_token"], body["user"]["id"]}
  end

  test "endpoint returns the contract shape and omits absent integrations", %{conn: conn} do
    OpalCore.FixturesHelper.seed!()

    with_app_env(:phone_verify_mode, :synthetic_development, fn ->
      uniq = System.unique_integer([:positive]) |> rem(9000) |> Kernel.+(1000)
      {token, _user_id} = activate(conn, "+1202555#{uniq}", "Conn EP", "conn_ep_#{uniq}")

      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> get("/api/v1/product/settings/connections")

      payload = json_response(conn, 200)
      assert is_list(payload["connections"])
      assert payload["generated_at"]
      assert payload["environment"] == "test"
      ids = Enum.map(payload["connections"], & &1["id"])
      refute "twilio_voice" in ids
      refute "deepgram_live" in ids
      assert "google_calendar" in ids

      for c <- payload["connections"] do
        for field <- ~w(id display_name category powers status status_label
                        status_detail credential_status provider_status
                        function_status provenance mode verification_basis
                        last_verified_at gate actions) do
          assert Map.has_key?(c, field), "missing #{field} on #{c["id"]}"
        end

        refute Map.has_key?(c, "api_key")
        refute Map.has_key?(c, "secret")
        refute Map.has_key?(c, "token")
      end

      # Per-stack truth at the HTTP surface: synthetic Verify is simulated.
      verify = row(payload, "twilio_verify")
      assert verify["status"] == "simulated"
    end)
  end

  test "projection-level contract: keys, categories, per-user google rows" do
    user = make_user()
    payload = Connections.build(user.id)
    ids = Enum.map(payload["connections"], & &1["id"])
    refute "twilio_voice" in ids
    refute "deepgram_live" in ids
    assert "google_calendar" in ids
    assert "gmail" in ids

    for c <- payload["connections"] do
      assert c["status"] in ~w(working working_test gated not_connected
                               unverified simulated unknown)
      assert is_binary(c["status_label"]) and c["status_label"] != ""
    end
  end

  # ------------------------------------------------------------------
  # FR-18-08 — a present-but-unchecked/broken key never paints Working
  # ------------------------------------------------------------------

  test "FR-18-08: config presence alone caps at unverified; removal after history renders gated" do
    user = make_user()

    with_env(%{"BRAVE_API_KEY" => "test-brave-key"}, fn ->
      payload = Connections.build(user.id)
      brave = row(payload, "brave")
      assert brave["status"] == "unverified"
      assert brave["status_label"] == "Not verified yet"

      record_working("brave")
      payload = Connections.build(user.id)
      assert row(payload, "brave")["status"] == "working"

      with_env(%{"BRAVE_API_KEY" => nil}, fn ->
        payload = Connections.build(user.id)
        brave = row(payload, "brave")
        assert brave["status"] == "gated"
        assert brave["gate"]["code"] == "credential_removed"
        refute brave["status"] == "working"
      end)
    end)
  end

  # ------------------------------------------------------------------
  # FR-18-09 — a simulated Google connection NEVER renders Connected
  # ------------------------------------------------------------------

  test "FR-18-09: simulated Google grant forces simulated on both Google rows" do
    user = make_user()

    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user.id, "google_calendar", %{
               access_token: "test-access-token",
               refresh_token: "test-refresh-token",
               scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
               metadata: %{"simulated" => true}
             })

    assert ProviderConnections.public_status(user.id, "google_calendar")["status"] ==
             "connected_simulated"

    payload = Connections.build(user.id)

    for id <- ["google_calendar", "gmail"] do
      r = row(payload, id)
      assert r["status"] == "simulated", "#{id} was #{r["status"]}"
      assert r["status_label"] == "Simulated - not a real connection"
      refute r["status_label"] == "Connected"
      assert r["provenance"] == "simulated"
    end
  end

  # ------------------------------------------------------------------
  # FR-18-10 — Places truth split: Google Places gated, Geoapify apart
  # ------------------------------------------------------------------

  test "FR-18-10: google_places gated with the enable+billing step while geoapify can be working" do
    user = make_user()

    with_env(
      %{"GOOGLE_PLACES_API_KEY" => "test-places-key", "GEOAPIFY_API_KEY" => "test-geo-key"},
      fn ->
        record_working("geoapify")
        payload = Connections.build(user.id)

        places = row(payload, "google_places")
        assert places["status"] == "gated"
        assert places["gate"]["code"] == "places_api_not_enabled"
        assert places["gate"]["founder_step"] =~ "billing"

        geo = row(payload, "geoapify")
        assert geo["status"] == "working"
      end
    )
  end

  # ------------------------------------------------------------------
  # FR-18-11 — Twilio split: Verify working, Messaging gated, apart
  # ------------------------------------------------------------------

  test "FR-18-11: twilio_verify and twilio_messaging are separate rows with separate truths" do
    user = make_user()

    vars = %{
      "OPAL_TWILIO_ACCOUNT_SID" => "ACtest",
      "OPAL_TWILIO_AUTH_TOKEN" => "test-token",
      "OPAL_TWILIO_VERIFY_SERVICE_SID" => "VAtest",
      "OPAL_TWILIO_FROM_NUMBER" => nil,
      "OPAL_TWILIO_MESSAGING_SERVICE_SID" => nil
    }

    with_env(vars, fn ->
      with_app_env(:phone_verify_mode, :production_sms, fn ->
        record_working("twilio_verify")
        payload = Connections.build(user.id)

        verify = row(payload, "twilio_verify")
        assert verify["status"] == "working"

        messaging = row(payload, "twilio_messaging")
        assert messaging["status"] == "gated"
        assert messaging["gate"]["code"] == "twilio_sender_missing"
      end)
    end)
  end

  test "per-stack truth: synthetic Verify renders simulated on a synthetic stack" do
    user = make_user()

    with_app_env(:phone_verify_mode, :synthetic_development, fn ->
      payload = Connections.build(user.id)
      verify = row(payload, "twilio_verify")
      assert verify["status"] == "simulated"
      assert verify["provenance"] == "synthetic_provider"
    end)
  end

  # ------------------------------------------------------------------
  # FR-18-12 — a test-mode booking rail never renders as real
  # ------------------------------------------------------------------

  test "FR-18-12: Duffel test token renders working_test with a test label, never plain Working" do
    user = make_user()

    with_env(%{"DUFFEL_API_KEY" => "duffel_test_abc", "DUFFEL_TEST_MODE" => nil}, fn ->
      record_working("duffel")
      payload = Connections.build(user.id)
      duffel = row(payload, "duffel")
      assert duffel["status"] == "working_test"
      assert duffel["mode"] == "test"
      assert duffel["status_label"] == "Working - test mode"
      refute duffel["status_label"] == "Working"
    end)
  end

  # ------------------------------------------------------------------
  # FR-18-13 — Deepgram rows never merge; basis is function evidence
  # ------------------------------------------------------------------

  test "FR-18-13: deepgram_batch stands alone on function evidence; no live row exists" do
    user = make_user()

    with_env(%{"DEEPGRAM_API_KEY" => "test-deepgram-key"}, fn ->
      # A probe alone must NOT produce working for a function-evidence row.
      record("deepgram_batch", "probe", "pass")
      payload = Connections.build(user.id)
      assert row(payload, "deepgram_batch")["status"] == "unverified"

      record("deepgram_batch", "function_evidence", "pass")
      payload = Connections.build(user.id)
      batch = row(payload, "deepgram_batch")
      assert batch["status"] == "working"
      assert batch["verification_basis"] == "function_evidence"

      ids = Enum.map(payload["connections"], & &1["id"])
      refute "deepgram_live" in ids
      refute Enum.any?(ids, &String.contains?(&1, "live"))
    end)
  end

  # ------------------------------------------------------------------
  # FR-18-14 — green is never sticky: stale or failed checks degrade
  # ------------------------------------------------------------------

  test "FR-18-14: stale probe degrades to unverified; a fresh failure revokes working at next read" do
    user = make_user()

    with_env(%{"OPAL_LLM_API_KEY" => "test-llm-key"}, fn ->
      record("deepseek", "probe", "pass", days_ago(8))
      record("deepseek", "function_evidence", "pass", days_ago(1))
      payload = Connections.build(user.id)
      deepseek = row(payload, "deepseek")
      assert deepseek["status"] == "unverified"
      assert deepseek["status_detail"] =~ "Last checked"

      record("deepseek", "probe", "pass", days_ago(0) |> DateTime.add(-3600, :second))
      record("deepseek", "function_evidence", "pass", days_ago(0) |> DateTime.add(-3600, :second))
      payload = Connections.build(user.id)
      assert row(payload, "deepseek")["status"] == "working"

      record("deepseek", "probe", "fail", DateTime.utc_now())
      payload = Connections.build(user.id)
      deepseek = row(payload, "deepseek")
      assert deepseek["status"] == "unverified"
      assert deepseek["status_detail"] =~ "last check did not pass"
    end)
  end

  # ------------------------------------------------------------------
  # FR-18-15 — Google disconnect takes, on every row, in the same read
  # ------------------------------------------------------------------

  test "FR-18-15: revoke flips calendar and gmail to not_connected together" do
    user = make_user()

    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user.id, "google_calendar", %{
               access_token: "test-access-token",
               refresh_token: "test-refresh-token",
               scopes: [
                 "https://www.googleapis.com/auth/calendar.readonly",
                 "https://www.googleapis.com/auth/gmail.readonly"
               ],
               metadata: %{}
             })

    payload = Connections.build(user.id)

    for id <- ["google_calendar", "gmail"] do
      r = row(payload, id)
      assert r["status"] == "working", "#{id} was #{r["status"]}"
      assert r["provenance"] == "real"
    end

    assert {:ok, _} = ProviderConnections.revoke(user.id, "google_calendar")

    payload = Connections.build(user.id)

    for id <- ["google_calendar", "gmail"] do
      r = row(payload, id)

      assert r["status"] in ["not_connected", "gated"],
             "#{id} still #{r["status"]} after revoke"

      refute r["status"] in ["working", "simulated"]
    end
  end

  # ------------------------------------------------------------------
  # Stripe context row — gated OFF by founder law, never enabled here
  # ------------------------------------------------------------------

  test "stripe_wallet_loads is gated while loads are off, and absent without a key" do
    user = make_user()

    payload = Connections.build(user.id)

    assert row(payload, "stripe_wallet_loads") == nil or
             System.get_env("STRIPE_SECRET_KEY") not in [nil, ""]

    with_env(
      %{"STRIPE_SECRET_KEY" => "sk_test_fake", "OPAL_WALLET_LOADS_ENABLED" => "false"},
      fn ->
        payload = Connections.build(user.id)
        stripe = row(payload, "stripe_wallet_loads")
        assert stripe["status"] == "gated"
        assert stripe["gate"]["code"] == "wallet_loads_gated"
      end
    )
  end
end
