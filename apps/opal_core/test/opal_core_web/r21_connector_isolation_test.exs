defmodule OpalCoreWeb.R21ConnectorIsolationTest do
  @moduledoc """
  Repair #21 - Cluster L-LAWS, law L-2: CONNECTORS ARE PER-ACCOUNT
  (founder law, 2026-10-20 13:23 PDT).

  The CATALOG is universal; the STATE is personal. Each account has
  its own connections, tokens, and View/Connect truth - user A's
  connected rows must never appear for user B, including custom
  connectors (Saved logins).

  Proof species: the W-GAP-32 two-account isolation proofs, driven
  at the payload boundary - OpalCore.Settings.Connections.build/1
  (the one settings/connections projection the Connectors room
  renders verbatim), ProviderConnections.public_status/2 and
  list_for_user/1 (the connector endpoints' read-backs), and
  SavedLogins (the Custom category's store) - plus one HTTP leg
  through GET /api/v1/product/settings/connections and
  GET /api/v1/product/settings/saved-logins with two real sessions.

  Account A carries a live Google connection (both scopes) and a
  saved login. Account B starts with none, then gains its own -
  the checks are symmetric, including revoke and cross-remove.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.Settings.{Connections, SavedLogin, SavedLogins}
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  @scopes [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly"
  ]

  defp make_user(name) do
    uid = System.unique_integer([:positive])

    {:ok, user} =
      %User{}
      |> User.changeset(%{display_name: name, handle: "r21-#{uid}"})
      |> Repo.insert()

    user
  end

  defp row(payload, id), do: Enum.find(payload["connections"], &(&1["id"] == id))

  defp connect_google(user_id, tag) do
    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
               access_token: "#{tag}-access-token",
               refresh_token: "#{tag}-refresh-token",
               scopes: @scopes,
               metadata: %{}
             })
  end

  defp google_statuses(payload) do
    Map.new(["google_calendar", "gmail"], fn id -> {id, row(payload, id)["status"]} end)
  end

  test "L-2: A's live connection and saved login never appear in B's connector payload or lists" do
    a = make_user("R21 A")
    b = make_user("R21 B")

    connect_google(a.id, "a-secret")
    assert {:ok, _login} = SavedLogins.add(a.id, "bank.example.com", "a-saved-secret")

    # --- A's own payload: connected truth, and no token material.
    payload_a = Connections.build(a.id)
    assert google_statuses(payload_a) == %{"google_calendar" => "working", "gmail" => "working"}

    for id <- ["google_calendar", "gmail"] do
      assert Enum.any?(row(payload_a, id)["actions"], &(&1["kind"] == "disconnect"))
    end

    encoded_a = Jason.encode!(payload_a)
    refute encoded_a =~ "a-secret-access-token"
    refute encoded_a =~ "a-secret-refresh-token"
    refute encoded_a =~ "a-saved-secret"

    # --- B's payload: the same universal catalog, none of A's state.
    payload_b = Connections.build(b.id)

    assert Enum.map(payload_b["connections"], & &1["id"]) ==
             Enum.map(payload_a["connections"], & &1["id"])

    for id <- ["google_calendar", "gmail"] do
      r = row(payload_b, id)
      assert r["status"] in ["not_connected", "gated"], "#{id} leaked as #{r["status"]} for B"
      refute Enum.any?(r["actions"], &(&1["kind"] == "disconnect"))
    end

    encoded_b = Jason.encode!(payload_b)
    refute encoded_b =~ "a-secret"
    refute encoded_b =~ "bank.example.com"

    # --- The connector endpoints' read-backs are scoped the same way.
    assert ProviderConnections.public_status(b.id, "google_calendar")["connected"] == false
    assert ProviderConnections.public_status(b.id, "google_calendar")["token_present"] == false
    assert ProviderConnections.list_for_user(b.id) == []

    assert [%{"connected" => true, "token_present" => true}] =
             ProviderConnections.list_for_user(a.id)

    # --- Saved logins (Custom): A's host list is A's alone.
    assert Enum.map(SavedLogins.list_for_user(a.id), & &1.host) == ["bank.example.com"]
    assert SavedLogins.list_for_user(b.id) == []
    assert {:error, :not_found} = SavedLogins.use_for_host(b.id, "bank.example.com")

    a_login = hd(SavedLogins.list_for_user(a.id))
    assert {:error, :not_found} = SavedLogins.remove(b.id, a_login.id)
    assert Enum.map(SavedLogins.list_for_user(a.id), & &1.host) == ["bank.example.com"]
    # The outward contract for A's own row carries host only.
    assert SavedLogin.to_contract(a_login)["host"] == "bank.example.com"
    refute Jason.encode!(SavedLogin.to_contract(a_login)) =~ "a-saved-secret"
  end

  test "L-2: symmetric - B's own state is B's, and revoking B leaves A connected" do
    a = make_user("R21 A2")
    b = make_user("R21 B2")

    connect_google(a.id, "a2-secret")
    assert {:ok, _} = SavedLogins.add(a.id, "bank.example.com", "a2-saved-secret")

    connect_google(b.id, "b2-secret")
    assert {:ok, _} = SavedLogins.add(b.id, "mail.example.org", "b2-saved-secret")

    payload_a = Connections.build(a.id)
    payload_b = Connections.build(b.id)
    assert google_statuses(payload_a) == %{"google_calendar" => "working", "gmail" => "working"}
    assert google_statuses(payload_b) == %{"google_calendar" => "working", "gmail" => "working"}
    refute Jason.encode!(payload_a) =~ "b2-secret"
    refute Jason.encode!(payload_b) =~ "a2-secret"
    refute Jason.encode!(payload_a) =~ "mail.example.org"
    refute Jason.encode!(payload_b) =~ "bank.example.com"

    assert Enum.map(SavedLogins.list_for_user(a.id), & &1.host) == ["bank.example.com"]
    assert Enum.map(SavedLogins.list_for_user(b.id), & &1.host) == ["mail.example.org"]
    assert {:ok, "a2-saved-secret"} = SavedLogins.use_for_host(a.id, "bank.example.com")
    assert {:ok, "b2-saved-secret"} = SavedLogins.use_for_host(b.id, "mail.example.org")
    assert {:error, :not_found} = SavedLogins.use_for_host(a.id, "mail.example.org")

    # Revoking B flips only B.
    assert {:ok, _} = ProviderConnections.revoke(b.id, "google_calendar")
    payload_b = Connections.build(b.id)
    payload_a = Connections.build(a.id)

    for id <- ["google_calendar", "gmail"] do
      assert row(payload_b, id)["status"] in ["not_connected", "gated"]
      assert row(payload_a, id)["status"] == "working"
    end
  end

  # ------------------------------------------------------------------
  # HTTP leg - two real sessions through the room's own endpoints
  # ------------------------------------------------------------------

  defp activate(conn, phone, name, handle) do
    alias OpalCore.SocialFlow.PhoneVerification.Provider

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "r21-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp authed_get(token, path) do
    build_conn()
    |> put_req_header("authorization", "Bearer #{token}")
    |> get(path)
    |> json_response(200)
  end

  test "L-2 HTTP: two sessions each read only their own connections and saved logins", %{
    conn: conn
  } do
    OpalCore.FixturesHelper.seed!()

    with_app_env_phone_synthetic(fn ->
      uniq = System.unique_integer([:positive]) |> rem(900) |> Kernel.+(100)
      {token_a, user_a} = activate(conn, "+12025551#{uniq}", "R21 Http A", "r21_http_a_#{uniq}")
      {token_b, _user_b} = activate(conn, "+12025552#{uniq}", "R21 Http B", "r21_http_b_#{uniq}")

      connect_google(user_a, "http-a-secret")
      assert {:ok, _} = SavedLogins.add(user_a, "bank.example.com", "http-a-saved-secret")

      payload_a = authed_get(token_a, "/api/v1/product/settings/connections")
      payload_b = authed_get(token_b, "/api/v1/product/settings/connections")

      assert row(payload_a, "google_calendar")["status"] == "working"
      assert row(payload_a, "gmail")["status"] == "working"
      assert row(payload_b, "google_calendar")["status"] in ["not_connected", "gated"]
      assert row(payload_b, "gmail")["status"] in ["not_connected", "gated"]
      refute Jason.encode!(payload_b) =~ "http-a-secret"

      logins_a = authed_get(token_a, "/api/v1/product/settings/saved-logins")
      logins_b = authed_get(token_b, "/api/v1/product/settings/saved-logins")
      assert Enum.map(logins_a["saved_logins"], & &1["host"]) == ["bank.example.com"]
      assert logins_b["saved_logins"] == []
      refute Jason.encode!(logins_a) =~ "http-a-saved-secret"
    end)
  end

  defp with_app_env_phone_synthetic(fun) do
    key = :phone_verify_mode
    previous = Application.get_env(:opal_core, key)
    Application.put_env(:opal_core, key, :synthetic_development)

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
end
