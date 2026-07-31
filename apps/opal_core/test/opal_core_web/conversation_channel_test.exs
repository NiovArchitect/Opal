defmodule OpalCoreWeb.ConversationChannelTest do
  use OpalCoreWeb.ChannelCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCoreWeb.UserSocket

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp connect_user(user_id, device_id \\ "device-1") do
    {:ok, socket} =
      connect(UserSocket, %{
        "user_id" => user_id,
        "device_id" => device_id,
        "app_state" => "foreground",
        "client_version" => "test-0.1.0"
      })

    socket
  end

  test "member can join; non-member cannot" do
    socket = connect_user(Fixtures.user_alex_id())

    {:ok, _, _socket} =
      subscribe_and_join(socket, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    socket_t = connect_user(Fixtures.user_taylor_id())

    assert {:error, %{reason: "unauthorized"}} =
             subscribe_and_join(socket_t, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})
  end

  test "two users exchange message with server_seq, accepted, new, and delivered" do
    alex = connect_user(Fixtures.user_alex_id(), "alex-device")
    jordan = connect_user(Fixtures.user_jordan_id(), "jordan-device")

    {:ok, _, alex_sock} =
      subscribe_and_join(alex, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    {:ok, _, jordan_sock} =
      subscribe_and_join(jordan, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    ref =
      push(alex_sock, "message:send", %{
        "schema_version" => "0.1.0",
        "client_message_id" => "ch-msg-1",
        "conversation_id" => Fixtures.conv_alex_jordan_id(),
        "body" => "hello jordan",
        "trace_id" => "trace-channel-00000001"
      })

    assert_reply ref, :ok, %{"message" => msg, "origin" => "created"}
    assert msg["server_seq"] == 1
    assert msg["body"] == "hello jordan"

    assert_push "message:accepted", %{"message" => ^msg}

    # Jordan receives new message (broadcast_from excludes sender)
    assert_push "message:new", %{"message" => new_msg}
    assert new_msg["id"] == msg["id"]

    ack_ref =
      push(jordan_sock, "message:ack_delivered", %{
        "message_id" => msg["id"],
        "trace_id" => "trace-ack-0000000001"
      })

    assert_reply ack_ref, :ok, %{"message_id" => mid}
    assert mid == msg["id"]
    assert_broadcast "message:delivered", %{"message_id" => ^mid}
  end

  test "idempotent client_message_id does not create second seq" do
    alex = connect_user(Fixtures.user_alex_id())

    {:ok, _, sock} =
      subscribe_and_join(alex, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    payload = %{
      "schema_version" => "0.1.0",
      "client_message_id" => "ch-dup",
      "body" => "once",
      "trace_id" => "trace-dup-000000000001"
    }

    ref1 = push(sock, "message:send", payload)
    assert_reply ref1, :ok, %{"message" => m1, "origin" => "created"}

    ref2 = push(sock, "message:send", payload)
    assert_reply ref2, :ok, %{"message" => m2, "origin" => "idempotent"}
    assert m1["id"] == m2["id"]
    assert m1["server_seq"] == m2["server_seq"]
  end

  test "history sync returns messages after server_seq" do
    alex = connect_user(Fixtures.user_alex_id())

    {:ok, _, sock} =
      subscribe_and_join(alex, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    ref1 =
      push(sock, "message:send", %{
        "client_message_id" => "h1",
        "body" => "a",
        "trace_id" => "trace-hist-0000000001"
      })

    assert_reply ref1, :ok, %{"message" => %{"server_seq" => 1}}

    ref2 =
      push(sock, "message:send", %{
        "client_message_id" => "h2",
        "body" => "b",
        "trace_id" => "trace-hist-0000000002"
      })

    assert_reply ref2, :ok, %{"message" => %{"server_seq" => 2}}

    sync = push(sock, "history:sync", %{"after_server_seq" => 1})
    assert_reply sync, :ok, %{"messages" => messages}
    assert length(messages) == 1
    assert hd(messages)["body"] == "b"
  end

  test "presence tracks join" do
    alex = connect_user(Fixtures.user_alex_id(), "dev-a")

    {:ok, _, _sock} =
      subscribe_and_join(alex, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    assert_push "presence:state", state
    assert Map.has_key?(state, Fixtures.user_alex_id())
  end

  test "socket connect fails when DevAuth disabled" do
    Application.put_env(:opal_core, :dev_auth_enabled, false)
    on_exit(fn -> Application.put_env(:opal_core, :dev_auth_enabled, true) end)

    assert :error =
             connect(UserSocket, %{"user_id" => Fixtures.user_alex_id(), "device_id" => "x"})
  end
end
