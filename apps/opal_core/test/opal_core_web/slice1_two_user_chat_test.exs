defmodule OpalCoreWeb.Slice1TwoUserChatTest do
  @moduledoc """
  CORE PRODUCT REALITY Slice #1 — two real ProductSession identities,
  ensure_direct idempotency, send/list, durable unread mark-read.
  """
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"
  @jordan "+12025550102"

  setup do
    FixturesHelper.seed!()
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
        "idempotency_key" => "s1-ch-#{handle}-#{System.unique_integer([:positive])}"
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
    {body["session"]["access_token"], body["user"]["id"], body}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "two users: ensure_direct stable, message, unread, mark_read", %{conn: conn} do
    {token_a, user_a, _} = activate(conn, @alex, "Alex Reed", "s1_alex")
    {token_b, user_b, _} = activate(build_conn(), @jordan, "Jordan Lee", "s1_jordan")
    assert user_a != user_b

    # Direct create
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})

    a1 = json_response(conn, 201)
    cid = a1["conversation_id"]
    assert a1["direct"] == true
    assert a1["composition"] == "dyad"

    # Idempotent ensure
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})

    a2 = json_response(conn, 200)
    assert a2["conversation_id"] == cid

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_a})

    b1 = json_response(conn, 200)
    assert b1["conversation_id"] == cid

    # A sends
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{cid}/messages", %{
        "body" => "Hey — can you meet tomorrow?",
        "client_message_id" => "s1-a-1"
      })

    msg = json_response(conn, 201)["message"]
    assert msg["body"] =~ "meet tomorrow"
    assert msg["sender_user_id"] == user_a

    # B lists conversations — unread >= 1
    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/conversations")

    list_b = json_response(conn, 200)["conversations"]
    row = Enum.find(list_b, &(&1["id"] == cid))
    assert row
    assert row["unread_count"] >= 1
    assert row["preview"] =~ "meet tomorrow"

    # B reads
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/#{cid}/read", %{})

    assert json_response(conn, 200)["unread_count"] == 0

    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/conversations")

    row2 = Enum.find(json_response(conn, 200)["conversations"], &(&1["id"] == cid))
    assert row2["unread_count"] == 0

    # Non-member cannot read
    {token_c, _user_c, _} =
      activate(build_conn(), "+12025550103", "Maya Chen", "s1_maya")

    conn =
      build_conn()
      |> auth(token_c)
      |> get("/api/v1/product/conversations/#{cid}/messages")

    assert json_response(conn, 403)["error_code"] == "not_a_member"
  end
end
