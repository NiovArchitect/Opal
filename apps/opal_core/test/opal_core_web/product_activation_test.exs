defmodule OpalCoreWeb.ProductActivationTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Auth.ProductSession
  alias OpalCoreWeb.UserSocket

  @endpoint OpalCoreWeb.Endpoint

  @alex "+12025550101"
  @jordan "+12025550102"
  @maya "+12025550103"

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    assert %{
             "challenge" => %{"id" => challenge_id},
             "development_code" => code,
             "provider" => "synthetic_development",
             "not_production_sms" => true
           } = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    assert body["session"]["access_token"]
    assert body["provider"] == "synthetic_development"
    assert body["csrf_token"]
    {body["session"]["access_token"], body["user"]["id"], body}
  end

  defp auth(conn, token) do
    put_req_header(conn, "authorization", "Bearer #{token}")
  end

  test "two users activate, invite, accept, message, signal, isolation, block, sign-out", %{
    conn: conn
  } do
    {token_a, user_a, _} = activate(conn, @alex, "Alex Reed", "alex_sf15")
    {token_b, user_b, _} = activate(conn, @jordan, "Jordan Lee", "jordan_sf15")
    {token_c, _user_c, _} = activate(conn, @maya, "Maya Chen", "maya_sf15")

    # Invite B from A
    conn =
      conn
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "message" => "Dinner this week?",
        "idempotency_key" => "inv-sf15-1"
      })

    inv = json_response(conn, 201)["invitation"]
    assert inv["id"]
    assert inv["status"] == "sent"

    # Incoming for B
    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/invitations/incoming")

    assert [%{"id" => inv_id}] = json_response(conn, 200)["invitations"]
    assert inv_id == inv["id"]

    # Accept
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/invitations/#{inv_id}/accept", %{})

    accept = json_response(conn, 200)
    conversation_id = accept["establishment"]["conversation_id"]
    assert is_binary(conversation_id)

    # A sends plan-forming message
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => "We should get dinner Thursday.",
        "client_message_id" => "cm-a-1"
      })

    msg_a = json_response(conn, 201)
    assert msg_a["message"]["body"] =~ "dinner"
    assert Enum.any?(msg_a["signals"], &(&1["label"] == "Becoming a plan"))
    assert Enum.any?(msg_a["signals"], &(&1["status"] == "possibility"))

    # B replies
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => "I'm free after 6:30. Does Thursday work?",
        "client_message_id" => "cm-b-1"
      })

    assert json_response(conn, 201)["message"]["server_seq"] >= 2

    # History for both
    conn =
      build_conn()
      |> auth(token_a)
      |> get("/api/v1/product/conversations/#{conversation_id}/messages")

    history = json_response(conn, 200)
    assert length(history["messages"]) == 2
    # Lifecycle: plan-forming → still open once availability is on the table.
    assert Enum.any?(
             history["signals"],
             &(&1["label"] in ["Still open", "Becoming a plan", "Will know later"])
           )

    assert Enum.any?(history["signals"], &(&1["not_identity_label"] == true))

    # Conversations list
    conn =
      build_conn()
      |> auth(token_a)
      |> get("/api/v1/product/conversations")

    convs = json_response(conn, 200)["conversations"]
    assert Enum.any?(convs, &(&1["id"] == conversation_id))

    # User C denied history
    conn =
      build_conn()
      |> auth(token_c)
      |> get("/api/v1/product/conversations/#{conversation_id}/messages")

    assert json_response(conn, 403)["error_code"] == "not_a_member"

    # Socket with product session (ChannelTest macro)
    require Phoenix.ChannelTest

    {:ok, socket} =
      Phoenix.ChannelTest.connect(UserSocket, %{
        "session_token" => token_a,
        "device_id" => "web-device-a",
        "app_state" => "foreground",
        "client_version" => "sf15-test"
      })

    assert socket.assigns.user_id == user_a
    assert socket.assigns.auth_mode == :product_session

    # Invalid token rejected
    assert :error =
             Phoenix.ChannelTest.connect(UserSocket, %{
               "session_token" => "not-a-token",
               "device_id" => "web-device-x",
               "app_state" => "foreground",
               "client_version" => "sf15-test"
             })

    # Block B
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/block", %{
        "blocked_user_id" => user_b,
        "idempotency_key" => "blk-sf15-1"
      })

    assert json_response(conn, 200)["blocked"] == true

    # Sign out A
    conn =
      build_conn()
      |> auth(token_a)
      |> delete("/api/v1/product/session")

    assert json_response(conn, 200)["signed_out"] == true

    # Revoked session rejected
    conn =
      build_conn()
      |> auth(token_a)
      |> get("/api/v1/product/session")

    assert json_response(conn, 401)["error_code"] in [
             "session_revoked",
             "session_mismatch",
             "session_not_found",
             "invalid_token"
           ]

    # Socket with revoked token fails
    assert :error =
             Phoenix.ChannelTest.connect(UserSocket, %{
               "session_token" => token_a,
               "device_id" => "web-device-a2",
               "app_state" => "foreground",
               "client_version" => "sf15-test"
             })

    # Sign-in again for existing account
    {token_b2, _, body} = activate(build_conn(), @jordan, "Jordan Lee", "jordan_sf15_b")
    assert is_binary(token_b2)
    assert body["account"]["outcome"] in ["existing_account", "created"]
  end

  test "product session issue and authenticate round-trip", %{conn: conn} do
    {token, user_id, _} = activate(conn, @alex, "Alex Reed", "alex_sess")
    assert {:ok, %{user_id: ^user_id}} = ProductSession.authenticate(token)
    assert {:error, :invalid_token} = ProductSession.authenticate("garbage")
  end

  test "fixture-only mode rejects non-approved numbers", %{conn: conn} do
    previous = Application.get_env(:opal_core, :synthetic_fixture_only)
    Application.put_env(:opal_core, :synthetic_fixture_only, true)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :synthetic_fixture_only)
      else
        Application.put_env(:opal_core, :synthetic_fixture_only, previous)
      end
    end)

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => "+15551234567",
        "device_label" => "web",
        "idempotency_key" => "ch-not-fixture-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 422)
    assert body["error_code"] == "number_not_enabled"
  end

  test "fixture-only mode still accepts approved fixtures", %{conn: conn} do
    previous = Application.get_env(:opal_core, :synthetic_fixture_only)
    Application.put_env(:opal_core, :synthetic_fixture_only, true)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :synthetic_fixture_only)
      else
        Application.put_env(:opal_core, :synthetic_fixture_only, previous)
      end
    end)

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => @alex,
        "device_label" => "web",
        "idempotency_key" => "ch-fixture-ok-#{System.unique_integer([:positive])}"
      })

    assert json_response(conn, 201)["challenge"]["id"]
  end

  test "user C ticket works but channel join to A-B conversation is denied", %{conn: conn} do
    {token_a, _user_a, _} = activate(conn, @alex, "Alex Reed", "alex_c_isol")
    {token_b, _user_b, _} = activate(build_conn(), @jordan, "Jordan Lee", "jordan_c_isol")
    {token_c, user_c, _} = activate(build_conn(), @maya, "Maya Chen", "maya_c_isol")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "message" => "Join",
        "idempotency_key" => "inv-c-isol-#{System.unique_integer([:positive])}"
      })

    inv_id = json_response(conn, 201)["invitation"]["id"]

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/invitations/#{inv_id}/accept", %{})

    conversation_id = json_response(conn, 200)["establishment"]["conversation_id"]
    assert is_binary(conversation_id)

    # C cannot read history
    conn =
      build_conn()
      |> auth(token_c)
      |> get("/api/v1/product/conversations/#{conversation_id}/messages")

    assert json_response(conn, 403)["error_code"] == "not_a_member"

    # C can mint own product socket ticket
    conn =
      build_conn()
      |> auth(token_c)
      |> post("/api/v1/product/socket-ticket", %{})

    ticket = json_response(conn, 200)["ticket"]
    assert is_binary(ticket)

    require Phoenix.ChannelTest

    {:ok, socket_c} =
      Phoenix.ChannelTest.connect(UserSocket, %{
        "socket_ticket" => ticket,
        "device_id" => "web-device-c",
        "app_state" => "foreground",
        "client_version" => "sf17-test"
      })

    assert socket_c.assigns.user_id == user_c

    assert {:error, %{reason: "unauthorized"}} =
             Phoenix.ChannelTest.subscribe_and_join(
               socket_c,
               "conversation:#{conversation_id}",
               %{}
             )

    # After A signs out, ticket mint fails
    conn =
      build_conn()
      |> auth(token_a)
      |> delete("/api/v1/product/session")

    assert json_response(conn, 200)["signed_out"] == true

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/socket-ticket", %{})

    assert json_response(conn, 401)["error_code"] in [
             "session_revoked",
             "session_mismatch",
             "session_not_found",
             "invalid_token",
             "auth_required"
           ]
  end
end
