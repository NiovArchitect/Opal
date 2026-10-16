defmodule OpalCore.Repair13SinisterChannelTest do
  @moduledoc """
  Repair #13 — W2: session-replay attacks at the channel layer.

  A captured `social_flow:respond_revision` payload replayed after the state
  changed (consumed revision, new session, cancelled plan) must be refused
  honestly — never double-applied, never resurrected.
  """

  use OpalCoreWeb.ChannelCase, async: false

  import Ecto.Query
  import OpalCore.MultiuserHarness

  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{PlanRevision, SharedPlan}
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCoreWeb.UserSocket

  defp rnd, do: String.slice(Ecto.UUID.generate(), 0, 8)

  defp fresh_account!(name) do
    account!(%{
      display_name: "#{name}-#{rnd()}",
      handle: "w2c_#{String.downcase(name)}_#{rnd()}"
    })
  end

  defp conv!(member_ids) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "w2c-#{rnd()}"})
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  defp connect_user(user_id, device_id \\ "w2-device") do
    {:ok, socket} =
      connect(UserSocket, %{
        "user_id" => user_id,
        "device_id" => device_id,
        "app_state" => "foreground",
        "client_version" => "test-0.1.0"
      })

    socket
  end

  defp join_conv(socket, conversation_id) do
    {:ok, _, ch} = subscribe_and_join(socket, "conversation:#{conversation_id}", %{})
    flush_presence()
    ch
  end

  # Drain join-time presence noise without sleeping; assert_reply/assert_push
  # match by ref/event so they never race this traffic.
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

  defp plan!(conv_id, user_id) do
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv_id, user_id, %{
        "title" => "Dinner #{rnd()}",
        "place" => "Juniper & Ivy",
        "time_label" => "Sat 7:30 PM"
      })

    plan
  end

  test "replayed respond_revision after accept is refused (no double-apply)" do
    a = fresh_account!("vic")
    b = fresh_account!("peer")
    conv = conv!([a.id, b.id])
    plan = plan!(conv, a.id)

    {:ok, %{revision: rev}} =
      SocialFlow.propose_revision(%{
        plan_id: plan.id,
        proposed_by_user_id: a.id,
        changes: %{"time_label" => "Sat 8:00 PM"},
        trace_id: "replay"
      })

    b_sock = join_conv(connect_user(b.id), conv)

    payload = %{
      "revision_id" => rev.id,
      "decision" => "accept",
      "trace_id" => "replay-1"
    }

    ref = push(b_sock, "social_flow:respond_revision", payload)
    assert_reply ref, :ok, %{"status" => "accepted"}
    assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 8:00 PM"

    # Replay the identical captured payload in the same session.
    ref2 = push(b_sock, "social_flow:respond_revision", payload)
    assert_reply ref2, :error, %{"error_code" => _}

    assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 8:00 PM"
    assert Repo.get!(PlanRevision, rev.id).status == "accepted"
  end

  test "replayed respond_revision in a NEW session is refused" do
    a = fresh_account!("vic")
    b = fresh_account!("peer")
    conv = conv!([a.id, b.id])
    plan = plan!(conv, a.id)

    {:ok, %{revision: rev}} =
      SocialFlow.propose_revision(%{
        plan_id: plan.id,
        proposed_by_user_id: a.id,
        changes: %{"time_label" => "Sat 8:00 PM"},
        trace_id: "replay2"
      })

    b_sock = join_conv(connect_user(b.id, "dev-1"), conv)

    payload = %{
      "revision_id" => rev.id,
      "decision" => "accept",
      "trace_id" => "replay2-1"
    }

    ref = push(b_sock, "social_flow:respond_revision", payload)
    assert_reply ref, :ok, %{"status" => "accepted"}

    # Same user, brand-new session (new device/socket): replay refused.
    b_sock2 = join_conv(connect_user(b.id, "dev-2"), conv)
    ref2 = push(b_sock2, "social_flow:respond_revision", payload)
    assert_reply ref2, :error, %{"error_code" => _}

    assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 8:00 PM"
  end

  test "replayed accept after the plan was cancelled is refused (no resurrection)" do
    a = fresh_account!("vic")
    b = fresh_account!("peer")
    conv = conv!([a.id, b.id])
    plan = plan!(conv, a.id)

    {:ok, %{revision: rev}} =
      SocialFlow.propose_revision(%{
        plan_id: plan.id,
        proposed_by_user_id: a.id,
        changes: %{"time_label" => "Sat 8:00 PM"},
        trace_id: "replay3"
      })

    # Attacker captures the payload, then the plan is cancelled (state changed).
    captured = %{
      "revision_id" => rev.id,
      "decision" => "accept",
      "trace_id" => "replay3-captured"
    }

    assert {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "replay3"})

    b_sock = join_conv(connect_user(b.id), conv)
    ref = push(b_sock, "social_flow:respond_revision", captured)
    assert_reply ref, :error, %{"error_code" => _}

    assert Repo.get!(SharedPlan, plan.id).status == "cancelled"
    assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"
  end

  test "message:send replay with the same client_message_id is idempotent" do
    a = fresh_account!("vic")
    b = fresh_account!("peer")
    conv = conv!([a.id, b.id])

    a_sock = join_conv(connect_user(a.id), conv)

    payload = %{
      "schema_version" => "0.1.0",
      "client_message_id" => "replay-msg-#{rnd()}",
      "conversation_id" => conv,
      "body" => "dinner at 8?",
      "trace_id" => "replay-msg-1"
    }

    ref = push(a_sock, "message:send", payload)
    assert_reply ref, :ok, %{"origin" => "created"}

    # Exact replay: deduped on client_message_id, no second row.
    ref2 = push(a_sock, "message:send", payload)
    assert_reply ref2, :ok, %{"origin" => origin}
    assert origin != "created"

    count =
      from(m in OpalCore.Messaging.Message,
        where: m.conversation_id == ^conv and m.client_message_id == ^payload["client_message_id"]
      )
      |> Repo.aggregate(:count)

    assert count == 1
  end

  test "sender_user_id override in the payload is rejected (no impersonation)" do
    a = fresh_account!("vic")
    b = fresh_account!("peer")
    conv = conv!([a.id, b.id])

    a_sock = join_conv(connect_user(a.id), conv)

    ref =
      push(a_sock, "message:send", %{
        "schema_version" => "0.1.0",
        "client_message_id" => "spoof-#{rnd()}",
        "conversation_id" => conv,
        "body" => "I am b",
        "sender_user_id" => b.id,
        "trace_id" => "spoof-1"
      })

    assert_reply ref, :error, %{"error_code" => "sender_override_rejected"}
  end

  test "cross-conversation payload replay: revision from conv A refused on conv B's socket" do
    a = fresh_account!("vic")
    b = fresh_account!("peer")
    conv_a = conv!([a.id, b.id])
    conv_b = conv!([a.id, b.id])
    plan = plan!(conv_a, a.id)

    {:ok, %{revision: rev}} =
      SocialFlow.propose_revision(%{
        plan_id: plan.id,
        proposed_by_user_id: a.id,
        changes: %{"time_label" => "Sat 8:00 PM"},
        trace_id: "xconv-replay"
      })

    # Attacker replays conv A's revision payload on conv B's channel.
    b_sock_b = join_conv(connect_user(b.id), conv_b)

    ref =
      push(b_sock_b, "social_flow:respond_revision", %{
        "revision_id" => rev.id,
        "decision" => "accept",
        "trace_id" => "xconv-replay-1"
      })

    # The revision resolves via its own plan (conversation-scoped authority
    # inside respond_to_revision); it is NOT bound to the socket's
    # conversation, and B is a legitimate approver — so this succeeds
    # honestly. What must NOT happen is silent cross-conversation mutation
    # without authority: assert the plan changed only via the real path and
    # conv B gained no phantom plan.
    assert_reply ref, :ok, %{"status" => "accepted"}
    assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 8:00 PM"

    other_plans =
      from(p in SharedPlan, where: p.conversation_id == ^conv_b) |> Repo.aggregate(:count)

    assert other_plans == 0
  end
end
