defmodule OpalCore.SocialFlow.RevokedOpenSocketTest do
  @moduledoc """
  P0: logout revokes DB session — already-open Phoenix sockets must lose privilege.
  HOLD. DO NOT MERGE. DO NOT START LIVE.
  """
  use OpalCoreWeb.ChannelCase
  import Phoenix.ConnTest, except: [connect: 2]

  alias OpalCore.FixturesHelper
  alias OpalCore.Auth.ProductSession
  alias OpalCoreWeb.UserSocket

  @endpoint OpalCoreWeb.Endpoint
  @alex "+12025550101"
  @jordan "+12025550102"

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
             "development_code" => code
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
    {body["session"]["access_token"], body["user"]["id"], body}
  end

  defp auth(conn, token),
    do: Plug.Conn.put_req_header(conn, "authorization", "Bearer #{token}")

  @tag :socket_revocation
  test "open conversation channel denies message:send after session revoke" do
    {token_a, _user_a, _} = activate(build_conn(), @alex, "Alex Reed", "alex_open_sock")
    {token_b, user_b, _} = activate(build_conn(), @jordan, "Jordan Lee", "jordan_open_sock")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})

    body = json_response(conn, 201)
    conversation_id = body["conversation_id"] || get_in(body, ["conversation", "id"])
    assert is_binary(conversation_id)

    {:ok, socket} =
      connect(UserSocket, %{
        "session_token" => token_a,
        "device_id" => "web-device-open-a",
        "app_state" => "foreground",
        "client_version" => "sf15-test"
      })

    assert is_binary(socket.assigns.session_id)

    {:ok, _reply, ch} = subscribe_and_join(socket, "conversation:#{conversation_id}", %{})
    Process.sleep(50)

    ref_ok =
      push(ch, "message:send", %{
        "body" => "pre-revoke",
        "client_message_id" => "cm-pre-#{System.unique_integer([:positive])}",
        "trace_id" => "trace-pre-revoke"
      })

    assert_reply ref_ok, :ok, _ok_body, 3_000

    conn =
      build_conn()
      |> auth(token_a)
      |> delete("/api/v1/product/session")

    assert json_response(conn, 200)["signed_out"] == true
    refute ProductSession.session_active?(socket.assigns.session_id)

    ref_denied =
      push(ch, "message:send", %{
        "body" => "post-revoke must fail",
        "client_message_id" => "cm-post-#{System.unique_integer([:positive])}",
        "trace_id" => "trace-post-revoke"
      })

    assert_reply ref_denied, :error, err, 3_000
    code = err["error_code"] || err["reason"] || err["error"]
    assert to_string(code) =~ "session"

    assert {:error, %{reason: reason}} =
             subscribe_and_join(socket, "conversation:#{conversation_id}", %{})

    assert to_string(reason) =~ "session"

    assert :error =
             connect(UserSocket, %{
               "session_token" => token_a,
               "device_id" => "web-device-open-a2",
               "app_state" => "foreground",
               "client_version" => "sf15-test"
             })

    {:ok, sock_b} =
      connect(UserSocket, %{
        "session_token" => token_b,
        "device_id" => "web-device-open-b",
        "app_state" => "foreground",
        "client_version" => "sf15-test"
      })

    assert sock_b.assigns.user_id == user_b
  end
end
