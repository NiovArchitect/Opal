defmodule OpalCoreWeb.ConversationChannelTest do
  use OpalCoreWeb.ChannelCase

  alias OpalCore.{Fixtures, FixturesHelper, Repo}
  alias OpalCore.Messaging.MessageDelivery
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

  defp join_conv(socket, conversation_id \\ Fixtures.conv_alex_jordan_id()) do
    {:ok, _, ch} = subscribe_and_join(socket, "conversation:#{conversation_id}", %{})
    # Drain presence noise so assert_reply is not racing presence mailbox traffic.
    Process.sleep(30)
    flush_presence()
    ch
  end

  defp flush_presence do
    receive do
      %Phoenix.Socket.Message{event: "presence:state"} -> flush_presence()
      %Phoenix.Socket.Message{event: "presence:diff"} -> flush_presence()
      %Phoenix.Socket.Message{event: "presence_diff"} -> flush_presence()
      %Phoenix.Socket.Broadcast{event: "presence_diff"} -> flush_presence()
      %Phoenix.Socket.Broadcast{event: "presence:diff"} -> flush_presence()
    after
      20 -> :ok
    end
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

    assert_push "message:new", %{"message" => new_msg}
    assert new_msg["id"] == msg["id"]

    ack_ref =
      push(jordan_sock, "message:ack_delivered", %{
        "message_id" => msg["id"],
        "trace_id" => "trace-ack-0000000001"
      })

    assert_reply ack_ref, :ok, %{"message_id" => mid, "origin" => "created"}
    assert mid == msg["id"]
    assert_broadcast "message:delivered", %{"message_id" => ^mid}

    # Idempotent second ack
    ack2 =
      push(jordan_sock, "message:ack_delivered", %{
        "message_id" => msg["id"],
        "trace_id" => "trace-ack-0000000002"
      })

    assert_reply ack2, :ok, %{"origin" => "idempotent"}
    assert Repo.aggregate(MessageDelivery, :count) == 1
  end

  test "sender cannot ack own message as delivery" do
    alex = connect_user(Fixtures.user_alex_id())

    {:ok, _, sock} =
      subscribe_and_join(alex, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    ref =
      push(sock, "message:send", %{
        "client_message_id" => "self-ack",
        "body" => "x",
        "trace_id" => "trace-self-ack-0000001"
      })

    assert_reply ref, :ok, %{"message" => msg}

    bad =
      push(sock, "message:ack_delivered", %{
        "message_id" => msg["id"],
        "trace_id" => "trace-self-ack-bad-001"
      })

    assert_reply bad, :error, %{"error_code" => "ack_unauthorized"}
  end

  test "sender_user_id override is rejected with message:failed" do
    alex = connect_user(Fixtures.user_alex_id())

    {:ok, _, sock} =
      subscribe_and_join(alex, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    ref =
      push(sock, "message:send", %{
        "client_message_id" => "override",
        "body" => "x",
        "sender_user_id" => Fixtures.user_jordan_id(),
        "trace_id" => "trace-override-000001"
      })

    assert_reply ref, :error, %{"error_code" => "sender_override_rejected"}
    assert_push "message:failed", %{"error_code" => "sender_override_rejected"}
  end

  test "ack for unknown message id rejected" do
    jordan = connect_user(Fixtures.user_jordan_id())

    {:ok, _, sock} =
      subscribe_and_join(jordan, "conversation:#{Fixtures.conv_alex_jordan_id()}", %{})

    ref =
      push(sock, "message:ack_delivered", %{
        "message_id" => Ecto.UUID.generate(),
        "trace_id" => "trace-unknown-msg-0001"
      })

    assert_reply ref, :error, %{"error_code" => "message_not_found"}
  end

  test "ack for wrong conversation rejected" do
    alex = connect_user(Fixtures.user_alex_id())
    jordan = connect_user(Fixtures.user_jordan_id())

    jordan_aj = join_conv(jordan, Fixtures.conv_alex_jordan_id())
    alex_at = join_conv(alex, Fixtures.conv_alex_taylor_id())

    ref =
      push(alex_at, "message:send", %{
        "client_message_id" => "cross-at",
        "body" => "private-at",
        "trace_id" => "trace-cross-000000001"
      })

    assert_reply ref, :ok, %{"message" => msg}

    # Jordan on AJ channel cannot ack a message that belongs to AT.
    bad =
      push(jordan_aj, "message:ack_delivered", %{
        "message_id" => msg["id"],
        "trace_id" => "trace-cross-ack-000001"
      })

    assert_reply bad, :error, %{"error_code" => "ack_unauthorized"}
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
    assert_reply sync, :ok, %{"messages" => messages, "schema_version" => "0.1.0"}
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

  test "socket rejects invalid app_state and missing device_id" do
    assert :error =
             connect(UserSocket, %{
               "user_id" => Fixtures.user_alex_id(),
               "device_id" => "d1",
               "app_state" => "flying"
             })

    assert :error =
             connect(UserSocket, %{
               "user_id" => Fixtures.user_alex_id()
             })
  end

  test "socket rejects forbidden metadata injection" do
    assert :error =
             connect(UserSocket, %{
               "user_id" => Fixtures.user_alex_id(),
               "device_id" => "d1",
               "phone" => "+15555550100"
             })
  end

  test "concurrent message sends get unique monotonic server_seq" do
    parent = self()
    conversation_id = Fixtures.conv_alex_jordan_id()
    user_id = Fixtures.user_alex_id()
    # Stay under spam throttle (10 non-contact / 5 min) while still racing seq alloc.
    n = 8

    tasks =
      for i <- 1..n do
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(OpalCore.Repo, parent, self())

          OpalCore.Messages.accept_message(%{
            conversation_id: conversation_id,
            sender_user_id: user_id,
            client_message_id: "conc-#{i}-#{System.unique_integer([:positive])}",
            body: "m#{i}"
          })
        end)
      end

    results = Enum.map(tasks, &Task.await(&1, 15_000))

    assert Enum.all?(results, &match?({:ok, _msg, status} when status in [:created, :idempotent], &1)),
           "unexpected results: #{inspect(for r <- results, not match?({:ok, _, s} when s in [:created, :idempotent], r), do: r)}"

    seqs = for {:ok, m, _} <- results, do: m.server_seq
    assert length(seqs) == n
    assert length(Enum.uniq(seqs)) == n
    assert Enum.sort(seqs) == Enum.to_list(Enum.min(seqs)..Enum.max(seqs))
  end
end
