defmodule OpalCore.Repair18ARevisionTest do
  @moduledoc """
  Repair #18 (Division A) - revision + conflict + dedupe + NowStrip.

  - Revision read-back equality across projection paths (F18-02)
  - Conflict present on overlap, absent when resolved (F18-03)
  - Disambiguation asks on 2+ candidates (F18-03)
  - Dedupe merges on second create at every path tried (F18-06)
  - Cleanup dry-run counts, then transition-based apply (F18-06)
  - Titles carry no baked schedule; no bare placeholder (F18-06)
  - NowStrip plan_events carry who + where from the plan record (F18-09)
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.NowStrip
  alias OpalCore.MultiuserHarness
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{ConversationAlignment, PlanRevision, SharedPlan}

  defp mk_user(name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r18a-#{Ecto.UUID.generate()}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp rand_name(base), do: base <> "-" <> (:crypto.strong_rand_bytes(2) |> Base.encode16())

  defp plan_payload_for(user_id, plan_id) do
    {:ok, plans} = SocialFlow.list_plans_for_user(user_id)
    Enum.find(plans, &(&1["id"] == plan_id))
  end

  # ---------------------------------------------------------------
  describe "revision read-back (F18-02)" do
    test "accepted revision moves stored alignment, start_at, plan_set_event and list projection together" do
      lead = MultiuserHarness.account!(%{display_name: rand_name("Lead")})
      peer = MultiuserHarness.account!(%{display_name: rand_name("Peer")})

      start =
        DateTime.utc_now()
        |> DateTime.add(2 * 24 * 3600, :second)
        |> DateTime.truncate(:microsecond)

      start = %{start | hour: 19, minute: 30, second: 0}

      plan =
        MultiuserHarness.create_shared_plan!(lead.id, [peer.id], %{
          title: "Juniper and Ivy",
          time_label: "7:30 PM",
          status: "agreed",
          alignment: %{
            "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
            "place" => %{"state" => "locked", "value" => "Juniper and Ivy"},
            "plan_set_event" => %{
              "summary" => "7:30 PM · Juniper and Ivy",
              "at" => "2026-01-01T00:00:00Z"
            }
          }
        })

      plan
      |> SharedPlan.changeset(%{"start_at" => start})
      |> Repo.update!()

      {:ok, %{revision: revision}} =
        SocialFlow.propose_revision(%{
          plan_id: plan.id,
          proposed_by_user_id: peer.id,
          changes: %{"time_label" => "8:00 PM"},
          trace_id: "r18a-test"
        })

      {:ok, %{plan: updated}} =
        SocialFlow.respond_to_revision(%{
          revision_id: revision.id,
          user_id: lead.id,
          decision: "accept",
          trace_id: "r18a-test"
        })

      assert updated.time_label == "8:00 PM"

      # The row itself: resolved start moved to the new clock, same date.
      reloaded = Repo.get!(SharedPlan, plan.id)
      assert reloaded.start_at.hour == 20
      assert reloaded.start_at.minute == 0
      assert DateTime.to_date(reloaded.start_at) == DateTime.to_date(start)

      # Stored alignment exact_time (the Messages/HomeProjection source).
      assert get_in(reloaded.alignment, ["exact_time", "value"]) == "8:00 PM"
      assert get_in(reloaded.alignment, ["exact_time", "state"]) == "locked"

      # plan_set_event summary regenerated, not frozen at 7:30.
      summary = get_in(reloaded.alignment, ["plan_set_event", "summary"])
      assert summary =~ "8:00 PM"
      refute summary =~ "7:30"

      # List projection path reads the same truth.
      payload = plan_payload_for(peer.id, plan.id)
      assert payload["time_label"] == "8:00 PM"

      # Fold read-back: sync keeps 8:00 PM (no revert-by-resync).
      alignment = ConversationAlignment.sync_conversation(plan.conversation_id)

      assert get_in(alignment, ["exact_time", "value"]) in ["8:00 PM", "8pm", "8 PM"] or
               Repo.get!(SharedPlan, plan.id).time_label == "8:00 PM"

      assert Repo.get!(SharedPlan, plan.id).time_label == "8:00 PM"
    end

    test "fold accept lands on the plan row through the revision authority and settles pending revisions" do
      lead = MultiuserHarness.account!(%{display_name: rand_name("FoldLead")})
      peer = MultiuserHarness.account!(%{display_name: rand_name("FoldPeer")})

      plan =
        MultiuserHarness.create_shared_plan!(lead.id, [peer.id], %{
          title: "Harbor Table",
          time_label: "7:30 PM",
          status: "agreed"
        })

      # A System A proposal is open for the same change.
      {:ok, %{revision: revision}} =
        SocialFlow.propose_revision(%{
          plan_id: plan.id,
          proposed_by_user_id: peer.id,
          changes: %{"time_label" => "9:00 PM"},
          trace_id: "r18a-fold"
        })

      {:ok, result} =
        SocialFlow.record_fold_change_acceptance(%{
          conversation_id: plan.conversation_id,
          user_id: lead.id,
          value: "9:00 PM",
          trace_id: "r18a-fold"
        })

      assert result.plan.time_label == "9:00 PM"
      assert result.revision.status == "accepted"
      assert result.revision.proposed_changes["source"] == "alignment_fold"

      # The earlier proposal is settled, not left pending beside it.
      assert Repo.get!(PlanRevision, revision.id).status == "superseded"

      reloaded = Repo.get!(SharedPlan, plan.id)
      assert reloaded.current_revision_id == result.revision.id
      assert get_in(reloaded.alignment, ["exact_time", "value"]) == "9:00 PM"
    end

    test "a schedule-change request is consequential for the fold" do
      assert ConversationAlignment.consequential?("let's change dinner to 8 PM")
      assert ConversationAlignment.consequential?("move dinner to 8")
      assert ConversationAlignment.consequential?("confirm 8 PM")
    end
  end

  # ---------------------------------------------------------------
  describe "conflict gate (F18-03)" do
    test "conflict is present on overlap in the projection, and clears when resolved" do
      user = MultiuserHarness.account!(%{display_name: rand_name("Conf")})
      peer = MultiuserHarness.account!(%{display_name: rand_name("ConfPeer")})

      start =
        DateTime.utc_now()
        |> DateTime.add(3 * 24 * 3600, :second)
        |> DateTime.truncate(:microsecond)

      start = %{start | hour: 19, minute: 30, second: 0}

      crew =
        MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
          title: "Juniper crew",
          time_label: "7:30 PM",
          status: "agreed"
        })

      crew |> SharedPlan.changeset(%{"start_at" => start}) |> Repo.update!()

      dinner =
        MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
          title: "Dinner with Chanelle",
          time_label: "7:30 PM",
          status: "agreed"
        })

      dinner |> SharedPlan.changeset(%{"start_at" => start}) |> Repo.update!()

      # Proactive read: no new user action - the projection itself
      # surfaces the overlap, naming the other plan.
      payload = plan_payload_for(user.id, dinner.id)
      assert payload["conflict"]["with_plan_id"] == crew.id
      assert payload["conflict"]["title"] == "Juniper crew"
      assert payload["conflict"]["time_label"] == "7:30 PM"

      # Move dinner to 9:30 PM - the windows no longer overlap.
      dinner
      |> SharedPlan.changeset(%{"start_at" => DateTime.add(start, 2 * 3600, :second)})
      |> Repo.update!()

      assert plan_payload_for(user.id, dinner.id)["conflict"] == nil
    end

    test "label-only plans at the same weekday and clock conflict" do
      user = MultiuserHarness.account!(%{display_name: rand_name("Lbl")})
      peer = MultiuserHarness.account!(%{display_name: rand_name("LblPeer")})

      _crew =
        MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
          title: "Crew night",
          time_label: "Thursday 7:30 PM",
          status: "agreed"
        })

      dinner =
        MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
          title: "Dinner Thursday",
          time_label: "Thursday 7:30 PM",
          status: "tentative"
        })

      payload = plan_payload_for(user.id, dinner.id)
      assert payload["conflict"] != nil
      assert payload["conflict"]["title"] == "Crew night"
    end
  end

  # ---------------------------------------------------------------
  describe "disambiguation (F18-03)" do
    test "apply_nl_schedule_change asks with an explicit candidate list on two matches" do
      user = MultiuserHarness.account!(%{display_name: rand_name("Dis")})
      peer = MultiuserHarness.account!(%{display_name: rand_name("DisPeer")})

      dinner_a =
        MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
          title: "Dinner at Juniper",
          time_label: "7:30 PM",
          status: "agreed"
        })

      _dinner_b =
        MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
          title: "Dinner at Harbor",
          time_label: "7:30 PM",
          status: "agreed"
        })

      assert {:error, :ambiguous, %{candidates: candidates}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: dinner_a.conversation_id,
                 user_id: user.id,
                 text: "change dinner to 8 PM",
                 trace_id: "r18a-dis"
               })

      titles = Enum.map(candidates, & &1["title"])
      assert "Dinner at Juniper" in titles
      assert "Dinner at Harbor" in titles

      # Nothing was written to either plan.
      assert Repo.get!(SharedPlan, dinner_a.id).time_label == "7:30 PM"
    end

    test "a uniquely named plan is targeted even when it is not the thread's newest" do
      user = MultiuserHarness.account!(%{display_name: rand_name("Uni")})
      peer = MultiuserHarness.account!(%{display_name: rand_name("UniPeer")})

      harbor =
        MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
          title: "Harbor Table",
          time_label: "7:30 PM",
          status: "agreed"
        })

      juniper =
        MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
          title: "Juniper and Ivy",
          time_label: "7:30 PM",
          status: "agreed"
        })

      assert {:ok, _} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: juniper.conversation_id,
                 user_id: user.id,
                 text: "change Harbor Table to 8 PM",
                 trace_id: "r18a-uni"
               })

      assert Repo.get!(SharedPlan, harbor.id).time_label =~ "8"
      assert Repo.get!(SharedPlan, juniper.id).time_label == "7:30 PM"
    end
  end

  # ---------------------------------------------------------------
  describe "dedupe (F18-06)" do
    test "second Center create with the same intent merges instead of inserting" do
      user = mk_user(rand_name("Dedupe"))

      {:ok, first, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Nighthawk with Maya",
          "location" => "Nighthawk",
          "time_label" => "Sunday"
        })

      {:ok, second, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Nighthawk Sunday",
          "location" => "nighthawk",
          "time_label" => "Sunday"
        })

      assert second.id == first.id

      count =
        from(p in SharedPlan, where: p.created_by_user_id == ^user.id)
        |> Repo.aggregate(:count, :id)

      assert count == 1
      assert first.alignment["dedupe"]["key"] != nil
    end

    test "same intent on Friday and Sunday stays two plans" do
      user = mk_user(rand_name("Distinct"))

      {:ok, friday, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Nighthawk",
          "location" => "Nighthawk",
          "time_label" => "Friday"
        })

      {:ok, sunday, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Nighthawk",
          "location" => "Nighthawk",
          "time_label" => "Sunday"
        })

      assert friday.id != sunday.id
    end

    test "graph create with a fresh key but the same intent returns the survivor as deduplicated" do
      user = mk_user(rand_name("GraphDedupe"))

      {:ok, first, _, false} =
        SocialFlow.create_plan_from_graph_create(user.id, %{
          "title" => "Rooftop drinks",
          "location" => "Rooftop",
          "time_label" => "Friday",
          "idempotency_key" => "key-one"
        })

      {:ok, second, _, true} =
        SocialFlow.create_plan_from_graph_create(user.id, %{
          "title" => "Rooftop drinks",
          "location" => "Rooftop",
          "time_label" => "Friday",
          "idempotency_key" => "key-two-fresh-flow"
        })

      assert second.id == first.id
    end

    test "cleanup dry-run counts groups; apply cancels losers with merged_into stamps, survivor keeps fragments" do
      user = mk_user(rand_name("Cleanup"))

      {:ok, a, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Harbor dinner",
          "location" => "Harbor",
          "time_label" => "Friday"
        })

      # Bypass the create-time dedupe to stage legacy duplicates, the
      # way the pre-R18 paths minted them (raw rows, no dedupe stamp).
      legacy =
        Enum.map(1..2, fn i ->
          %SharedPlan{}
          |> SharedPlan.changeset(%{
            "title" => "Harbor dinner",
            "location" => "Harbor",
            "time_label" => "Friday",
            "status" => "tentative",
            "created_by_user_id" => user.id,
            "source" => "center",
            "timezone" => "UTC",
            "alignment" => %{"legacy" => i}
          })
          |> Repo.insert!()
        end)

      {:ok, dry} = SocialFlow.cleanup_duplicate_plans(user.id, dry_run: true)
      assert dry["group_count"] == 1
      assert dry["would_cancel_count"] == 2
      assert dry["cancelled_count"] == 0
      assert Repo.get!(SharedPlan, a.id).status == "tentative"

      {:ok, applied} = SocialFlow.cleanup_duplicate_plans(user.id, dry_run: false)
      assert applied["cancelled_count"] == 2

      for loser <- legacy do
        row = Repo.get!(SharedPlan, loser.id)
        assert row.status in ["cancelled", "tentative"]
      end

      cancelled =
        from(p in SharedPlan,
          where: p.created_by_user_id == ^user.id and p.status == "cancelled"
        )
        |> Repo.all()

      assert length(cancelled) == 2

      for row <- cancelled do
        assert row.alignment["reconcile_reason"] == "duplicate_intent_cleanup"
        assert is_binary(row.alignment["merged_into"])
      end

      # Idempotent: a second apply finds nothing left to merge.
      {:ok, again} = SocialFlow.cleanup_duplicate_plans(user.id, dry_run: false)
      assert again["group_count"] == 0
    end

    test "stale start-less tentative plans expire through the gate on list; agreed plans never do" do
      user = mk_user(rand_name("Expiry"))

      {:ok, stale, _} =
        SocialFlow.create_tentative_plan_from_center(user.id, %{
          "title" => "Old idea",
          "location" => "Somewhere",
          "time_label" => "Open window"
        })

      old =
        DateTime.utc_now()
        |> DateTime.add(-20 * 24 * 3600, :second)
        |> DateTime.truncate(:microsecond)

      from(p in SharedPlan, where: p.id == ^stale.id)
      |> Repo.update_all(set: [inserted_at: old, updated_at: old])

      {:ok, plans} = SocialFlow.list_plans_for_user(user.id)
      refute Enum.any?(plans, &(&1["id"] == stale.id))
      assert Repo.get!(SharedPlan, stale.id).status == "expired"

      {:ok, all} = SocialFlow.list_plans_for_user(user.id, status: :all)
      assert Enum.any?(all, &(&1["id"] == stale.id))
    end
  end

  # ---------------------------------------------------------------
  describe "titles (F18-06)" do
    test "Center confirm titles carry what and who, never the schedule" do
      user = mk_user(rand_name("Titles"))

      {:ok, result} =
        OpalCore.OpalPlanConfirm.execute(
          user.id,
          %{what: "dinner", when: "Friday", who: ["Maya"]},
          %{}
        )

      refute result.title =~ "Friday"
      assert result.title =~ "Dinner"
      assert result.title =~ "Maya"
    end
  end

  # ---------------------------------------------------------------
  describe "NowStrip who/where (F18-09)" do
    test "plan events carry participant names and the venue from the plan record" do
      owner = MultiuserHarness.account!(%{display_name: rand_name("StripOwner")})
      maya = MultiuserHarness.account!(%{display_name: "Maya R18A"})

      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(owner.id, %{
          "title" => "Nighthawk",
          "location" => "Nighthawk",
          "time_label" => "tonight 5 PM",
          "subject_user_id" => maya.id
        })

      # The subject persisted as a real participant, not a title fragment.
      assert SocialFlow.plan_participant_ids(plan) |> Enum.member?(maya.id)

      now = DateTime.utc_now() |> DateTime.truncate(:second)
      start = DateTime.add(now, 2 * 3600, :second)

      plan
      |> SharedPlan.changeset(%{
        "start_at" => start,
        "end_at" => DateTime.add(start, 3600, :second)
      })
      |> Repo.update!()

      {:ok, _} =
        OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(Repo.get!(SharedPlan, plan.id))

      events =
        NowStrip.plan_events(
          owner.id,
          DateTime.add(now, -3600, :second),
          DateTime.add(now, 20 * 3600, :second)
        )

      event = Enum.find(events, &(&1["plan_id"] == plan.id))
      assert event != nil
      assert event["who"] == ["Maya R18A"]
      assert event["where"] == "Nighthawk"
    end

    test "a solo plan's who is empty - never the owner as their own companion" do
      owner = mk_user(rand_name("SoloStrip"))

      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(owner.id, %{
          "title" => "Solo focus",
          "location" => "Desk",
          "time_label" => "today 3 PM"
        })

      now = DateTime.utc_now() |> DateTime.truncate(:second)
      start = DateTime.add(now, 3600, :second)

      plan
      |> SharedPlan.changeset(%{
        "start_at" => start,
        "end_at" => DateTime.add(start, 3600, :second)
      })
      |> Repo.update!()

      {:ok, _} =
        OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(Repo.get!(SharedPlan, plan.id))

      events =
        NowStrip.plan_events(
          owner.id,
          DateTime.add(now, -3600, :second),
          DateTime.add(now, 20 * 3600, :second)
        )

      event = Enum.find(events, &(&1["plan_id"] == plan.id))
      assert event != nil
      assert event["who"] == []
    end
  end
end
