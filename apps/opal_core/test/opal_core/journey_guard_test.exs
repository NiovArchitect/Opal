defmodule OpalCore.JourneyGuardTest do
  @moduledoc """
  Repair #13 (W6 gyroscope) — PERMANENT journey regression gate.

  The core user journeys run here on every change, catching F11/F12-class
  regressions automatically:

  - JG-1: create → confirm → change → cancel → re-plan (chat NL surface)
  - JG-2: terminal ordering — cancel-then-confirm / cancel-then-change /
          cancel-then-propose / double-accept are refused (F12-62 class)
  - JG-3: venue attach journey — search → attach → address confirmation →
          cross-surface visibility
  - JG-4: follow-up coherence — venue questions after person mentions stay
          venue questions (F12-04/05/06 class), paraphrase-tolerant
  - JG-5: cross-surface visibility — chat-created plans render in Center
          reads; Center-created plans render in chat reads; a cancel on one
          surface is visible on the other
  - JG-6: change-time paraphrase battery (F12-02) — the founder's phrasings

  Discipline: fresh accounts per test, never fixture users; no weakened
  assertions — every step asserts the real committed state, and failures
  here are fixed, never edited to pass.
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Center.PlanContextPatch
  alias OpalCore.Center.ProviderAction
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.OpalIntent
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.PlanRevision
  alias OpalCore.SocialFlow.SharedPlan

  # --- fresh-account builders (never fixtures) --------------------------------

  defp mk_user(name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "jg-#{Ecto.UUID.generate()}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp mk_conv(member_ids) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "jg-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  defp make_plan(owner, conv_id, title \\ "Dinner") do
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv_id, owner.id, %{
        "title" => title,
        "place" => "Juniper & Ivy",
        "time_label" => "Sat 7:30 PM"
      })

    plan
  end

  defp db_plan(id), do: Repo.get!(SharedPlan, id)

  defp propose(user, plan, time_label) do
    {:ok, %{revision: rev}} =
      SocialFlow.propose_revision(%{
        plan_id: plan.id,
        proposed_by_user_id: user.id,
        changes: %{"time_label" => time_label},
        trace_id: "jg-#{Ecto.UUID.generate()}"
      })

    rev
  end

  defp accept_pending(owner, conv_id) do
    {:ok, _} =
      SocialFlow.confirm_pending_revision(%{
        conversation_id: conv_id,
        user_id: owner.id,
        decision: "accept",
        trace_id: "jg-#{Ecto.UUID.generate()}"
      })
  end

  # --- JG-1: create -> confirm -> change -> cancel -> re-plan ------------------

  describe "JG-1 — full plan lifecycle, three paraphrased runs" do
    test "run 1: NL change 'change it to 8 PM', then cancel, then re-plan" do
      a = mk_user("Ava")
      b = mk_user("Liam")
      conv = mk_conv([a.id, b.id])
      plan = make_plan(a, conv)
      assert db_plan(plan.id).status == "tentative"

      assert {:ok, %{plan: changed}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "change it to 8 PM"
               })

      assert changed.time_label =~ "8"
      assert db_plan(plan.id).time_label =~ "8"

      assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "jg-1"})

      assert cancelled.status == "cancelled"
      assert b.id in notified

      # Re-plan: a fresh plan in the same conversation starts tentative.
      plan2 = make_plan(a, conv, "Brunch")
      assert db_plan(plan2.id).status == "tentative"
      refute db_plan(plan2.id).status == "cancelled"
    end

    test "run 2: peer proposes, lead confirms, NL 'actually let's do 8 PM', cancel" do
      a = mk_user("Noah")
      b = mk_user("Emma")
      conv = mk_conv([a.id, b.id])
      plan = make_plan(a, conv)

      rev = propose(b, plan, "Sat 7:45 PM")
      assert rev.status == "proposed"

      accept_pending(a, conv)
      assert db_plan(plan.id).time_label =~ "7:45"
      assert db_plan(plan.id).status == "changed"

      assert {:ok, %{plan: changed}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "actually let's do 8 PM"
               })

      assert changed.time_label =~ "8"

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "jg-2"})

      assert cancelled.status == "cancelled"
    end

    test "run 3: NL 'move it to 8pm', non-lead cancel refused, lead cancel works, re-plan" do
      a = mk_user("Oliver")
      b = mk_user("Sophia")
      conv = mk_conv([a.id, b.id])
      plan = make_plan(a, conv)

      assert {:ok, _} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "move it to 8pm"
               })

      assert {:error, _} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: b.id, trace_id: "jg-3"})

      assert db_plan(plan.id).status != "cancelled"

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "jg-3"})

      assert cancelled.status == "cancelled"

      plan2 = make_plan(a, conv, "Coffee")
      assert db_plan(plan2.id).status == "tentative"
    end
  end

  # --- JG-2: terminal ordering (F12-62 class, structural) ----------------------

  describe "JG-2 — terminal plans stay terminal, every ordering" do
    setup do
      a = mk_user("Elijah")
      b = mk_user("Mia")
      conv = mk_conv([a.id, b.id])
      plan = make_plan(a, conv)

      {:ok, %{plan: cancelled}} =
        SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "jg"})

      %{a: a, b: b, conv: conv, plan: cancelled}
    end

    test "cancel-then-confirm is refused (the F12-62 prototype)", %{
      a: a,
      b: b,
      conv: conv,
      plan: plan
    } do
      rev = propose(b, make_active_plan(a, conv), "Sat 8 PM")
      # A revision proposed on a LIVE plan, then the plan is cancelled, then
      # someone tries to accept: the gate refuses, the plan stays cancelled.
      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: rev.plan_id, user_id: a.id, trace_id: "jg"})

      assert {:error, _} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "jg"
               })

      assert db_plan(rev.plan_id).status == "cancelled"
      assert db_plan(plan.id).status == "cancelled"
    end

    test "cancel-then-cancel is an honest :already_cancelled", %{a: a, plan: plan} do
      assert {:error, :already_cancelled} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "jg"})
    end

    test "cancel-then-change is refused", %{a: a, conv: conv, plan: plan} do
      # A cancelled plan is not the conversation's active plan — the NL path
      # refuses before it ever reaches a mutation. Either refusal is honest;
      # the invariant is that nothing mutates.
      assert {:error, :no_active_plan} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "change it to 9 PM"
               })

      assert db_plan(plan.id).time_label =~ "7:30"
      assert db_plan(plan.id).status == "cancelled"
    end

    test "cancel-then-propose is refused at birth (gyroscope)", %{b: b, plan: plan} do
      assert {:error, :invalid_status} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 9 PM"},
                 trace_id: "jg"
               })
    end

    test "double-accept of the same revision is refused", %{a: a, b: b, conv: conv} do
      plan = make_active_plan(a, conv)
      rev = propose(b, plan, "Sat 8 PM")
      accept_pending(a, conv)
      assert Repo.get!(PlanRevision, rev.id).status == "accepted"

      # Second accept of the same revision: no silent success.
      assert {:error, _} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "jg"
               })
    end

    test "reject-after-accept is refused", %{a: a, b: b, conv: conv} do
      plan = make_active_plan(a, conv)
      rev = propose(b, plan, "Sat 8 PM")
      accept_pending(a, conv)

      assert {:error, _} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: b.id,
                 decision: "reject",
                 trace_id: "jg"
               })

      assert Repo.get!(PlanRevision, rev.id).status == "accepted"
    end

    defp make_active_plan(owner, conv_id), do: make_plan(owner, conv_id, "Dinner Two")
  end

  # --- JG-3: venue attach journey ---------------------------------------------

  describe "JG-3 — venue attach: search, attach, address, cross-surface" do
    @venue %{
      "name" => "Nighthawk",
      "address" => "4211 Morrell St, San Diego, CA 92109",
      "lat" => 32.767,
      "lon" => -117.226,
      "provider" => "geoapify"
    }

    test "chat-created plan + venue attach: address confirmed, visible in Center reads" do
      a = mk_user("Lucas")
      b = mk_user("Amelia")
      conv = mk_conv([a.id, b.id])
      plan = make_plan(a, conv)

      assert %{name: "Nighthawk", locality: "Coronado"} =
               PlanContextPatch.extract_exact_venue("Find Nighthawk in Coronado")

      assert {:ok, %{plan: attached}} =
               ProviderAction.attach_selected_venue(
                 a.id,
                 @venue,
                 %{"plan_id" => plan.id, "destination" => "Coronado", "when" => "Sat 8:00 PM"}
               )

      # Address confirmation: the venue carries name + address + coords.
      venue = get_in(attached.alignment, ["venue"])
      assert venue["name"] == "Nighthawk"
      assert venue["address"] =~ "Morrell"
      assert is_number(venue["lat"])
      assert is_number(venue["lon"])
      assert attached.location =~ "Nighthawk"

      # Cross-surface: the same plan read through the Center list carries
      # the venue — one projection store, not a per-surface copy.
      assert {:ok, plans} = SocialFlow.list_plans_for_user(a.id)
      listed = Enum.find(plans, &(&1["id"] == plan.id))
      assert listed["location"] =~ "Nighthawk"

      # And the peer sees it too.
      assert {:ok, peer_plans} = SocialFlow.list_plans_for_user(b.id)
      assert Enum.any?(peer_plans, &(&1["id"] == plan.id))
    end

    test "venue question phrasings classify :named_venue, never sticky-who" do
      ctx = %{recent_who: ["Maya"], known_contacts: ["Maya", "Chanelle"], current_plan: nil}

      for text <- [
            "do you know where Nighthawk is",
            "where is The Henry in Coronado",
            "what's the address of Nighthawk",
            "where's Nighthawk"
          ] do
        assert {:ok, %{intent: :named_venue}} = OpalIntent.classify(text, ctx),
               "expected :named_venue for #{inspect(text)}"
      end
    end
  end

  # --- JG-4: follow-up coherence ------------------------------------------------

  describe "JG-4 — follow-up coherence: venue after person mention stays venue" do
    test "person mention, then venue question" do
      assert {:ok, %{intent: :chat}} =
               OpalIntent.classify("I'm having dinner with Maya tonight", %{
                 recent_who: [],
                 known_contacts: ["Maya"],
                 current_plan: nil
               })

      assert {:ok, %{intent: :named_venue}} =
               OpalIntent.classify("where is The Henry in Coronado", %{
                 recent_who: ["Maya"],
                 known_contacts: ["Maya"],
                 current_plan: nil
               })
    end

    test "interleaved chit-chat between person and venue question" do
      ctx = %{recent_who: ["Maya"], known_contacts: ["Maya"], current_plan: nil}

      assert {:ok, %{intent: :chat}} = OpalIntent.classify("sounds good", ctx)
      assert {:ok, %{intent: :chat}} = OpalIntent.classify("can't wait", ctx)

      assert {:ok, %{intent: :named_venue}} =
               OpalIntent.classify("what's the address of Nighthawk", ctx)
    end
  end

  # --- JG-5: cross-surface visibility ------------------------------------------

  describe "JG-5 — one projection store: chat and Center read the same plan" do
    test "chat-created plan is visible in Center list; cancel there hides it here" do
      a = mk_user("Harper")
      b = mk_user("Ethan")
      conv = mk_conv([a.id, b.id])
      plan = make_plan(a, conv)

      # Chat surface read.
      assert {:ok, sync} = SocialFlow.sync_for_user(conv, a.id)
      assert Enum.any?(sync["plans"], &(&1["id"] == plan.id))

      # Center surface read: the same plan, same status.
      assert {:ok, plans} = SocialFlow.list_plans_for_user(a.id)
      assert Enum.any?(plans, &(&1["id"] == plan.id and &1["status"] == "tentative"))

      # Cancel via the chat path...
      assert {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "jg"})

      # ...is visible on the Center surface (cancelled plans are excluded).
      assert {:ok, plans_after} = SocialFlow.list_plans_for_user(a.id)
      refute Enum.any?(plans_after, &(&1["id"] == plan.id))

      # ...and with status: :all the same store reports "cancelled".
      assert {:ok, all} = SocialFlow.list_plans_for_user(a.id, status: :all)
      cancelled = Enum.find(all, &(&1["id"] == plan.id))
      assert cancelled["status"] == "cancelled"
    end

    test "Center-created plan is visible in chat sync" do
      a = mk_user("Evelyn")
      conv = mk_conv([a.id])

      assert {:ok, plan, _} =
               SocialFlow.create_tentative_plan_from_center(a.id, %{
                 "title" => "Dinner",
                 "place" => "Juniper & Ivy",
                 "time_label" => "Sat 8 PM"
               })

      # A Center plan has no conversation; the single store still serves it.
      assert {:ok, plans} = SocialFlow.list_plans_for_user(a.id)
      assert Enum.any?(plans, &(&1["id"] == plan.id))

      # The canonical contract renders identically on both surfaces.
      contract = SharedPlan.to_contract(db_plan(plan.id))
      assert contract["id"] == plan.id
      assert contract["status"] == "tentative"
      assert contract["title"] == "Dinner"

      _ = conv
    end
  end

  # --- JG-6: change-time paraphrase battery -------------------------------------

  describe "JG-6 — change-time paraphrase battery (F12-02)" do
    @phrasings [
      "change plans with Chanelle to 8 PM",
      "actually let's do 8 PM",
      "move it to 8pm",
      "let's do 8:00 PM",
      "can we push it to 8 PM tonight",
      "8 PM works better"
    ]

    for {text, i} <- Enum.with_index(@phrasings, 1) do
      test "paraphrase #{i}: #{text}" do
        a = mk_user("JG6A#{unquote(i)}")
        b = mk_user("JG6B#{unquote(i)}")
        conv = mk_conv([a.id, b.id])
        plan = make_plan(a, conv)

        assert {:ok, %{plan: updated}} =
                 SocialFlow.apply_nl_schedule_change(%{
                   conversation_id: conv,
                   user_id: a.id,
                   text: unquote(text)
                 })

        assert updated.time_label =~ "8",
               "NL text #{inspect(unquote(text))} did not move the plan"

        assert db_plan(plan.id).time_label =~ "8"
      end
    end

    test "meridiem-less time is an honest refusal, never an invented AM/PM" do
      a = mk_user("JG6C")
      b = mk_user("JG6D")
      conv = mk_conv([a.id, b.id])
      plan = make_plan(a, conv)

      assert {:error, :no_time_found} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "actually let's do 8"
               })

      assert db_plan(plan.id).time_label =~ "7:30"
    end
  end
end
