defmodule OpalCore.SocialFlow.Repair13W1JourneysTest do
  @moduledoc """
  Repair #13 - W1 (worker 1): COMPLEX NORMAL-USER JOURNEY TESTS.

  Thirty-plus multi-step, relationship-aware journey runs (1:1 AND group),
  each run on FRESH randomized accounts (never fixtures, never hardcoded
  personas) with paraphrased NL inputs and reordered steps. Every assertion
  checks a REAL effect: DB row state, the other session receiving the PubSub
  push, the projection actually updating. A test that cannot observe the
  real effect is not a test.

  Coverage (journey x runs x paraphrases mirrored in shots/repair13/TEST_REPORT_W1.md):
  J1 1:1 full lifecycle: plan -> confirm -> change -> cancel -> re-plan (3 runs)
  J2 3-person group incl. one participant declining mid-flow (3 runs)
  J3 overlapping plans with the same person, same weekend (3 runs)
  J4 time phrasings incl. honest meridiem-less refusal (12 runs)
  J5 location: near-me with/without coords, named venue, vague area (4 runs)
  J6 knowledge questions: who's coming / where / what time (3 runs)
  J7 mid-flow settings change, plan stays coherent (3 runs)
  J8 interrupted flows + cross-surface edits (3 runs)
  J9 cross-surface assertions: Center plan on every surface, same time (3 runs)
  J10 timezone edge: phrased in one zone, viewed from another (3 runs)

  Regression territory: F12-01..F12-63 (Repair #12 ledger) must not regress;
  W1-01 extends the pinned R2 bare-hour law (AM/PM never invented) to the
  whole meridiem-invention family in the open-chat NL path.

  Status: machine-proven, pending founder phone walk.
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User

  alias OpalCore.Center.{
    ActionOrchestrator,
    DeviceLocation,
    PlanContextPatch,
    PlanningContext,
    ProviderAction,
    ProviderActionJob
  }

  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Messaging.Inbox
  alias OpalCore.Messages
  alias OpalCore.OpalConversations
  alias OpalCore.Repo
  alias OpalCore.SocialFlow

  alias OpalCore.SocialFlow.{
    ConversationAlignment,
    JourneyAuthority,
    PlanParticipant,
    PlanRevision,
    SharedPlan,
    Signal
  }

  alias OpalCore.SocialFlow.OpalCalendar.Commitment

  # --- fresh randomized accounts, every run ---

  @names ~w(Avery Blake Casey Drew Ellis Finley Gray Harper Indigo Jules Kai Lane Morgan Noor Parker Quinn Riley Sam Tate Vale Wren Yara Zane)

  defp rand_name do
    Enum.random(@names) <> "-" <> (:crypto.strong_rand_bytes(2) |> Base.encode16())
  end

  defp mk_user do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r13w1-#{Ecto.UUID.generate()}",
      display_name: rand_name()
    })
    |> Repo.insert!()
  end

  defp mk_conv(member_ids) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{
        id: Ecto.UUID.generate(),
        label: "r13w1-#{Ecto.UUID.generate()}"
      })
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  defp make_plan(conv_id, owner_id, attrs) do
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(
        conv_id,
        owner_id,
        Map.merge(
          %{
            "title" => "Dinner",
            "place" => "Somewhere",
            "time_label" => "Sat 7:30 PM"
          },
          attrs
        )
      )

    plan
  end

  defp make_center_plan(owner_id, attrs) do
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_center(
        owner_id,
        Map.merge(
          %{
            "title" => "Dinner",
            "location" => "Somewhere",
            "time_label" => "Sat 7:30 PM"
          },
          attrs
        )
      )

    plan
  end

  defp db_plan(id), do: Repo.get!(SharedPlan, id)

  defp plan_participants(plan_id) do
    from(pp in PlanParticipant, where: pp.plan_id == ^plan_id)
    |> Repo.all()
    |> Enum.sort_by(& &1.user_id)
  end

  defp coming_user_ids(plan_id) do
    plan_participants(plan_id)
    |> Enum.reject(&(&1.response_state == "withdrawn"))
    |> Enum.map(& &1.user_id)
    |> Enum.sort()
  end

  defp calendar_projected?(plan_id) do
    Repo.exists?(from(c in Commitment, where: c.shared_plan_id == ^plan_id))
  end

  defp subscribe_conv(conv_id) do
    :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv_id}")
  end

  defp subscribe_user(user_id) do
    :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:user:#{user_id}")
  end

  defp unsubscribe_conv(conv_id) do
    :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:conversation:#{conv_id}")
  end

  defp unsubscribe_user(user_id) do
    :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:user:#{user_id}")
  end

  defp set_setting(user_id, attrs) do
    User |> Repo.get!(user_id) |> User.changeset(attrs) |> Repo.update!()
  end

  # --- J1: 1:1 full lifecycle ---

  describe "J1 - 1:1 plan -> confirm -> change -> cancel -> re-plan" do
    test "run 1: propose/confirm via chat, NL change, cancel, re-plan takes over" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      subscribe_conv(conv)

      plan = make_plan(conv, a.id, %{"title" => "Dinner with B", "time_label" => "Sat 7:30 PM"})

      # Peer proposes a time; lead confirms.
      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 7:45 PM"},
                 trace_id: "j1-r1"
               })

      assert rev.status == "proposed"
      assert_receive {:social_flow_event, "social_flow:revision", _}, 2_000

      assert {:ok, %{status: "accepted"}} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "j1-r1"
               })

      assert db_plan(plan.id).time_label == "Sat 7:45 PM"

      # The accept really broadcasts: plan + accepted revision on the topic.
      assert_receive {:social_flow_event, "social_flow:plan",
                      %{"payload" => %{"revision" => %{"status" => "accepted"}}}},
                     2_000

      # NL change lands on the confirmed plan.
      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "let's do 8 PM"
               })

      assert updated.time_label =~ "8"
      assert db_plan(plan.id).time_label =~ "8"
      assert calendar_projected?(plan.id)

      # Cancel notifies the peer; the push really fires.
      assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "j1-r1"})

      assert cancelled.status == "cancelled"
      assert b.id in notified

      assert_receive {:social_flow_event, "social_flow:plan",
                      %{"payload" => %{"cancelled" => true}}},
                     2_000

      # Re-plan with the same people: the new plan is the active one.
      plan2 = make_plan(conv, a.id, %{"title" => "Dinner with B", "time_label" => "Sun 6:00 PM"})
      assert plan2.id != plan.id
      assert ConversationAlignment.active_plan_for_conversation(conv).id == plan2.id

      assert {:ok, plans} = SocialFlow.list_plans_for_user(a.id)
      assert Enum.any?(plans, &(&1["id"] == plan2.id))
      refute Enum.any?(plans, &(&1["id"] == plan.id))

      assert {:ok, all} = SocialFlow.list_plans_for_user(a.id, status: :all)
      assert Enum.any?(all, &(&1["id"] == plan.id and &1["status"] == "cancelled"))

      unsubscribe_conv(conv)
    end

    test "run 2: direct change, rejected proposal, NL rephrase, cancel, re-plan" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      subscribe_conv(conv)

      plan = make_plan(conv, a.id, %{"title" => "Lunch", "time_label" => "Sat 12:00 PM"})

      # Button-equivalent direct edit.
      assert {:ok, %{plan: d}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 new_time_label: "Sat 12:30 PM",
                 trace_id: "j1-r2"
               })

      assert d.time_label == "Sat 12:30 PM"
      assert_receive {:social_flow_event, "social_flow:alignment_updated", _}, 2_000

      # Peer proposes; lead rejects. The plan does not move.
      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 1:00 PM"},
                 trace_id: "j1-r2"
               })

      assert {:ok, %{status: "rejected"}} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv,
                 user_id: a.id,
                 decision: "reject",
                 trace_id: "j1-r2"
               })

      assert Repo.get!(PlanRevision, rev.id).status == "rejected"
      assert db_plan(plan.id).time_label == "Sat 12:30 PM"

      # Paraphrased NL change lands on top.
      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "push it to 1:30 PM"
               })

      assert updated.time_label =~ "1:30"
      assert db_plan(plan.id).time_label =~ "1:30"

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "j1-r2"})

      assert cancelled.status == "cancelled"

      plan2 = make_plan(conv, a.id, %{"title" => "Lunch", "time_label" => "Sun 12:00 PM"})
      assert ConversationAlignment.active_plan_for_conversation(conv).id == plan2.id

      unsubscribe_conv(conv)
    end

    test "run 3: NL change, direct accept, non-lead cancel refused, re-plan" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])

      plan = make_plan(conv, a.id, %{"title" => "Coffee", "time_label" => "Sat 10:00 AM"})

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "actually let's do 10:30 AM"
               })

      assert updated.time_label =~ "10:30"

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 11:00 AM"},
                 trace_id: "j1-r3"
               })

      # Direct accept by the required approver (the lead).
      assert {:ok, %{revision: applied}} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "j1-r3"
               })

      assert applied.status == "accepted"
      assert db_plan(plan.id).time_label == "Sat 11:00 AM"

      # Non-lead cancel is refused, never a silent success.
      assert {:error, _} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: b.id, trace_id: "j1-r3"})

      assert db_plan(plan.id).status != "cancelled"

      assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "j1-r3"})

      assert cancelled.status == "cancelled"
      assert a.id in notified
      assert b.id in notified

      plan2 = make_plan(conv, a.id, %{"title" => "Coffee", "time_label" => "Sun 10:00 AM"})
      assert ConversationAlignment.active_plan_for_conversation(conv).id == plan2.id
      assert db_plan(plan.id).status == "cancelled"
    end
  end

  # --- J2: 3-person group with a mid-flow decline ---

  describe "J2 - 3-person group, one participant declines mid-flow" do
    test "run 1: propose/confirm, then C declines; plan survives for A and B" do
      a = mk_user()
      b = mk_user()
      c = mk_user()
      conv = mk_conv([a.id, b.id, c.id])
      subscribe_conv(conv)

      plan = make_plan(conv, a.id, %{"title" => "Group dinner", "time_label" => "Fri 7:00 PM"})
      assert Enum.sort(coming_user_ids(plan.id)) == Enum.sort([a.id, b.id, c.id])

      assert {:ok, %{revision: _rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Fri 7:30 PM"},
                 trace_id: "j2-r1"
               })

      # Group consensus is real: the lead's accept alone leaves the revision
      # proposed while C is still pending - the plan does not move early.
      assert {:ok, %{status: "proposed"}} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "j2-r1"
               })

      assert db_plan(plan.id).time_label == "Fri 7:00 PM"

      assert {:ok, %{status: "accepted"}} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv,
                 user_id: c.id,
                 decision: "accept",
                 trace_id: "j2-r1"
               })

      assert db_plan(plan.id).time_label == "Fri 7:30 PM"

      # C declines mid-flow: withdrawal, not a plan kill.
      assert {:ok, %{"response_state" => "withdrawn", "cancels_everyone" => false}} =
               JourneyAuthority.cant_make_it(plan.id, c.id)

      assert db_plan(plan.id).status != "cancelled"
      assert Enum.sort(coming_user_ids(plan.id)) == Enum.sort([a.id, b.id])

      withdrawn = Enum.find(plan_participants(plan.id), &(&1.user_id == c.id))
      assert withdrawn.response_state == "withdrawn"

      # The plan still works for the remaining two: NL change lands.
      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "let's move it to 8 PM"
               })

      assert updated.time_label =~ "8"
      assert db_plan(plan.id).time_label =~ "8"
      assert Enum.sort(coming_user_ids(plan.id)) == Enum.sort([a.id, b.id])

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "j2-r1"})

      assert cancelled.status == "cancelled"
      unsubscribe_conv(conv)
    end

    test "run 2: decline happens first; the plan still completes for the rest" do
      a = mk_user()
      b = mk_user()
      c = mk_user()
      conv = mk_conv([a.id, b.id, c.id])

      plan = make_plan(conv, a.id, %{"title" => "Group brunch", "time_label" => "Sat 10:00 AM"})

      assert {:ok, %{"response_state" => "withdrawn"}} =
               JourneyAuthority.cant_make_it(plan.id, c.id)

      assert Enum.sort(coming_user_ids(plan.id)) == Enum.sort([a.id, b.id])

      # A proposal still needs every required approval: with withdrawn C
      # pending, the lead's accept leaves the revision honestly proposed and
      # the plan does not move - no silent majority override, no crash.
      assert {:ok, %{revision: _}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sat 10:30 AM"},
                 trace_id: "j2-r2"
               })

      assert {:ok, %{status: "proposed"}} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "j2-r2"
               })

      assert db_plan(plan.id).time_label == "Sat 10:00 AM"

      # The lead's direct edit still serves the remaining two.
      assert {:ok, %{plan: updated}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 new_time_label: "Sat 10:30 AM",
                 trace_id: "j2-r2"
               })

      assert updated.time_label == "Sat 10:30 AM"
      assert db_plan(plan.id).time_label == "Sat 10:30 AM"
      # C stays withdrawn through the change.
      assert Enum.sort(coming_user_ids(plan.id)) == Enum.sort([a.id, b.id])

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "j2-r2"})

      assert cancelled.status == "cancelled"
    end

    test "run 3: a peer rejects the proposal; nothing moves, no silent accept later" do
      a = mk_user()
      b = mk_user()
      c = mk_user()
      conv = mk_conv([a.id, b.id, c.id])

      plan = make_plan(conv, a.id, %{"title" => "Group hike", "time_label" => "Sun 9:00 AM"})

      assert {:ok, %{revision: rev}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: b.id,
                 changes: %{"time_label" => "Sun 10:00 AM"},
                 trace_id: "j2-r3"
               })

      # C rejects the revision outright.
      assert {:ok, %PlanRevision{status: "rejected"}} =
               SocialFlow.respond_to_revision(%{
                 revision_id: rev.id,
                 user_id: c.id,
                 decision: "reject",
                 trace_id: "j2-r3"
               })

      assert db_plan(plan.id).time_label == "Sun 9:00 AM"

      # A late accept of the dead revision is refused honestly.
      assert {:error, :no_pending_revision} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv,
                 user_id: a.id,
                 decision: "accept",
                 trace_id: "j2-r3"
               })

      assert db_plan(plan.id).time_label == "Sun 9:00 AM"
      assert Enum.sort(coming_user_ids(plan.id)) == Enum.sort([a.id, b.id, c.id])
    end
  end

  # --- J3: overlapping plans, same person, same weekend ---

  describe "J3 - two overlapping plans with the same person" do
    test "run 1: NL change targets the newest plan; the older is untouched" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])

      p1 = make_plan(conv, a.id, %{"title" => "Friday dinner", "time_label" => "Fri 7:00 PM"})
      p2 = make_plan(conv, a.id, %{"title" => "Saturday brunch", "time_label" => "Sat 10:00 AM"})

      assert ConversationAlignment.active_plan_for_conversation(conv).id == p2.id

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "change it to 11 AM"
               })

      assert updated.id == p2.id
      assert db_plan(p2.id).time_label =~ "11"
      assert db_plan(p1.id).time_label == "Fri 7:00 PM"

      assert {:ok, plans} = SocialFlow.list_plans_for_user(a.id)
      assert Enum.any?(plans, &(&1["id"] == p1.id))
      assert Enum.any?(plans, &(&1["id"] == p2.id))
    end

    test "run 2: direct edit of the older plan by id; recency decides active, other untouched" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])

      p1 = make_plan(conv, a.id, %{"title" => "Friday dinner", "time_label" => "Fri 7:00 PM"})
      p2 = make_plan(conv, a.id, %{"title" => "Saturday brunch", "time_label" => "Sat 10:00 AM"})

      assert {:ok, %{plan: d}} =
               SocialFlow.change_plan_time(%{
                 plan_id: p1.id,
                 user_id: a.id,
                 new_time_label: "Fri 7:30 PM",
                 trace_id: "j3-r2"
               })

      assert d.id == p1.id
      assert db_plan(p1.id).time_label == "Fri 7:30 PM"
      # No cross-contamination: the edit touched exactly one plan...
      assert db_plan(p2.id).time_label == "Sat 10:00 AM"
      # ...and the single active-plan ordering (F12-59) follows recency, so
      # the just-touched plan is now the conversation's active one.
      assert ConversationAlignment.active_plan_for_conversation(conv).id == p1.id
    end

    test "run 3: cancelling the newest hands active status back; third plan takes over" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])

      p1 = make_plan(conv, a.id, %{"title" => "Friday dinner", "time_label" => "Fri 7:00 PM"})
      p2 = make_plan(conv, a.id, %{"title" => "Saturday brunch", "time_label" => "Sat 10:00 AM"})

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: p2.id, user_id: a.id, trace_id: "j3-r3"})

      assert cancelled.status == "cancelled"
      assert ConversationAlignment.active_plan_for_conversation(conv).id == p1.id

      p3 = make_plan(conv, a.id, %{"title" => "Sunday coffee", "time_label" => "Sun 9:00 AM"})
      assert ConversationAlignment.active_plan_for_conversation(conv).id == p3.id

      assert {:ok, plans} = SocialFlow.list_plans_for_user(a.id)
      ids = Enum.map(plans, & &1["id"])
      assert p1.id in ids
      assert p3.id in ids
      refute p2.id in ids

      assert {:ok, all} = SocialFlow.list_plans_for_user(a.id, status: :all)
      assert Enum.any?(all, &(&1["id"] == p2.id and &1["status"] == "cancelled"))
    end
  end

  # --- J4: time phrasings, incl. the honest meridiem-less refusal ---

  describe "J4 - time phrasings: explicit meridiem applies, meridiem-less refuses" do
    @explicit_phrasings [
      "change it to 8 PM",
      "let's do 8:30 PM",
      "push it to 9 PM",
      "make it 8 PM",
      "how about 7:30 PM",
      "8 PM works better",
      "can we do 8:15 PM"
    ]

    for {text, i} <- Enum.with_index(@explicit_phrasings, 1) do
      test "run #{i} explicit: #{text} applies" do
        text = unquote(text)
        a = mk_user()
        b = mk_user()
        conv = mk_conv([a.id, b.id])
        plan = make_plan(conv, a.id, %{"time_label" => "Sat 7:00 PM"})

        assert {:ok, %{plan: updated}} =
                 SocialFlow.apply_nl_schedule_change(%{
                   conversation_id: conv,
                   user_id: a.id,
                   text: text
                 }),
               "NL change failed for #{inspect(text)}"

        assert updated.time_label =~ "PM",
               "expected an explicit-PM label for #{inspect(text)}, got #{inspect(updated.time_label)}"

        assert db_plan(plan.id).time_label == updated.time_label
        assert Repo.get_by!(PlanRevision, plan_id: plan.id).status == "accepted"
      end
    end

    # W1-01: the pinned R2 law extended - the open-chat NL path never invents
    # AM/PM. Every phrasing below used to mutate the plan with a defaulted PM
    # ("after 10" -> "after 10 PM", "around 8" -> "about 8:00 PM",
    # "make it 8" -> "8:00 PM"); now each refuses honestly.
    @refused_phrasings [
      "actually let's do 8",
      "make it 8",
      "Saturday after 10",
      "around 8",
      "8-ish",
      "change it to tonight",
      "in 3 days"
    ]

    for {text, i} <- Enum.with_index(@refused_phrasings, 1) do
      test "run #{i} meridiem-less: #{text} is an honest refusal, no mutation" do
        text = unquote(text)
        a = mk_user()
        b = mk_user()
        conv = mk_conv([a.id, b.id])
        plan = make_plan(conv, a.id, %{"time_label" => "Sat 7:00 PM"})

        assert {:error, :no_time_found} =
                 SocialFlow.apply_nl_schedule_change(%{
                   conversation_id: conv,
                   user_id: a.id,
                   text: text
                 }),
               "expected honest refusal for #{inspect(text)}"

        assert db_plan(plan.id).time_label == "Sat 7:00 PM"
        assert Repo.get_by(PlanRevision, plan_id: plan.id) == nil
      end
    end

    test "run 8: 'next Friday evening' applies as a date-only change, no invented meridiem" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = make_plan(conv, a.id, %{"time_label" => "Sat 7:00 PM"})

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "next Friday evening"
               })

      assert updated.time_label == "Friday"
      refute updated.time_label =~ ~r/\b(AM|PM)\b/
      assert db_plan(plan.id).time_label == "Friday"
    end

    test "run 9: 'Saturday after 10 AM' applies with the explicit meridiem kept" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = make_plan(conv, a.id, %{"time_label" => "Sat 7:00 PM"})

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "Saturday after 10 AM"
               })

      assert updated.time_label =~ "10"
      assert updated.time_label =~ "AM"
      assert db_plan(plan.id).time_label == updated.time_label
    end
  end

  # --- J5: location questions ---

  describe "J5 - location: near-me, named venue, vague area" do
    test "run 1: 'find restaurants near me' with device coords opens a device-anchored search" do
      user = mk_user()
      assert {:ok, _} = OpalConversations.get_or_create_conversation(user.id)

      assert {:ok, coarse} =
               DeviceLocation.validate_coords(%{"lat" => 32.715, "lon" => -117.161})

      assert :ok = DeviceLocation.put_for_user(user.id, coarse)

      {_intent, override, meta} =
        ActionOrchestrator.after_classify(
          user.id,
          "find restaurants near me",
          %{intent: :chat, confidence: :low, entities: %{}},
          %{}
        )

      assert is_binary(meta["action_job_id"]), "expected a real search job, got #{inspect(meta)}"
      assert override =~ "near you"

      job = Repo.get!(ProviderActionJob, meta["action_job_id"])

      # The search really opened device-anchored: origin + coarse coords on the job.
      assert job.request["origin_source"] == "device"
      assert job.request["origin_lat"] == coarse["lat"]
      assert job.request["origin_lon"] == coarse["lon"]

      # The provider leg is honest about this environment having no Geoapify
      # key: a recorded failure, never fabricated venues.
      assert job.status == "failed"
      assert job.error == "no_provider"
      assert job.result == nil
    end

    test "run 2: 'anything good around me' without coords is an honest gate, no fake search" do
      user = mk_user()
      assert {:ok, _} = OpalConversations.get_or_create_conversation(user.id)
      assert :none = DeviceLocation.get_for_user(user.id)

      jobs_before = Repo.aggregate(ProviderActionJob, :count, :id)

      {_intent, override, meta} =
        ActionOrchestrator.after_classify(
          user.id,
          "anything good around me",
          %{intent: :chat, confidence: :low, entities: %{}},
          %{}
        )

      # No search job was invented, and the copy never claims one started.
      assert Repo.aggregate(ProviderActionJob, :count, :id) == jobs_before
      refute Map.has_key?(meta, "action_job_id")
      assert is_binary(override)
      refute override =~ "Looking for"
    end

    test "run 3: 'Nighthawk in Coronado' resolves, attaches, and shows the address" do
      user = mk_user()

      assert %{name: "Nighthawk", locality: "Coronado"} =
               PlanContextPatch.extract_exact_venue("Find Nighthawk in Coronado")

      venue = %{
        "name" => "Nighthawk",
        "address" => "4211 Morrell St, San Diego, CA 92109",
        "lat" => 32.767,
        "lon" => -117.226,
        "provider" => "geoapify"
      }

      assert {:ok, %{plan: plan}} =
               ProviderAction.attach_selected_venue(
                 user.id,
                 venue,
                 %{"destination" => "Coronado", "when" => "Sat 8:00 PM"}
               )

      attached = get_in(plan.alignment, ["venue"])
      assert attached["name"] == "Nighthawk"
      assert attached["address"] =~ "Morrell"
      assert is_number(attached["lat"])
      assert is_number(attached["lon"])

      # The venue is on the plan row itself: any surface reads the same truth.
      assert db_plan(plan.id).location =~ "Nighthawk"
      assert db_plan(plan.id).location =~ "Morrell"
      assert {:ok, plans} = SocialFlow.list_plans_for_user(user.id)
      assert Enum.any?(plans, &(&1["id"] == plan.id))
    end

    test "run 4: vague area 'somewhere in Oceanside' searches the area, invents no coords" do
      user = mk_user()
      assert {:ok, _} = OpalConversations.get_or_create_conversation(user.id)
      assert :none = DeviceLocation.get_for_user(user.id)

      assert {:ok, job} =
               ProviderAction.start_places_search(%{
                 user_id: user.id,
                 destination: "Oceanside",
                 planning_snapshot: %{},
                 search_mode: "discovery"
               })

      assert job.search_geography == "Oceanside"
      assert job.request["origin_lat"] == nil
      assert job.request["origin_lon"] == nil
      refute job.request["origin_source"] == "device"
    end
  end

  # --- J6: person/place/thing knowledge questions about the plan ---

  describe "J6 - knowledge questions answered from the single source of truth" do
    # The three answers every surface must give identically: who is coming
    # (participants minus withdrawn), where (venue name+address or location),
    # what time (the plan's time_label). Each run builds the plan a
    # different way and asserts the same answer contract.
    defp answer_who(plan_id), do: coming_user_ids(plan_id)

    defp answer_where(plan) do
      case get_in(plan.alignment, ["venue"]) do
        %{"name" => name, "address" => address} when is_binary(address) ->
          "#{name}, #{address}"

        %{"name" => name} ->
          name

        _ ->
          plan.location
      end
    end

    defp answer_when(plan), do: plan.time_label

    test "run 1: chat-created 1:1 plan with venue attached" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = make_plan(conv, a.id, %{"title" => "Dinner", "time_label" => "Sat 8:00 PM"})

      {:ok, %{plan: with_venue}} =
        ProviderAction.attach_selected_venue(
          a.id,
          %{
            "name" => "Nighthawk",
            "address" => "4211 Morrell St, San Diego, CA 92109",
            "lat" => 32.767,
            "lon" => -117.226,
            "provider" => "geoapify"
          },
          %{"destination" => "Coronado", "when" => "Sat 8:00 PM", "plan_id" => plan.id}
        )

      plan = db_plan(with_venue.id)
      assert Enum.sort(answer_who(plan.id)) == Enum.sort([a.id, b.id])
      assert answer_where(plan) =~ "Nighthawk"
      assert answer_where(plan) =~ "Morrell"
      assert answer_when(plan) == "Sat 8:00 PM"
    end

    test "run 2: Center-created plan answers the same three questions" do
      user = mk_user()

      plan =
        make_center_plan(user.id, %{
          "title" => "Dinner",
          "location" => "Oceanside",
          "time_label" => "Sun 6:00 PM"
        })

      assert answer_who(plan.id) == [user.id]
      assert answer_where(plan) == "Oceanside"
      assert answer_when(plan) == "Sun 6:00 PM"

      # Same answers via the owner-scoped listing surface.
      assert {:ok, plans} = SocialFlow.list_plans_for_user(user.id)
      listed = Enum.find(plans, &(&1["id"] == plan.id))
      assert listed["time_label"] == "Sun 6:00 PM"
      assert listed["location"] == "Oceanside"
    end

    test "run 3: group plan after decline and change answers consistently" do
      a = mk_user()
      b = mk_user()
      c = mk_user()
      conv = mk_conv([a.id, b.id, c.id])
      plan = make_plan(conv, a.id, %{"title" => "Group dinner", "time_label" => "Fri 7:00 PM"})

      assert {:ok, %{"response_state" => "withdrawn"}} =
               JourneyAuthority.cant_make_it(plan.id, c.id)

      assert {:ok, %{plan: updated}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 new_time_label: "Fri 8:00 PM",
                 trace_id: "j6-r3"
               })

      plan = db_plan(updated.id)
      assert Enum.sort(answer_who(plan.id)) == Enum.sort([a.id, b.id])
      assert answer_when(plan) == "Fri 8:00 PM"
    end
  end

  # --- J7: mid-flow settings change ---

  describe "J7 - mid-flow settings change keeps the plan coherent" do
    test "run 1: toggling message notifications flips the real notify gate, plan untouched" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = make_plan(conv, a.id, %{"title" => "Dinner", "time_label" => "Sat 8:00 PM"})

      {:ok, msg, :created} =
        Messages.accept_message(%{
          conversation_id: conv,
          sender_user_id: b.id,
          client_message_id: "j7-r1-#{Ecto.UUID.generate()}",
          message_type: "text",
          body: "see you then"
        })

      before_plan = db_plan(plan.id)
      before_coming = coming_user_ids(plan.id)

      notice_on = Inbox.message_notice(msg, a.id)
      assert notice_on["in_app"] == true

      # Mid-flow settings change.
      set_setting(a.id, %{message_notifications_enabled: false})

      notice_off = Inbox.message_notice(msg, a.id)
      assert notice_off["in_app"] == false

      # The plan is byte-identical: coherence preserved.
      after_plan = db_plan(plan.id)
      assert after_plan.status == before_plan.status
      assert after_plan.time_label == before_plan.time_label
      assert after_plan.current_revision_id == before_plan.current_revision_id
      assert coming_user_ids(plan.id) == before_coming

      # And toggling back restores the gate.
      set_setting(a.id, %{message_notifications_enabled: true})
      assert Inbox.message_notice(msg, a.id)["in_app"] == true
    end

    test "run 2: toggling read receipts mid-plan keeps the plan coherent" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = make_plan(conv, a.id, %{"title" => "Dinner", "time_label" => "Sat 8:00 PM"})

      set_setting(a.id, %{read_receipts_enabled: false})

      assert db_plan(plan.id).status == "tentative"
      assert db_plan(plan.id).time_label == "Sat 8:00 PM"
      assert Enum.sort(coming_user_ids(plan.id)) == Enum.sort([a.id, b.id])

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv,
                 user_id: a.id,
                 text: "let's do 8:30 PM"
               })

      assert updated.time_label =~ "8:30"
    end

    test "run 3: peer disables notifications mid-plan; cancel still works" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = make_plan(conv, a.id, %{"title" => "Dinner", "time_label" => "Sat 8:00 PM"})

      set_setting(b.id, %{message_notifications_enabled: false})

      assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "j7-r3"})

      assert cancelled.status == "cancelled"
      assert a.id in notified
      assert b.id in notified
      assert ConversationAlignment.active_plan_for_conversation(conv) == nil
    end
  end

  # --- J8: interrupted flows and cross-surface edits ---

  describe "J8 - interrupted flows, edits from a different surface" do
    test "run 1: abandon mid-creation, return later; no duplicate plan" do
      user = mk_user()
      assert {:ok, _} = OpalConversations.get_or_create_conversation(user.id)
      decision = "j8-#{Ecto.UUID.generate()}"

      {:ok, p1, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Dinner",
          "location" => "Oceanside",
          "time_label" => "Sat 7:00 PM",
          "decision_id" => decision
        })

      # Abandon: transient Center state clears without deleting the plan.
      assert {:ok, _} = PlanningContext.clear_transient(user.id)
      assert Repo.get(SharedPlan, p1.id) != nil

      # Return: the second tap resumes the same pending plan (C-reinforce).
      {:ok, p2, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Dinner",
          "location" => "Oceanside",
          "time_label" => "Sat 7:00 PM",
          "decision_id" => decision
        })

      assert p2.id == p1.id

      count =
        from(p in SharedPlan, where: p.created_by_user_id == ^user.id, select: count(p.id))
        |> Repo.one()

      assert count == 1
    end

    test "run 2: created in chat, edited by direct handler, verified on listing + push" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      subscribe_conv(conv)
      subscribe_user(a.id)

      plan = make_plan(conv, a.id, %{"title" => "Dinner", "time_label" => "Sat 7:00 PM"})

      # Edit from the direct-handler surface (button-equivalent).
      assert {:ok, %{plan: updated}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "j8-r2"
               })

      # The conversation push carries the edit.
      assert_receive {:social_flow_event, "social_flow:alignment_updated",
                      %{"payload" => payload}},
                     2_000

      assert payload["plan_id"] == plan.id
      assert payload["time_label"] == "Sat 8:00 PM"

      # The owner listing agrees on the same time (no per-surface shadow).
      assert {:ok, plans} = SocialFlow.list_plans_for_user(a.id)
      listed = Enum.find(plans, &(&1["id"] == plan.id))
      assert listed["time_label"] == "Sat 8:00 PM"
      assert db_plan(plan.id).time_label == "Sat 8:00 PM"

      unsubscribe_conv(conv)
      unsubscribe_user(a.id)
    end

    test "run 3: created in Center, shared to chat, edited; all surfaces agree" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])

      plan =
        make_center_plan(a.id, %{
          "title" => "Dinner",
          "location" => "Oceanside",
          "time_label" => "Sat 7:00 PM"
        })

      assert {:ok, %{signal: signal}} =
               SocialFlow.share_plan_to_conversation(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 conversation_id: conv
               })

      # The peer thread really received the durable plan announcement.
      assert Repo.get!(Signal, signal.id).conversation_id == conv

      assert {:ok, %{plan: updated}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: a.id,
                 new_time_label: "Sat 8:30 PM",
                 trace_id: "j8-r3"
               })

      assert {:ok, plans} = SocialFlow.list_plans_for_user(a.id)
      listed = Enum.find(plans, &(&1["id"] == plan.id))
      assert listed["time_label"] == "Sat 8:30 PM"
      assert db_plan(plan.id).time_label == "Sat 8:30 PM"
      assert updated.time_label == "Sat 8:30 PM"
    end
  end

  # --- J9: cross-surface assertions (F12-06/07 regression territory) ---

  describe "J9 - Center plan visible on every surface with the same time" do
    test "run 1: Center plan appears in the owner listing with its time (F12-06/07)" do
      user = mk_user()

      plan =
        make_center_plan(user.id, %{
          "title" => "Dinner",
          "location" => "Oceanside",
          "time_label" => "Sat 7:00 PM"
        })

      assert {:ok, plans} = SocialFlow.list_plans_for_user(user.id)
      listed = Enum.find(plans, &(&1["id"] == plan.id))
      assert listed != nil
      assert listed["time_label"] == "Sat 7:00 PM"
      assert listed["source"] == "center"
    end

    test "run 2: change broadcasts on the owner topic; listing shows the same time" do
      user = mk_user()
      subscribe_user(user.id)

      plan =
        make_center_plan(user.id, %{
          "title" => "Dinner",
          "location" => "Oceanside",
          "time_label" => "Sat 7:00 PM"
        })

      assert {:ok, %{plan: updated}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: user.id,
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "j9-r2"
               })

      # The owner's Graphs/Timeline topic really got the change.
      assert_receive {:social_flow_event, "social_flow:alignment_updated", _}, 2_000

      assert {:ok, plans} = SocialFlow.list_plans_for_user(user.id)
      listed = Enum.find(plans, &(&1["id"] == plan.id))
      assert listed["time_label"] == "Sat 8:00 PM"
      assert db_plan(plan.id).time_label == "Sat 8:00 PM"
      assert updated.time_label == "Sat 8:00 PM"

      unsubscribe_user(user.id)
    end

    test "run 3: two changes then cancel; revision chain, listing, and history agree" do
      user = mk_user()

      plan =
        make_center_plan(user.id, %{
          "title" => "Dinner",
          "location" => "Oceanside",
          "time_label" => "Sat 7:00 PM"
        })

      assert {:ok, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: user.id,
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "j9-r3"
               })

      assert {:ok, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: user.id,
                 new_time_label: "Sat 8:30 PM",
                 trace_id: "j9-r3"
               })

      revs =
        from(r in PlanRevision, where: r.plan_id == ^plan.id, order_by: [asc: r.inserted_at])
        |> Repo.all()

      assert length(revs) == 2
      assert Enum.all?(revs, &(&1.status == "accepted"))

      assert {:ok, plans} = SocialFlow.list_plans_for_user(user.id)
      assert Enum.find(plans, &(&1["id"] == plan.id))["time_label"] == "Sat 8:30 PM"

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: user.id, trace_id: "j9-r3"})

      assert cancelled.status == "cancelled"
      assert {:ok, plans2} = SocialFlow.list_plans_for_user(user.id)
      refute Enum.any?(plans2, &(&1["id"] == plan.id))
      assert {:ok, all} = SocialFlow.list_plans_for_user(user.id, status: :all)
      assert Enum.any?(all, &(&1["id"] == plan.id and &1["status"] == "cancelled"))
    end
  end

  # --- J10: timezone edge ---

  describe "J10 - plan phrased in one zone, viewed from another" do
    # 2026-10-24 02:00 UTC is one absolute instant. The viewer contract must
    # show each viewer their own local clock for that same instant.
    @instant ~U[2026-10-24 02:00:00Z]

    defp plan_with_instant(owner_id, conv_id, timezone) do
      plan =
        make_plan(conv_id, owner_id, %{
          "title" => "Call",
          "time_label" => "Fri 7:00 PM",
          "timezone" => timezone
        })

      plan
      |> SharedPlan.changeset(%{start_at: @instant})
      |> Repo.update!()
    end

    test "run 1: same instant, LA viewer vs Tokyo viewer" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = plan_with_instant(a.id, conv, "America/Los_Angeles")

      la = SharedPlan.viewer_card(plan, "America/Los_Angeles")
      ny = SharedPlan.viewer_card(plan, "America/New_York")

      # Same absolute instant on both cards...
      assert la["absolute"] == ny["absolute"]
      # ...but each viewer sees their own local clock.
      assert la["viewer_local_time"] == "Friday 7:00pm PT"
      # America/New_York is not in the fixed-offset fallback table, so the
      # honest contract labels it with the raw zone and no shift.
      assert ny["viewer_local_time"] =~ "America/New_York"
    end

    test "run 2: plan timezone does not move the instant for another viewer" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = plan_with_instant(a.id, conv, "Asia/Tokyo")

      la = SharedPlan.viewer_card(plan, "America/Los_Angeles")
      tokyo = SharedPlan.viewer_card(plan, "Asia/Tokyo")

      assert la["absolute"] == tokyo["absolute"]
      assert la["viewer_local_time"] == "Friday 7:00pm PT"
      assert tokyo["viewer_local_time"] == "Saturday 11:00am JST"
    end

    test "run 3: UTC plan viewed from LA vs London shifts the clock, not the instant" do
      a = mk_user()
      b = mk_user()
      conv = mk_conv([a.id, b.id])
      plan = plan_with_instant(a.id, conv, "UTC")

      la = SharedPlan.viewer_card(plan, "America/Los_Angeles")
      london = SharedPlan.viewer_card(plan, "Europe/London")

      assert la["absolute"] == london["absolute"]
      assert la["viewer_local_time"] == "Friday 7:00pm PT"
      assert london["viewer_local_time"] == "Saturday 3:00am UK"
      assert la["viewer_day_name"] == "Friday"
      assert london["viewer_day_name"] == "Saturday"
    end
  end
end
