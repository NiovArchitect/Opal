defmodule OpalCore.Repair17W4FlowsTest do
  @moduledoc """
  Repair #17 (W4) — backend conversation coherence.

  Founder phone-walk failures, proven on the real backend path:
  1. Change-time two-party flow in a peer thread (propose → confirm).
  2. Center outstanding-question answer consumption.
  3. No stale resurrection from a bare "Yes".
  4. New date-night request creates + drives a NEW plan.
  5. Fuzzy named-venue search ("Dave & Busters near me").
  6. Center now-strip data from live plan state.
  7. Opal chat sessions (list / new / clear / switch, owner-scoped).
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.{NowStrip, PlanContextPatch, PlanningContext}
  alias OpalCore.Intelligence.{ActionLog, Extractor}
  alias OpalCore.Messages
  alias OpalCore.MultiuserHarness
  alias OpalCore.OpalConversations
  alias OpalCore.OpalIntent
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{ConversationAlignment, PlanRevision, SharedPlan}

  defp mk_user(name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r17w4-#{Ecto.UUID.generate()}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp rand_name(base), do: base <> "-" <> (:crypto.strong_rand_bytes(2) |> Base.encode16())

  defp latest_action_result do
    from(l in ActionLog, order_by: [desc: l.inserted_at], limit: 1)
    |> Repo.one()
    |> case do
      %ActionLog{result: result} -> result || %{}
      _ -> %{}
    end
  end

  defp plan_count(user_id) do
    from(p in SharedPlan, where: p.created_by_user_id == ^user_id)
    |> Repo.aggregate(:count, :id)
  end

  # ------------------------------------------------------------------ item 1
  describe "item 1 — change-time two-party flow (peer thread)" do
    test "extractor: founder phrasings classify as change / confirm" do
      {intent, entities, _} =
        Extractor.classify_message("Let's change the time for Juniper and Ivy at 8pm")

      assert intent == "plan.change_time"
      assert entities["new_time"] == "8:00 PM"

      {confirm_intent, _, _} = Extractor.classify_message("confirm 8 PM")
      assert confirm_intent == "plan.confirm"
    end

    test "non-lead change proposes a revision; the other party's confirm moves the plan everywhere" do
      founder = MultiuserHarness.account!(%{display_name: rand_name("Founder")})
      chanelle = MultiuserHarness.account!(%{display_name: rand_name("Chanelle")})

      # Chanelle is the plan's lead/creator; the founder is a participant.
      plan =
        MultiuserHarness.create_shared_plan!(chanelle.id, [founder.id], %{
          title: "Juniper and Ivy",
          time_label: "Sat 7:30 PM",
          status: "agreed"
        })

      conv_id = plan.conversation_id
      Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv_id}")

      # Founder asks to change the time, in the thread, with the founder's
      # exact phrasing.
      assert {:ok, _msg, :created} =
               Messages.accept_message(%{
                 conversation_id: conv_id,
                 sender_user_id: founder.id,
                 client_message_id: "r17-#{Ecto.UUID.generate()}",
                 message_type: "text",
                 body: "Let's change the time for Juniper and Ivy at 8pm"
               })

      # A real revision proposal now exists; the plan has NOT moved.
      revision =
        Repo.one!(
          from(r in PlanRevision, where: r.plan_id == ^plan.id and r.status == "proposed")
        )

      assert revision.proposed_changes["time_label"] == "8:00 PM"
      assert revision.proposed_by_user_id == founder.id
      assert chanelle.id in (revision.required_approvals || [])
      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"

      # The Opal copy told the truth: proposing, awaiting their confirmation.
      result = latest_action_result()
      assert result["proposed"] == true
      body = result["body"] || ""
      assert body =~ "Proposing"
      assert body =~ "8:00 PM"
      assert body =~ "until they confirm"
      refute body =~ "Done — moved"

      # Projections surface the pending revision, not "7:30 locked".
      assert {:ok, sync} = SocialFlow.sync_for_user(conv_id, chanelle.id)
      assert Enum.any?(sync["pending_revisions"], fn r -> r["id"] == revision.id end)

      alignment = ConversationAlignment.sync_conversation(conv_id)
      assert alignment["pending_revision"]["proposed_time_label"] == "8:00 PM"
      assert alignment["pending_revision"]["status"] == "awaiting_confirmation"

      if is_map(alignment["plan_set_event"]) do
        assert alignment["plan_set_event"]["superseded_by_pending_revision"] == true
      end

      # The other party confirms with the founder's exact follow-up wording.
      assert {:ok, _msg2, :created} =
               Messages.accept_message(%{
                 conversation_id: conv_id,
                 sender_user_id: chanelle.id,
                 client_message_id: "r17-#{Ecto.UUID.generate()}",
                 message_type: "text",
                 body: "confirm 8 PM"
               })

      # The SAME plan row mutated to 8:00 PM.
      assert Repo.get!(SharedPlan, plan.id).time_label == "8:00 PM"
      assert Repo.get!(PlanRevision, revision.id).status == "accepted"

      # Every projection reads 8:00 PM from that same row.
      assert {:ok, plans_a} = SocialFlow.list_plans_for_user(founder.id)
      assert Enum.find(plans_a, &(&1["id"] == plan.id))["time_label"] == "8:00 PM"

      assert {:ok, sync2} = SocialFlow.sync_for_user(conv_id, founder.id)
      assert Enum.find(sync2["plans"], &(&1["id"] == plan.id))["time_label"] == "8:00 PM"
      assert sync2["pending_revisions"] == []

      alignment2 = ConversationAlignment.sync_conversation(conv_id)
      assert alignment2["pending_revision"] == nil
    end

    test "lead's own change still edits directly (the flow that already worked)" do
      lead = MultiuserHarness.account!(%{display_name: rand_name("Lead")})
      peer = MultiuserHarness.account!(%{display_name: rand_name("Peer")})

      plan =
        MultiuserHarness.create_shared_plan!(lead.id, [peer.id], %{
          title: "Saturday market",
          time_label: "Saturday 9:00 AM",
          status: "agreed"
        })

      assert {:ok, _msg, :created} =
               Messages.accept_message(%{
                 conversation_id: plan.conversation_id,
                 sender_user_id: lead.id,
                 client_message_id: "r17-#{Ecto.UUID.generate()}",
                 message_type: "text",
                 body: "move it to 10:30 AM"
               })

      assert Repo.get!(SharedPlan, plan.id).time_label =~ "10:30"
    end
  end

  # --------------------------------------------------------------- items 2/3
  describe "items 2/3 — Center outstanding questions and stale resurrection" do
    test "founder sequence: Maya birthday → category question → 'Food' continues the flow" do
      user = mk_user(rand_name("Center"))

      {:ok, {_c, _u, _m1}} =
        OpalConversations.create_user_message(user.id, "Plan a birthday celebration for Maya")

      {:ok, {_c, _u, gate}} =
        OpalConversations.create_user_message(user.id, "Find something near me")

      assert gate.body =~ "food, outdoors, or nightlife"

      ctx = PlanningContext.get_for_user(user.id)
      assert PlanningContext.outstanding_question(ctx)["kind"] == "category"

      {:ok, {_c, _u, answer}} = OpalConversations.create_user_message(user.id, "Food")

      # The answer was consumed in flow — never the sticky re-engagement.
      refute answer.body =~ "You mentioned"
      refute answer.body =~ "keep going on that, or something new"
      assert answer.body =~ "Food it is"
      assert answer.body =~ "Maya"

      ctx2 = PlanningContext.get_for_user(user.id)
      assert ctx2["category"] == "food"
      assert PlanningContext.outstanding_question(ctx2) == nil
      assert answer.metadata["action_state"] == "outstanding_answered"
    end

    test "bare 'Yes' after a derailment never resurrects a stale plan" do
      user = mk_user(rand_name("Stale"))

      {:ok, {_c, _u, ask}} =
        OpalConversations.create_user_message(user.id, "Plan dinner with Maya Friday")

      assert ask.body =~ "Want me to set this up?"
      before = plan_count(user.id)

      # Derailment: an unrelated Opal turn intervenes.
      {:ok, {_c, _u, _cap}} =
        OpalConversations.create_user_message(user.id, "What can you help with?")

      {:ok, {_c, _u, yes}} = OpalConversations.create_user_message(user.id, "Yes")

      assert plan_count(user.id) == before
      refute yes.body =~ "is set up"
      refute yes.body =~ "It's on your Graph"
    end

    test "intent layer: an ask superseded by an unrelated opal turn is not pending" do
      history = [
        %{role: "user", body: "Plan dinner with Maya Friday"},
        %{
          role: "opal",
          body: "Got it: dinner Friday with Maya. Want me to set this up?",
          intent: %{
            "intent" => "plan_create",
            "entities" => %{"what" => "dinner", "when" => "Friday", "who" => ["Maya"]}
          }
        },
        %{role: "user", body: "What can you help with?"},
        %{
          role: "opal",
          body: "I can help you plan what's next.",
          intent: %{"intent" => "chat", "entities" => %{}}
        }
      ]

      assert {:ok, %{intent: intent}} =
               OpalIntent.classify("yes", %{conversation_history: history})

      assert intent != :plan_confirm
    end
  end

  # ------------------------------------------------------------------ item 4
  describe "item 4 — new date-night request creates a new plan" do
    test "'Schedule a date night…' is not answered as an update to the sticky plan" do
      user = mk_user(rand_name("Dater"))

      # Existing confirmed plan + fresh sticky plan_id (the hijack setup).
      {:ok, {_c, _u, _ask}} =
        OpalConversations.create_user_message(user.id, "Plan dinner with Maya Friday")

      {:ok, {_c, _u, done}} = OpalConversations.create_user_message(user.id, "yes")
      assert done.body =~ "Done"
      old_plan_id = done.metadata["intent"]["entities"]["plan_id"]
      assert is_binary(old_plan_id)
      old_label = Repo.get!(SharedPlan, old_plan_id).time_label
      before = plan_count(user.id)

      {:ok, {_c, _u, reply}} =
        OpalConversations.create_user_message(
          user.id,
          "Schedule a date night with Chanelle tonight at 5 PM and Oceanside for Italian food"
        )

      refute reply.body =~ "Same plan, same people"
      refute reply.body =~ "Updated —"
      # The old plan was not mutated by the new request.
      assert Repo.get!(SharedPlan, old_plan_id).time_label == old_label

      {:ok, {_c, _u, confirm}} = OpalConversations.create_user_message(user.id, "yes")

      assert plan_count(user.id) == before + 1
      new_plan_id = confirm.metadata["intent"]["entities"]["plan_id"]
      assert is_binary(new_plan_id)
      assert new_plan_id != old_plan_id

      new_plan = Repo.get!(SharedPlan, new_plan_id)
      # PlanCompletion drove the new plan: completion steps are persisted
      # on the plan row itself.
      steps = get_in(new_plan.alignment, ["completion", "steps"]) || []
      assert Enum.any?(steps, fn s -> s["id"] == "calendar" and s["status"] == "projected" end)
    end
  end

  # ------------------------------------------------------------------ item 5
  describe "item 5 — fuzzy named-venue search" do
    test "extraction: 'Let's do Dave & Busters near me' is a named venue" do
      assert %{name: "Dave & Busters", locality: nil} =
               PlanContextPatch.extract_exact_venue("Let's do Dave & Busters near me")
    end

    test "fuzzy matching: apostrophe-less / & forms match the canonical chain name" do
      assert PlanContextPatch.venue_names_match?("Dave & Busters", "Dave & Buster's")
      assert PlanContextPatch.venue_names_match?("Dave & Busters", "Dave and Buster's")
      assert PlanContextPatch.venue_names_match?("dave & busters", "Dave & Buster’s")
      refute PlanContextPatch.venue_names_match?("Dave & Busters", "Nighthawk")
    end

    test "Center turn routes to named-venue search, not the location gate" do
      user = mk_user(rand_name("Venue"))

      {:ok, {_c, _u, reply}} =
        OpalConversations.create_user_message(user.id, "Let's do Dave & Busters near me")

      refute reply.body =~ "food, outdoors, or nightlife"
      assert reply.body =~ "Dave & Busters"
      assert reply.body =~ "rank by distance"

      job =
        Repo.one(
          from(j in OpalCore.Center.ProviderActionJob,
            where: j.user_id == ^user.id,
            order_by: [desc: j.inserted_at],
            limit: 1
          )
        )

      assert job != nil
      assert job.request["search_mode"] == "exact_entity"
      assert job.request["requested_venue_name"] == "Dave & Busters"
    end
  end

  # ------------------------------------------------------------------ item 6
  describe "item 6 — Center now-strip data from live plan state" do
    test "plan events come from the plan's calendar projection; reschedule moves them" do
      user = mk_user(rand_name("Strip"))
      now = DateTime.utc_now() |> DateTime.truncate(:second)
      from_at = DateTime.add(now, -4 * 3600, :second)
      to_at = DateTime.add(now, 20 * 3600, :second)

      assert NowStrip.plan_events(user.id, from_at, to_at) == []

      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Juniper and Ivy",
          "place" => "Oceanside",
          "time_label" => "Sat 7:30 PM"
        })

      start = DateTime.add(now, 2 * 3600, :second)

      plan
      |> SharedPlan.changeset(%{
        "start_at" => start,
        "end_at" => DateTime.add(start, 3600, :second)
      })
      |> Repo.update!()

      {:ok, _} =
        OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(Repo.get!(SharedPlan, plan.id))

      events = NowStrip.plan_events(user.id, from_at, to_at)
      assert [%{"plan_id" => pid, "title" => "Juniper and Ivy", "source" => "plan"}] = events
      assert pid == plan.id
      {:ok, event_start, _} = DateTime.from_iso8601(hd(events)["start_at"])
      assert DateTime.compare(event_start, start) == :eq

      # Another user's strip never shows this plan.
      other = mk_user(rand_name("Other"))
      assert NowStrip.plan_events(other.id, from_at, to_at) == []
    end
  end

  # ------------------------------------------------------------------ item 7
  describe "item 7 — Opal chat sessions" do
    test "new chat archives the prior session; list/switch/clear are real and owner-scoped" do
      user = mk_user(rand_name("Sessions"))
      other = mk_user(rand_name("Intruder"))

      {:ok, {_c, _u, _m}} =
        OpalConversations.create_user_message(user.id, "Plan dinner with Maya Friday")

      {:ok, first} = OpalConversations.get_or_create_conversation(user.id)
      assert OpalConversations.list_messages(first.id) != []

      # NEW: fresh active session; prior retained in the list.
      assert {:ok, %{conversation: fresh, archived_conversation_id: archived_id}} =
               OpalConversations.start_new_chat(user.id)

      assert fresh.id != first.id
      assert archived_id == first.id
      assert OpalConversations.list_messages(fresh.id) == []
      assert OpalConversations.list_messages(first.id) != []

      sessions = OpalConversations.list_sessions(user.id)
      assert length(sessions) == 2
      assert hd(sessions)["id"] == fresh.id
      assert hd(sessions)["active"] == true
      archived = Enum.find(sessions, &(&1["id"] == first.id))
      assert archived["archived"] == true
      assert archived["message_count"] >= 2

      # Cross-account: the intruder sees none of these sessions and cannot
      # switch to or clear them.
      assert OpalConversations.list_sessions(other.id) == []
      assert {:error, :not_found} = OpalConversations.switch_conversation(other.id, first.id)
      assert {:error, :not_found} = OpalConversations.clear_conversation_by_id(other.id, first.id)
      assert OpalConversations.list_messages(first.id) != []

      # SWITCH back: the archived session becomes active again, intact.
      assert {:ok, switched} = OpalConversations.switch_conversation(user.id, first.id)
      assert switched.id == first.id
      assert OpalConversations.get_active_conversation(user.id).id == first.id
      assert OpalConversations.list_messages(first.id) != []

      # CLEAR: messages of that session are really gone.
      assert {:ok, %{deleted_messages: n}} =
               OpalConversations.clear_conversation_by_id(user.id, first.id)

      assert n >= 2
      assert OpalConversations.list_messages(first.id) == []
    end
  end
end
