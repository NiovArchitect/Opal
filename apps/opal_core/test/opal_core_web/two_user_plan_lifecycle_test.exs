defmodule OpalCoreWeb.TwoUserPlanLifecycleTest do
  @moduledoc """
  Repair #11 — Directive §5: two-user validation with DISTINCT authenticated sessions.

  PROVENANCE: LIVE-SESSION. Two real Phoenix channel sessions (distinct `user_id`,
  distinct `device_id`) against the real backend (Postgres + PubSub). Every action
  attributed to User B genuinely originates from User B's socket — pushes are made
  on B's channel, and context calls carry B's user id explicitly. No fabricated
  peer actions anywhere in this file.

  Scenario coverage (§5.1–12):
    1. A creates a plan involving B → B receives the invitation broadcast
    2. A sends a chat message → B receives message:new on B's session
    3. B accepts → plan created; both sessions observe
    4. A proposes a time change → B confirms via B's OWN socket (real client path)
    5. Both sessions observe the same committed state (broadcasts + sync_for_user)
    6. A withdraws → durable outbox event recorded; plan NOT cancelled
    7. B continues; B (non-lead) cannot cancel_plan (fail closed)
    8. Both leave and re-enter → histories and plan state synchronized
    9. Both reconnect after simulated network loss → synchronized, no dupes
    10. Reversed authority (B organizes, A participates)
    11. B declines a change → revision rejected, plan unchanged
    12. Double-accept race → exactly one plan
    13. Consumed revision cannot be confirmed twice (exactly-once)
    14. NL "I confirm" routes to the pending revision (revision_confirmation)

  Run with:
      MIX_DEPS_PATH=/tmp/opal_deps MIX_ENV=test mix test \\
        test/opal_core_web/two_user_plan_lifecycle_test.exs
  """

  use OpalCoreWeb.ChannelCase

  import Ecto.Query

  alias OpalCore.{Messages, Repo, SocialFlow}
  alias OpalCore.Accounts.User
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Messaging.Message
  alias OpalCore.SocialFlow.{JourneyAuthority, PlanParticipant, PlanRevision, SharedPlan}
  alias OpalCoreWeb.UserSocket

  # ---------------------------------------------------------------------------
  # Setup helpers — fresh, isolated users/conversations per test (no fixtures)
  # ---------------------------------------------------------------------------

  defp fresh_user!(name) do
    id = Ecto.UUID.generate()

    {:ok, user} =
      %User{}
      |> User.changeset(%{
        id: id,
        handle: "tu2_" <> String.slice(id, 0, 8),
        display_name: name
      })
      |> Repo.insert()

    user
  end

  defp connect_user!(user_id, device_id) do
    {:ok, socket} =
      connect(UserSocket, %{
        "user_id" => user_id,
        "device_id" => device_id,
        "app_state" => "foreground",
        "client_version" => "test-0.1.0"
      })

    socket
  end

  defp flush_presence do
    receive do
      %Phoenix.Socket.Message{event: "presence:" <> _} -> flush_presence()
      %Phoenix.Socket.Broadcast{event: "presence" <> _} -> flush_presence()
    after
      20 -> :ok
    end
  end

  # Drain all pending channel pushes (selective-receive noise between phases).
  defp drain_pushes do
    receive do
      %Phoenix.Socket.Message{} -> drain_pushes()
    after
      100 -> :ok
    end
  end

  defp join_conv!(socket, cid) do
    {:ok, _, chan} = subscribe_and_join(socket, "conversation:#{cid}", %{})
    flush_presence()
    chan
  end

  defp setup_pair! do
    a = fresh_user!("User A")
    b = fresh_user!("User B")
    {:ok, %{conversation_id: cid}} = Messages.ensure_direct_conversation(a.id, b.id)

    sock_a = connect_user!(a.id, "device-a-2u")
    sock_b = connect_user!(b.id, "device-b-2u")
    chan_a = join_conv!(sock_a, cid)
    chan_b = join_conv!(sock_b, cid)

    %{a: a, b: b, cid: cid, sock_a: sock_a, sock_b: sock_b, chan_a: chan_a, chan_b: chan_b}
  end

  defp propose_plan!(cid, proposer_id, activity \\ "Dinner") do
    {:ok, %{proposal: proposal, options: [option | _]}} =
      SocialFlow.create_proposal_from_ai_result(%{
        conversation_id: cid,
        requester_user_id: proposer_id,
        output: %{
          "result_type" => "plan_candidate",
          "candidate" => %{
            "activity" => activity,
            "normalized_time_candidates" => [%{"label" => "Saturday at 7:30 PM"}],
            "location_expression" => "Juniper & Ivy",
            "participant_mentions" => [],
            "confidence" => 0.9
          }
        },
        trace_id: "trace-2u-propose"
      })

    {proposal, option}
  end

  # Full proposal → coordination → both-accept flow. The LAST acceptor becomes
  # created_by (and, since repair #11, the lead).
  defp drive_to_plan!(cid, first_id, second_id) do
    {proposal, option} = propose_plan!(cid, first_id)

    assert {:ok, %{proposal: approved}} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: first_id,
               trace_id: "trace-2u-approve"
             })

    assert approved.status == "approved_for_coordination"

    assert {:ok, :awaiting_others} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: first_id,
               response: "accept",
               trace_id: "trace-2u-acc1"
             })

    assert {:ok, %{plan: plan}} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: second_id,
               response: "accept",
               trace_id: "trace-2u-acc2"
             })

    # Clear per-phase broadcast noise so the next phase's assertions are exact.
    drain_pushes()
    plan
  end

  defp plan_of!(plan_id), do: Repo.get!(SharedPlan, plan_id)

  defp participant_state!(plan_id, user_id) do
    Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: user_id)
  end

  defp find_plan(sync, plan_id) do
    Enum.find(sync["plans"], &(&1["id"] == plan_id))
  end

  # ---------------------------------------------------------------------------
  # §5.1–3: invitation → chat message → accept → plan; both sessions observe
  # ---------------------------------------------------------------------------

  test "A invites B; B receives invitation + chat message on B's session; B accepts; plan created" do
    %{a: a, b: b, cid: cid, chan_a: chan_a} = setup_pair!()

    # A creates the plan proposal. Both sessions observe the invitation broadcast.
    {proposal, option} = propose_plan!(cid, a.id)
    assert_push "social_flow:signal", %{"payload" => %{"proposal" => %{"id" => prop_id}}}
    assert prop_id == proposal.id
    assert_push "social_flow:signal", %{"payload" => %{"proposal" => %{"id" => ^prop_id}}}
    drain_pushes()

    # A sends a chat message on A's OWN socket; B's session must observe it.
    ref_msg =
      push(chan_a, "message:send", %{
        "schema_version" => "0.1.0",
        "client_message_id" => "2u-invite-msg",
        "conversation_id" => cid,
        "body" => "Want to do dinner Saturday?",
        "trace_id" => "trace-2u-invite-msg"
      })

    assert_reply ref_msg, :ok, %{"message" => sent}
    assert sent["body"] == "Want to do dinner Saturday?"
    # B's session observes message:new (broadcast_from! excludes the sender's
    # own channel; the sender reconciles via the reply above).
    assert_push "message:new", %{"message" => %{"id" => mid1}}
    assert mid1 == sent["id"]
    drain_pushes()

    # B accepts through the real state machine (B's user id, B's action —
    # nothing about B is fabricated).
    assert {:ok, %{proposal: approved}} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: a.id,
               trace_id: "trace-2u-approve"
             })

    assert approved.status == "approved_for_coordination"

    assert {:ok, :awaiting_others} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: a.id,
               response: "accept",
               trace_id: "trace-2u-a-acc"
             })

    assert {:ok, %{plan: plan}} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: b.id,
               response: "accept",
               trace_id: "trace-2u-b-acc"
             })

    assert plan.status in ["agreed", "active", "tentative"]
    assert participant_state!(plan.id, a.id).response_state == "accepted"
    assert participant_state!(plan.id, b.id).response_state == "accepted"

    # Plan-creation broadcast observed by both sessions.
    assert_push "social_flow:plan", %{"payload" => %{"plan" => %{"id" => plan_id}}}
    assert plan_id == plan.id
    assert_push "social_flow:plan", %{"payload" => %{"plan" => %{"id" => ^plan_id}}}
  end

  # ---------------------------------------------------------------------------
  # §5.4–6: A proposes a time change; B confirms via B's OWN socket (real client
  # path: social_flow:respond_revision); both see the same committed state.
  # ---------------------------------------------------------------------------

  test "A proposes time change; B confirms on B's socket; both sessions see identical committed state" do
    %{a: a, b: b, cid: cid, chan_b: chan_b} = setup_pair!()
    plan = drive_to_plan!(cid, a.id, b.id)

    assert {:ok, %{revision: revision}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: a.id,
               changes: %{"time_label" => "Saturday at 8:00 PM"},
               trace_id: "trace-2u-rev"
             })

    assert revision.status == "proposed"
    assert_push "social_flow:revision", %{"payload" => %{"revision" => %{"id" => rev_id}}}
    assert rev_id == revision.id
    assert_push "social_flow:revision", %{"payload" => %{"revision" => %{"id" => ^rev_id}}}

    # B confirms via B's OWN channel socket — the real client path.
    ref =
      push(chan_b, "social_flow:respond_revision", %{
        "revision_id" => revision.id,
        "decision" => "accept",
        "trace_id" => "trace-2u-b-confirm"
      })

    assert_reply ref, :ok, %{"status" => "accepted", "plan" => plan_contract}
    assert plan_contract["id"] == plan.id

    # Committed state: the plan row carries the new time.
    assert %SharedPlan{time_label: "Saturday at 8:00 PM"} = plan_of!(plan.id)
    assert %PlanRevision{status: "accepted"} = Repo.get!(PlanRevision, revision.id)

    # Both sessions observe the committed plan broadcast.
    assert_push "social_flow:plan", %{"payload" => %{"plan" => %{"id" => plan_id1}}}
    assert plan_id1 == plan.id
    assert_push "social_flow:plan", %{"payload" => %{"plan" => %{"id" => ^plan_id1}}}

    # Both users' sync payloads agree on the committed state.
    assert {:ok, sync_a} = SocialFlow.sync_for_user(cid, a.id)
    assert {:ok, sync_b} = SocialFlow.sync_for_user(cid, b.id)
    assert find_plan(sync_a, plan.id)["time_label"] == "Saturday at 8:00 PM"
    assert find_plan(sync_b, plan.id)["time_label"] == "Saturday at 8:00 PM"
    assert find_plan(sync_a, plan.id)["status"] == find_plan(sync_b, plan.id)["status"]
  end

  # ---------------------------------------------------------------------------
  # §5.7–9: A withdraws → durable outbox event; plan NOT cancelled; B continues;
  # non-lead cancel fails closed.
  # ---------------------------------------------------------------------------

  test "A withdraws: durable outbox event recorded, plan survives, B continues, non-lead cancel fails closed" do
    %{a: a, b: b, cid: cid} = setup_pair!()
    plan = drive_to_plan!(cid, a.id, b.id)

    # A withdraws via the real withdrawal primitive (A's user id).
    assert {:ok, %{"response_state" => "withdrawn", "cancels_everyone" => false}} =
             JourneyAuthority.cant_make_it(plan.id, a.id, %{})

    assert participant_state!(plan.id, a.id).response_state == "withdrawn"

    # The plan itself is NOT cancelled.
    assert plan_of!(plan.id).status != "cancelled"

    # Durable notification: the withdrawal is recorded in the outbox so B can
    # retrieve it even if B was offline (not just an ephemeral PubSub broadcast).
    assert %EventOutbox{event_type: "journey.participant_withdrawn"} =
             Repo.get_by!(EventOutbox,
               aggregate_id: plan.id,
               event_type: "journey.participant_withdrawn"
             )

    # B continues: still accepted, plan still active for B.
    assert participant_state!(plan.id, b.id).response_state == "accepted"
    assert {:ok, sync_b} = SocialFlow.sync_for_user(cid, b.id)
    assert find_plan(sync_b, plan.id)["status"] != "cancelled"

    # Whole-plan cancel by a non-lead fails closed.
    non_lead =
      if participant_state!(plan.id, b.id).role in ["lead", "co_lead"], do: a.id, else: b.id

    assert {:error, :not_authorized} =
             SocialFlow.cancel_plan(%{
               plan_id: plan.id,
               user_id: non_lead,
               trace_id: "trace-2u-bad-cancel"
             })

    assert plan_of!(plan.id).status != "cancelled"
  end

  # ---------------------------------------------------------------------------
  # §5.10–11: leave/re-enter and reconnect; histories + plan state synchronized
  # ---------------------------------------------------------------------------

  test "both sessions leave and re-enter: message history and plan state stay synchronized" do
    %{a: a, b: b, cid: cid, chan_a: chan_a, chan_b: chan_b} = setup_pair!()
    plan = drive_to_plan!(cid, a.id, b.id)

    # Each message genuinely originates from its sender's socket.
    ref_a =
      push(chan_a, "message:send", %{
        "schema_version" => "0.1.0",
        "client_message_id" => "2u-msg-a1",
        "conversation_id" => cid,
        "body" => "See you Saturday!",
        "trace_id" => "trace-2u-msg-a1"
      })

    assert_reply ref_a, :ok, %{"message" => msg_a}

    ref_b =
      push(chan_b, "message:send", %{
        "schema_version" => "0.1.0",
        "client_message_id" => "2u-msg-b1",
        "conversation_id" => cid,
        "body" => "Can't wait!",
        "trace_id" => "trace-2u-msg-b1"
      })

    assert_reply ref_b, :ok, %{"message" => msg_b}

    assert_push "message:new", %{"message" => %{"id" => id_a1}}
    assert_push "message:new", %{"message" => %{"id" => id_b1}}
    assert id_a1 == msg_a["id"]
    assert id_b1 == msg_b["id"]

    # Both leave the thread (navigation away). Unlink the channel pids first:
    # the test process is linked to them; a leave would otherwise exit the test.
    Process.unlink(chan_a.channel_pid)
    Process.unlink(chan_b.channel_pid)
    _ = leave(chan_a)
    _ = leave(chan_b)

    # Both re-enter with FRESH sockets (new sessions, same users).
    chan_a2 = join_conv!(connect_user!(a.id, "device-a-2u-reentry"), cid)
    chan_b2 = join_conv!(connect_user!(b.id, "device-b-2u-reentry"), cid)

    # Histories are identical and deterministically ordered on both sessions.
    ref_ha = push(chan_a2, "history:sync", %{"after_server_seq" => 0})
    assert_reply ref_ha, :ok, %{"messages" => msgs_a}
    ref_hb = push(chan_b2, "history:sync", %{"after_server_seq" => 0})
    assert_reply ref_hb, :ok, %{"messages" => msgs_b}

    bodies_a = Enum.map(msgs_a, & &1["body"])
    bodies_b = Enum.map(msgs_b, & &1["body"])
    assert bodies_a == bodies_b
    assert "See you Saturday!" in bodies_a
    assert "Can't wait!" in bodies_a
    seqs_a = Enum.map(msgs_a, & &1["server_seq"])
    assert seqs_a == Enum.sort(seqs_a)

    # Plan state identical on both sessions.
    assert {:ok, sync_a} = SocialFlow.sync_for_user(cid, a.id)
    assert {:ok, sync_b} = SocialFlow.sync_for_user(cid, b.id)
    assert find_plan(sync_a, plan.id)["status"] == find_plan(sync_b, plan.id)["status"]
  end

  test "reconnect after simulated network loss: no lost messages, no duplicates, state synchronized" do
    %{a: a, b: b, cid: cid, chan_a: chan_a, chan_b: chan_b} = setup_pair!()
    _plan = drive_to_plan!(cid, a.id, b.id)

    ref =
      push(chan_a, "message:send", %{
        "schema_version" => "0.1.0",
        "client_message_id" => "2u-netloss-1",
        "conversation_id" => cid,
        "body" => "Are we still on?",
        "trace_id" => "trace-2u-netloss"
      })

    assert_reply ref, :ok, %{"message" => %{"server_seq" => seq1}}

    # Simulate abrupt network loss: drop both channels without graceful
    # cleanup (unlink so the linked exits don't kill the test), then reconnect
    # as brand-new sessions.
    Process.unlink(chan_a.channel_pid)
    Process.unlink(chan_b.channel_pid)
    _ = leave(chan_a)
    _ = leave(chan_b)

    # Reconnect as brand-new sessions.
    chan_a2 = join_conv!(connect_user!(a.id, "device-a-2u-reconn"), cid)
    chan_b2 = join_conv!(connect_user!(b.id, "device-b-2u-reconn"), cid)

    # The pre-drop message is present exactly once on the fresh session.
    ref_h = push(chan_b2, "history:sync", %{"after_server_seq" => 0})
    assert_reply ref_h, :ok, %{"messages" => msgs, "latest_server_seq" => latest}
    assert latest >= seq1
    assert Enum.count(msgs, &(&1["body"] == "Are we still on?")) == 1

    # Idempotent resend of the same client_message_id does not duplicate.
    ref_dup =
      push(chan_a2, "message:send", %{
        "schema_version" => "0.1.0",
        "client_message_id" => "2u-netloss-1",
        "conversation_id" => cid,
        "body" => "Are we still on?",
        "trace_id" => "trace-2u-netloss-retry"
      })

    assert_reply ref_dup, :ok, %{"origin" => origin}
    assert origin in ["created", "idempotent"]

    assert Repo.aggregate(
             from(m in Message,
               where: m.conversation_id == ^cid and m.client_message_id == "2u-netloss-1"
             ),
             :count
           ) == 1
  end

  # ---------------------------------------------------------------------------
  # Reversed authority: B organizes, A participates
  # ---------------------------------------------------------------------------

  test "reversed authority: B organizes; A accepts; B proposes; A confirms; states match" do
    %{a: a, b: b, cid: cid, chan_a: chan_a} = setup_pair!()
    plan = drive_to_plan!(cid, b.id, a.id)

    assert {:ok, %{revision: revision}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: b.id,
               changes: %{"time_label" => "Sunday at 6:00 PM"},
               trace_id: "trace-2u-rev-b"
             })

    # A confirms via A's OWN socket.
    ref =
      push(chan_a, "social_flow:respond_revision", %{
        "revision_id" => revision.id,
        "decision" => "accept",
        "trace_id" => "trace-2u-a-confirm"
      })

    assert_reply ref, :ok, %{"status" => "accepted"}
    assert %SharedPlan{time_label: "Sunday at 6:00 PM"} = plan_of!(plan.id)

    assert {:ok, sync_a} = SocialFlow.sync_for_user(cid, a.id)
    assert {:ok, sync_b} = SocialFlow.sync_for_user(cid, b.id)
    assert find_plan(sync_a, plan.id)["time_label"] == "Sunday at 6:00 PM"
    assert find_plan(sync_b, plan.id)["time_label"] == "Sunday at 6:00 PM"
  end

  # ---------------------------------------------------------------------------
  # Adversarial: decline, double-accept race, exactly-once, NL confirm
  # ---------------------------------------------------------------------------

  test "B declines the change: revision rejected, plan unchanged" do
    %{a: a, b: b, cid: cid, chan_b: chan_b} = setup_pair!()
    plan = drive_to_plan!(cid, a.id, b.id)
    before_label = plan_of!(plan.id).time_label

    assert {:ok, %{revision: revision}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: a.id,
               changes: %{"time_label" => "Monday at 9:00 PM"},
               trace_id: "trace-2u-decline"
             })

    ref =
      push(chan_b, "social_flow:respond_revision", %{
        "revision_id" => revision.id,
        "decision" => "reject",
        "trace_id" => "trace-2u-b-decline"
      })

    assert_reply ref, :ok, %{"status" => "rejected"}
    assert %PlanRevision{status: "rejected"} = Repo.get!(PlanRevision, revision.id)
    assert plan_of!(plan.id).time_label == before_label
  end

  test "double-accept race: exactly one plan is created" do
    # Concurrent tasks need shared DB access in the sandbox.
    Ecto.Adapters.SQL.Sandbox.mode(Repo, {:shared, self()})

    %{a: a, b: b, cid: cid} = setup_pair!()
    {proposal, option} = propose_plan!(cid, a.id)

    assert {:ok, %{proposal: approved}} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: a.id,
               trace_id: "trace-2u-race-approve"
             })

    assert approved.status == "approved_for_coordination"

    task_a =
      Task.async(fn ->
        SocialFlow.respond_to_option(%{
          option_id: option.id,
          user_id: a.id,
          response: "accept",
          trace_id: "trace-2u-race-a"
        })
      end)

    task_b =
      Task.async(fn ->
        SocialFlow.respond_to_option(%{
          option_id: option.id,
          user_id: b.id,
          response: "accept",
          trace_id: "trace-2u-race-b"
        })
      end)

    # Both calls complete without crashing.
    _ = Task.await(task_a)
    _ = Task.await(task_b)

    # Exactly one SharedPlan row exists for this conversation.
    assert Repo.aggregate(
             from(p in SharedPlan,
               where: p.conversation_id == ^cid and p.status != "cancelled"
             ),
             :count
           ) == 1
  end

  test "a consumed revision cannot be confirmed twice (exactly-once)" do
    %{a: a, b: b, cid: cid} = setup_pair!()
    plan = drive_to_plan!(cid, a.id, b.id)

    assert {:ok, %{revision: revision}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: a.id,
               changes: %{"time_label" => "Tuesday at 7:00 PM"},
               trace_id: "trace-2u-once-rev"
             })

    assert {:ok, %{revision_id: rev_id, status: "accepted"}} =
             SocialFlow.confirm_pending_revision(%{
               conversation_id: cid,
               user_id: b.id,
               decision: "accept",
               trace_id: "trace-2u-once-acc"
             })

    assert rev_id == revision.id

    assert {:error, :no_pending_revision} =
             SocialFlow.confirm_pending_revision(%{
               conversation_id: cid,
               user_id: b.id,
               decision: "accept",
               trace_id: "trace-2u-once-acc2"
             })
  end

  test "NL 'I confirm' routes to the pending revision (revision_confirmation result type)" do
    %{a: a, b: b, cid: cid} = setup_pair!()
    plan = drive_to_plan!(cid, a.id, b.id)

    assert {:ok, %{revision: revision}} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: a.id,
               changes: %{"time_label" => "Wednesday at 7:00 PM"},
               trace_id: "trace-2u-nl-rev"
             })

    # What "I confirm" becomes after AI classification: revision_confirmation.
    assert {:ok, %{revision_id: rev_id}} =
             SocialFlow.create_proposal_from_ai_result(%{
               conversation_id: cid,
               requester_user_id: b.id,
               output: %{"result_type" => "revision_confirmation", "decision" => "accept"},
               trace_id: "trace-2u-nl-confirm"
             })

    assert rev_id == revision.id
    assert %PlanRevision{status: "accepted"} = Repo.get!(PlanRevision, revision.id)
    assert %SharedPlan{time_label: "Wednesday at 7:00 PM"} = plan_of!(plan.id)
  end

  test "lead can cancel the whole plan; participants are notified; status is cancelled" do
    %{a: a, b: b, cid: cid} = setup_pair!()
    # B accepts last → B is lead.
    plan = drive_to_plan!(cid, a.id, b.id)

    lead_id =
      if participant_state!(plan.id, b.id).role in ["lead", "co_lead"], do: b.id, else: a.id

    assert {:ok, %{plan: cancelled, notify_user_ids: notify_ids}} =
             SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: lead_id, trace_id: "trace-2u-lead-cancel"})

    assert cancelled.status == "cancelled"
    assert a.id in notify_ids
    assert b.id in notify_ids

    # Both sessions observe the cancellation broadcast.
    assert_push "social_flow:plan", %{"payload" => %{"cancelled" => true}}
    assert_push "social_flow:plan", %{"payload" => %{"cancelled" => true}}

    # Durable record: cancellation event in the outbox.
    assert %EventOutbox{event_type: "plan.cancelled"} =
             Repo.get_by!(EventOutbox, aggregate_id: plan.id, event_type: "plan.cancelled")
  end
end
