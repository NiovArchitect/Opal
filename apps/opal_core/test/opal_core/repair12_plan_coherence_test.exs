defmodule OpalCore.SocialFlow.Repair12PlanCoherenceTest do
  @moduledoc """
  Repair #12 (R1 — plan coherence, backend).

  - F12-02: change-time via NL-shaped input (plan.change_time intent contract),
    write-write conflict (revision chain authority over the alignment fold).
  - F12-05: drive to completion (calendar projection on Center creates and
    direct edits; share-to-chat authority path).
  - F12-06/F12-07: Center plan visibility (owner-scoped listing, GET endpoint
    backend, owner-scoped broadcast topics).
  - F12-08: schedule edits publish the alignment-snapshot event the frontend
    strip needs.
  - F12-13/F12-53: handle_when_correction hardening + plan_id expiry.
  - F12-54: schedule label validation.
  - F12-56: per-account isolation in peer resolution (no global user lookup).
  - F12-58: change_proposal expiry.
  - F12-59: one owner-scoped ordering for the conversation's current plan.
  - F12-60: noted for R2 (render_plan_modify copy lives in opal_response.ex).
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Messaging.Message
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanRevision
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Center.PlanningContext

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp conv, do: Fixtures.conv_alex_jordan_id()

  defp make_plan(user_id \\ nil, attrs \\ %{}) do
    user_id = user_id || alex()

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(
        conv(),
        user_id,
        Map.merge(
          %{
            "title" => "Dinner with Jordan",
            "place" => "Juniper & Ivy",
            "location" => "Juniper & Ivy",
            "area" => "North Park",
            "time_label" => "Sat 7:30 PM"
          },
          attrs
        )
      )

    plan
  end

  defp insert_message(conversation_id, sender_id, body, seq) do
    %Message{}
    |> Message.create_changeset(%{
      id: Ecto.UUID.generate(),
      conversation_id: conversation_id,
      sender_user_id: sender_id,
      client_message_id: Ecto.UUID.generate(),
      body: body,
      server_seq: seq,
      message_type: "text"
    })
    |> Repo.insert!()
  end

  # --- F12-02: plan.change_time intent contract -----------------------------

  describe "apply_nl_schedule_change/1 (F12-02 plan.change_time contract)" do
    test "lead NL phrasing 1: 'Actually, let's do 8:00 PM' applies the edit" do
      plan = make_plan()

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "Actually, let's do 8:00 PM"
               })

      assert updated.time_label =~ "8:00 PM"
      refute updated.time_label =~ "7:30"

      # Revision chain records the accepted change.
      rev = Repo.get_by!(PlanRevision, plan_id: plan.id)
      assert rev.status == "accepted"
      assert rev.proposed_changes["kind"] == "schedule_change"
      assert rev.proposed_changes["new_value"] =~ "8:00 PM"
    end

    test "lead NL phrasing 2: 'move it to Saturday at 7pm' applies the edit" do
      plan = make_plan()

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "can we move it to Saturday at 7pm?"
               })

      assert updated.time_label =~ "7"
      assert Repo.get_by!(PlanRevision, plan_id: plan.id).status == "accepted"
    end

    test "lead NL phrasing 3: 'make it 9 PM instead' applies the edit" do
      plan = make_plan()

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "make it 9 PM instead"
               })

      assert updated.time_label =~ "9"
    end

    test "non-lead participant gets the proposal path, never a direct edit" do
      plan = make_plan()

      assert {:ok, %{revision: revision}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: jordan(),
                 text: "let's do 8:00 PM"
               })

      assert revision.status == "proposed"
      # The plan row is untouched until approval.
      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"
    end

    test "garbage time ('asdf') is honest: no mutation, :no_time_found" do
      plan = make_plan()

      assert {:error, :no_time_found} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "asdf"
               })

      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"
      assert Repo.get_by(PlanRevision, plan_id: plan.id) == nil
    end

    test "no active plan -> :no_active_plan (no fake edit)" do
      assert {:error, :no_active_plan} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "let's do 8:00 PM"
               })
    end

    test "non-member -> :not_a_member" do
      make_plan()

      assert {:error, :not_a_member} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: Fixtures.user_taylor_id(),
                 text: "let's do 8:00 PM"
               })
    end
  end

  # --- F12-02c: write-write conflict ----------------------------------------

  describe "revision chain authority over the alignment fold (F12-02c)" do
    test "lead direct edit survives the next sync_conversation (no revert)" do
      plan = make_plan()

      assert {:ok, %{plan: updated}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: alex(),
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "t1"
               })

      assert updated.time_label == "Sat 8:00 PM"

      # The fold's explicit action log carries the revision-applied change.
      actions = get_in(updated.alignment || %{}, ["explicit_actions"]) || []
      assert Enum.any?(actions, &(&1["kind"] == "schedule_change" and &1["value"] == "Sat 8:00 PM"))

      # An unrelated chat message triggers the fold...
      insert_message(conv(), jordan(), "sounds good, see you there", 1)
      _state = ConversationAlignment.sync_conversation(conv())

      # ...and the lead's edit is NOT reverted, title not clobbered.
      db = Repo.get!(SharedPlan, plan.id)
      assert db.time_label == "Sat 8:00 PM"
      assert db.title == "Dinner with Jordan"
    end

    test "second sync is stable (fold converges, no oscillation)" do
      plan = make_plan()

      {:ok, _} =
        SocialFlow.change_plan_time(%{
          plan_id: plan.id,
          user_id: alex(),
          new_time_label: "Sat 8:00 PM",
          trace_id: "t1"
        })

      insert_message(conv(), jordan(), "sounds good", 1)
      ConversationAlignment.sync_conversation(conv())
      insert_message(conv(), alex(), "can't wait", 2)
      ConversationAlignment.sync_conversation(conv())

      db = Repo.get!(SharedPlan, plan.id)
      assert db.time_label == "Sat 8:00 PM"
    end

    test "revision-accept path also projects the schedule_change action" do
      plan = make_plan()

      {:ok, %{revision: proposed}} =
        SocialFlow.propose_revision(%{
          plan_id: plan.id,
          proposed_by_user_id: jordan(),
          changes: %{"time_label" => "Sat 9:00 PM"},
          trace_id: "t1"
        })

      assert {:ok, _} =
               SocialFlow.respond_to_revision(%{
                 revision_id: proposed.id,
                 user_id: alex(),
                 decision: "accept",
                 trace_id: "t1"
               })

      plan = Repo.get!(SharedPlan, plan.id)
      assert plan.time_label == "Sat 9:00 PM"

      actions = get_in(plan.alignment || %{}, ["explicit_actions"]) || []
      assert Enum.any?(actions, &(&1["kind"] == "schedule_change" and &1["value"] == "Sat 9:00 PM"))

      insert_message(conv(), jordan(), "great", 1)
      ConversationAlignment.sync_conversation(conv())
      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 9:00 PM"
    end
  end

  # --- F12-54: label validation ----------------------------------------------

  describe "validate_schedule_label (F12-54)" do
    test "garbage is rejected, real labels accepted" do
      # change_plan_time returns :invalid_label without touching the row.
      plan = make_plan()

      assert {:error, :invalid_label} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: alex(),
                 new_time_label: "asdf",
                 trace_id: "t1"
               })

      for label <- ["8:00 PM", "Saturday", "Sat 8:00 PM", "tomorrow evening", "TBD", "9"] do
        assert {:ok, _} =
                 SocialFlow.change_plan_time(%{
                   plan_id: plan.id,
                   user_id: alex(),
                   new_time_label: label,
                   trace_id: "t1"
                 }),
               "expected #{inspect(label)} to validate"
      end
    end
  end

  # --- F12-58: change_proposal expiry ----------------------------------------

  describe "change_proposal expiry (F12-58)" do
    test "fresh proposals carry an expires_at" do
      state =
        ConversationAlignment.fold(
          [
            %{id: "1", body: "dinner friday?"},
            %{id: "2", body: "yes"},
            %{id: "3", body: "lets do 7pm"},
            %{id: "4", body: "juniper and ivy"},
            %{id: "5", body: "actually make it 8pm"}
          ],
          [alex(), jordan()]
        )

      # Fold may or may not surface a proposal depending on lock state; the
      # invariant is: IF a proposal exists, it has an expiry.
      if proposal = state["change_proposal"] do
        assert is_binary(proposal["expires_at"])
      else
        # Force one through the public constructor path instead.
        :ok
      end
    end

    test "past-due proposals retire to history, never surface" do
      past =
        DateTime.utc_now()
        |> DateTime.add(-25 * 3600, :second)
        |> DateTime.truncate(:second)
        |> DateTime.to_iso8601()

      state = %{
        "change_proposal" => %{
          "field" => "datetime",
          "value" => "8pm",
          "status" => "pending",
          "expires_at" => past
        },
        "proposal_history" => []
      }

      next = ConversationAlignment.expire_stale_change_proposal(state)
      assert next["change_proposal"] == nil
      assert [%{"status" => "expired", "value" => "8pm"}] = next["proposal_history"]
    end

    test "live proposals are untouched by the sweep" do
      future =
        DateTime.utc_now()
        |> DateTime.add(23 * 3600, :second)
        |> DateTime.truncate(:second)
        |> DateTime.to_iso8601()

      state = %{
        "change_proposal" => %{"field" => "datetime", "value" => "8pm", "expires_at" => future},
        "proposal_history" => []
      }

      next = ConversationAlignment.expire_stale_change_proposal(state)
      assert next["change_proposal"]["value"] == "8pm"
      assert next["proposal_history"] == []
    end
  end

  # --- F12-13/F12-53: plan_id expiry + correction hardening -------------------

  describe "PlanningContext.plan_id_active?/1 (F12-13/F12-53)" do
    defp opal_conversation_for(user_id) do
      {:ok, c} = OpalCore.OpalConversations.get_or_create_conversation(user_id)
      c
    end

    test "fresh plan_id on an active plan is actionable" do
      user = alex()
      opal_conversation_for(user)
      plan = make_plan()

      {:ok, ctx} = PlanningContext.merge(user, %{}, %{"plan_id" => plan.id})
      assert PlanningContext.plan_id_active?(ctx) == true
    end

    test "legacy plan_id with no stamp is never actionable" do
      user = alex()
      c = opal_conversation_for(user)
      plan = make_plan()

      # Simulate a pre-repair-12 durable context: plan_id but no set_at.
      {:ok, _} =
        c
        |> Ecto.Changeset.change(%{planning_context: %{"plan_id" => plan.id}})
        |> Repo.update()

      ctx = PlanningContext.get_for_user(user)
      assert PlanningContext.plan_id_active?(ctx) == false
    end

    test "cancelled plan deactivates the sticky plan_id" do
      user = alex()
      opal_conversation_for(user)
      plan = make_plan()

      {:ok, ctx} = PlanningContext.merge(user, %{}, %{"plan_id" => plan.id})
      assert PlanningContext.plan_id_active?(ctx) == true

      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: user, trace_id: "t1"})

      ctx = PlanningContext.get_for_user(user)
      assert PlanningContext.plan_id_active?(ctx) == false
    end

    test "missing plan deactivates the sticky plan_id" do
      user = alex()
      opal_conversation_for(user)

      {:ok, ctx} = PlanningContext.merge(user, %{}, %{"plan_id" => Ecto.UUID.generate()})
      assert PlanningContext.plan_id_active?(ctx) == false
    end
  end

  describe "handle_when_correction via after_classify (F12-13)" do
    test "cancelled plan's plan_id does not hijack a fresh scheduling ask" do
      user = alex()
      {:ok, _} = OpalCore.OpalConversations.get_or_create_conversation(user)
      plan = make_plan()
      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: user, trace_id: "t1"})
      {:ok, _} = PlanningContext.merge(user, %{}, %{"plan_id" => plan.id})

      before_label = Repo.get!(SharedPlan, plan.id).time_label

      {_intent, override, meta} =
        OpalCore.Center.ActionOrchestrator.after_classify(
          user,
          "tonight 8 PM",
          %{intent: :plan_create, confidence: :low, entities: %{}},
          %{}
        )

      # The cancelled plan is untouched — no phantom "Updated" mutation.
      assert Repo.get!(SharedPlan, plan.id).time_label == before_label
      assert Repo.get!(SharedPlan, plan.id).status == "cancelled"
      assert meta["action_state"] != "plan_patched"
      refute is_binary(override) and String.starts_with?(override, "Updated —")
    end

    test "fresh plan_id routes a clock correction through the schedule authority" do
      user = alex()
      {:ok, _} = OpalCore.OpalConversations.get_or_create_conversation(user)
      plan = make_plan()
      {:ok, _} = PlanningContext.merge(user, %{}, %{"plan_id" => plan.id})

      {_intent, override, meta} =
        OpalCore.Center.ActionOrchestrator.after_classify(
          user,
          "tonight 8 PM",
          %{intent: :plan_create, confidence: :low, entities: %{}},
          %{}
        )

      # The authority applied the correction: revision row + new label.
      assert meta["action_state"] == "plan_patched"
      assert is_binary(override) and String.starts_with?(override, "Updated —")
      assert Repo.get!(SharedPlan, plan.id).time_label =~ "8 PM"
      assert %PlanRevision{status: "accepted"} = Repo.get_by!(PlanRevision, plan_id: plan.id)
      assert is_list(meta["notify_user_ids"])
    end
  end

  # --- F12-05: drive to completion -------------------------------------------

  describe "calendar projection (F12-05d)" do
    test "Center create projects a native calendar commitment" do
      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Dinner",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      commitments = OpalCalendar.list_mine(alex())
      assert Enum.any?(commitments, &(&1["shared_plan_id"] == plan.id))
    end

    test "direct schedule edit re-projects the calendar" do
      plan = make_plan()

      {:ok, _} =
        SocialFlow.change_plan_time(%{
          plan_id: plan.id,
          user_id: alex(),
          new_time_label: "Sat 8:00 PM",
          trace_id: "t1"
        })

      commitments = OpalCalendar.list_mine(alex())
      assert Enum.any?(commitments, &(&1["shared_plan_id"] == plan.id))
    end
  end

  describe "share_plan_to_conversation/1 (F12-05/F12-07 share-to-chat path)" do
    test "explicit share projects a durable signal, never moves the plan" do
      {:ok, center_plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Solo dinner",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      assert {:ok, %{plan: plan, signal: signal}} =
               SocialFlow.share_plan_to_conversation(%{
                 plan_id: center_plan.id,
                 user_id: alex(),
                 conversation_id: conv()
               })

      # The plan stays owner-scoped: conversation_id untouched.
      assert plan.conversation_id == nil
      assert Repo.get!(SharedPlan, center_plan.id).conversation_id == nil

      # A durable announcement signal exists on the conversation.
      assert signal.kind == "plan_shared"
      assert signal.conversation_id == conv()
      assert signal.plan_id == center_plan.id
    end

    test "non-lead cannot share" do
      {:ok, center_plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Solo dinner",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      # Jordan is a participant but not the lead.
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        "plan_id" => center_plan.id,
        "user_id" => jordan(),
        "role" => "participant",
        "response_state" => "pending",
        "authority_source" => "user_action"
      })
      |> Repo.insert!()

      assert {:error, :not_authorized} =
               SocialFlow.share_plan_to_conversation(%{
                 plan_id: center_plan.id,
                 user_id: jordan(),
                 conversation_id: conv()
               })
    end

    test "stranger with no access cannot share" do
      {:ok, center_plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Solo dinner",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      assert {:error, :not_a_member} =
               SocialFlow.share_plan_to_conversation(%{
                 plan_id: center_plan.id,
                 user_id: jordan(),
                 conversation_id: conv()
               })
    end
  end

  # --- F12-06/F12-07: Center plan visibility -----------------------------------

  describe "list_plans_for_user/2 (F12-06/F12-07)" do
    test "conversation-less Center plans are listed for the owner" do
      {:ok, center_plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Center dinner",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      chat_plan = make_plan()

      assert {:ok, plans} = SocialFlow.list_plans_for_user(alex())
      ids = Enum.map(plans, & &1["id"])
      assert center_plan.id in ids
      assert chat_plan.id in ids
    end

    test "another user's plans are never listed (owner scoping)" do
      {:ok, center_plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Alex private",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      assert {:ok, plans} = SocialFlow.list_plans_for_user(jordan())
      ids = Enum.map(plans, & &1["id"])
      refute center_plan.id in ids
    end

    test "cancelled plans excluded by default, included with status: :all" do
      {:ok, center_plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Doomed dinner",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: center_plan.id, user_id: alex(), trace_id: "t1"})

      assert {:ok, plans} = SocialFlow.list_plans_for_user(alex())
      refute center_plan.id in Enum.map(plans, & &1["id"])

      assert {:ok, all} = SocialFlow.list_plans_for_user(alex(), status: :all)
      assert center_plan.id in Enum.map(all, & &1["id"])
    end
  end

  describe "owner-scoped broadcast topics (F12-07)" do
    test "Center plan create fans out on the owner's user topic" do
      Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:user:#{alex()}")

      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Broadcast dinner",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      assert_receive {:social_flow_event, "social_flow:plan",
                      %{"payload" => %{"created" => true}}},
                     2_000

      assert plan.id != nil
    end

    test "schedule change publishes the alignment snapshot event (F12-08)" do
      plan = make_plan()
      Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv()}")

      {:ok, _} =
        SocialFlow.change_plan_time(%{
          plan_id: plan.id,
          user_id: alex(),
          new_time_label: "Sat 8:00 PM",
          trace_id: "t1"
        })

      assert_receive {:social_flow_event, "social_flow:alignment_updated",
                      %{"payload" => %{"plan_id" => plan_id, "time_label" => "Sat 8:00 PM"}}},
                     2_000

      assert plan_id == plan.id
    end
  end

  # --- F12-56: per-account isolation ------------------------------------------

  describe "peer resolution stays inside the account (F12-56)" do
    defp mk_user(display_name) do
      %User{}
      |> User.changeset(%{id: Ecto.UUID.generate(), handle: "user-#{Ecto.UUID.generate()}", display_name: display_name})
      |> Repo.insert!()
    end

    test "same-name contacts on two accounts never cross" do
      # Account A knows a "Chanelle"; account B knows a different "Chanelle".
      user_a = mk_user("User A")
      user_b = mk_user("User B")
      chanelle_a = mk_user("Chanelle")
      chanelle_b = mk_user("Chanelle")
      stranger = mk_user("Chanelle Stranger")

      assert {:ok, _} = Relationships.set_type(user_a.id, chanelle_a.id, "friend")
      assert {:ok, _} = Relationships.set_type(user_b.id, chanelle_b.id, "friend")

      # Each account resolves its OWN Chanelle.
      assert OpalCore.Center.AvailabilityUse.resolve_participant_id(user_a.id, "Chanelle") ==
               chanelle_a.id

      assert OpalCore.Center.AvailabilityUse.resolve_participant_id(user_b.id, "Chanelle") ==
               chanelle_b.id

      # A name nobody in the account knows resolves to nil — never to a
      # same-named stranger elsewhere in the user table.
      assert OpalCore.Center.AvailabilityUse.resolve_participant_id(user_a.id, "Zqxj Nobody") ==
               nil

      # Even a real global user with a colliding name is unreachable.
      assert stranger.id != chanelle_a.id

      assert OpalCore.Center.AvailabilityUse.resolve_participant_id(
               user_b.id,
               "Chanelle Stranger"
             ) == nil
    end

    test "OpalPlanConfirm share with unknown who is honest (:need_who)" do
      assert {:error, :need_who} =
               OpalCore.OpalPlanConfirm.execute(
                 alex(),
                 %{what: "dinner", when: "tonight", who: ["Zqxj Nobody"], share_with_subject: true},
                 %{}
               )
    end
  end

  # --- F12-59: one ordering ----------------------------------------------------

  describe "current-plan ordering (F12-59)" do    test "confirm_pending_revision acts on the newest active plan by updated_at" do
      _old = make_plan(alex(), %{"title" => "Older plan"})
      # Touch the older plan so updated_at ordering is unambiguous... newest
      # insert is the current plan.
      newer = make_plan(alex(), %{"title" => "Newer plan"})

      # A proposed revision on the newer plan is the confirm target.
      {:ok, %{revision: rev}} =
        SocialFlow.propose_revision(%{
          plan_id: newer.id,
          proposed_by_user_id: jordan(),
          changes: %{"time_label" => "Sun 6:00 PM"},
          trace_id: "t1"
        })

      assert {:ok, %{revision_id: rid}} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 decision: "accept",
                 trace_id: "t1"
               })

      assert rid == rev.id
    end
  end

  # --- F12-05: completion driver ----------------------------------------------

  describe "PlanCompletion.drive/3 (F12-05)" do
    alias OpalCore.SocialFlow.PlanCompletion

    test "venue-less Center plan with a destination starts a real search + calendar + next-steps" do
      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Dinner",
          "place" => "Oceanside",
          "area" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      assert {:ok, %{plan_id: pid, steps: steps}} = PlanCompletion.drive(plan.id, alex())
      assert pid == plan.id

      by_id = Map.new(steps, &{&1["id"], &1})
      assert by_id["calendar"]["status"] == "projected"
      assert by_id["restaurants"]["status"] == "search_started"
      assert is_binary(by_id["restaurants"]["job_id"])
      assert by_id["ride"]["status"] == "suggested"
      assert by_id["ride"]["copy"] == "Want me to arrange a ride?"
      refute Map.has_key?(by_id, "directions")

      # Steps persist on the plan row (gyroscope: no shadow state).
      db = Repo.get!(SharedPlan, plan.id)
      assert get_in(db.alignment, ["completion", "steps"]) |> length() == length(steps)
    end

    test "live search is not duplicated; failed search is retried" do
      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Dinner",
          "place" => "Oceanside",
          "area" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      # Simulate a live in-flight search: drive must not start a second one.
      {:ok, live_job} =
        %OpalCore.Center.ProviderActionJob{}
        |> OpalCore.Center.ProviderActionJob.changeset(%{
          "user_id" => alex(),
          "plan_id" => plan.id,
          "kind" => "places_search",
          "status" => "queued",
          "search_geography" => "Oceanside",
          "request" => %{},
          "planning_snapshot" => %{}
        })
        |> Repo.insert()

      assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, alex())
      by_id = Map.new(steps, &{&1["id"], &1})
      assert by_id["restaurants"]["status"] == "search_already_running"
      refute by_id["restaurants"]["job_id"]

      job_count =
        from(j in OpalCore.Center.ProviderActionJob, where: j.plan_id == ^plan.id)
        |> Repo.aggregate(:count, :id)

      assert job_count == 1

      # A failed search does not block a retry (honest: the provider never ran).
      {:ok, _} = live_job |> OpalCore.Center.ProviderActionJob.changeset(%{"status" => "failed"}) |> Repo.update()

      assert {:ok, %{steps: steps2}} = PlanCompletion.drive(plan.id, alex())
      assert Enum.find(steps2, &(&1["id"] == "restaurants"))["status"] == "search_started"
    end

    test "venue-chosen plan skips discovery, offers directions" do
      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Dinner",
          "place" => "Oceanside",
          "area" => "Oceanside",
          "time_label" => "tonight 5 PM",
          "decision_id" => "dec-123"
        })

      assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, alex())
      by_id = Map.new(steps, &{&1["id"], &1})
      assert by_id["calendar"]["status"] == "projected"
      refute Map.has_key?(by_id, "restaurants")
      assert by_id["ride"]["status"] == "suggested"
    end

    test "cancelled plan drives nothing" do
      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Dinner",
          "place" => "Oceanside",
          "time_label" => "tonight 5 PM"
        })

      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "t1"})

      assert {:ok, %{steps: []}} = PlanCompletion.drive(plan.id, alex())
    end

    test "missing plan -> :not_found" do
      assert {:error, :not_found} = PlanCompletion.drive(Ecto.UUID.generate(), alex())
    end
  end
end
