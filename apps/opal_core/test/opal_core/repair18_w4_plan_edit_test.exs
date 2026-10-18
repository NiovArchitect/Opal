defmodule OpalCore.Repair18W4PlanEditTest do
  @moduledoc """
  Repair #18 (Walk #4, W4-04) — end-to-end plan editing.

  Deterministic layer: SocialFlow.edit_plan_details/1 (the gate, the
  authority model, the input contract, the edit-vs-revision boundary)
  and read-back through the sanctioned projections (plan_payload,
  list_plans_for_user for both parties, HomeProjection plan cards,
  NowStrip). The real-path HTTP layer lives in shots/regression
  cases W4-04a/b/c.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Center.NowStrip
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo

  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.HomeProjection
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanTransition
  alias OpalCore.SocialFlow.SharedPlan

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp taylor, do: Fixtures.user_taylor_id()
  defp conv, do: Fixtures.conv_alex_jordan_id()

  defp edit(plan_id, user_id, changes) do
    SocialFlow.edit_plan_details(%{
      plan_id: plan_id,
      user_id: user_id,
      changes: changes,
      trace_id: "trace-w4-edit-test"
    })
  end

  defp make_plan!(title \\ "Diner at Juniper") do
    {:ok, plan, _participants} =
      SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
        "title" => title,
        "location" => "Juniper & Ivy",
        "time_label" => "Friday 7:30 PM"
      })

    plan
  end

  describe "the gate" do
    test "PlanTransition :edit is legal only from live statuses" do
      assert {:ok, "tentative"} = PlanTransition.transition(:plan, "tentative", :edit)
      assert {:ok, "agreed"} = PlanTransition.transition(:plan, "agreed", :edit)
      assert {:ok, "changed"} = PlanTransition.transition(:plan, "changed", :edit)
      assert {:error, :illegal_transition} = PlanTransition.transition(:plan, "cancelled", :edit)
      assert {:error, :illegal_transition} = PlanTransition.transition(:plan, "completed", :edit)
      assert {:error, :illegal_transition} = PlanTransition.transition(:plan, "expired", :edit)
    end
  end

  describe "lead edit" do
    test "title typo fix lands on the row and every projection reads it back" do
      plan = make_plan!()
      assert {:ok, %{plan: edited}} = edit(plan.id, alex(), %{"title" => "Dinner at Juniper"})
      assert edited.title == "Dinner at Juniper"
      assert edited.status == plan.status

      # The one row.
      assert Repo.get!(SharedPlan, plan.id).title == "Dinner at Juniper"

      # plan_payload (plan detail / list / Graphs source), both parties.
      assert SocialFlow.plan_payload(edited)["title"] == "Dinner at Juniper"

      for viewer <- [alex(), jordan()] do
        {:ok, listed} = SocialFlow.list_plans_for_user(viewer)
        entry = Enum.find(listed, &(&1["id"] == plan.id))
        assert entry["title"] == "Dinner at Juniper"
      end

      # Lead sees can_edit true; the non-lead participant sees false.
      {:ok, listed_a} = SocialFlow.list_plans_for_user(alex())
      {:ok, listed_b} = SocialFlow.list_plans_for_user(jordan())
      assert Enum.find(listed_a, &(&1["id"] == plan.id))["can_edit"] == true
      assert Enum.find(listed_b, &(&1["id"] == plan.id))["can_edit"] == false

      # Chats-list / thread plan card (HomeProjection from the row).
      card =
        HomeProjection.from_plan_row(Repo.get!(SharedPlan, plan.id), conv(), 2, viewer_id: alex())

      assert card["title"] == "Dinner at Juniper"
    end

    test "location and caption edits land; empty caption clears" do
      plan = make_plan!()

      assert {:ok, %{plan: edited}} =
               edit(plan.id, alex(), %{
                 "location" => "Juniper & Ivy, Little Italy",
                 "caption" => "Ask for the corner table"
               })

      assert edited.location == "Juniper & Ivy, Little Italy"
      assert SocialFlow.plan_payload(edited)["caption"] == "Ask for the corner table"

      assert {:ok, %{plan: cleared}} = edit(plan.id, alex(), %{"caption" => ""})
      refute Map.has_key?(SocialFlow.plan_payload(cleared), "caption")
    end

    test "NowStrip reads the corrected title from the row" do
      plan = make_plan!()
      start = DateTime.utc_now() |> DateTime.add(3600, :second) |> DateTime.truncate(:microsecond)

      {:ok, plan} =
        plan
        |> SharedPlan.changeset(%{start_at: start, end_at: DateTime.add(start, 3600, :second)})
        |> Repo.update()

      _ = OpalCalendar.project_from_shared_plan(plan)

      window =
        {DateTime.add(DateTime.utc_now(), -4 * 3600, :second),
         DateTime.add(DateTime.utc_now(), 20 * 3600, :second)}

      {from_at, to_at} = window

      assert [%{"title" => "Diner at Juniper"}] =
               NowStrip.plan_events(alex(), from_at, to_at)
               |> Enum.filter(&(&1["plan_id"] == plan.id))

      assert {:ok, _} = edit(plan.id, alex(), %{"title" => "Dinner at Juniper"})

      assert [%{"title" => "Dinner at Juniper"}] =
               NowStrip.plan_events(alex(), from_at, to_at)
               |> Enum.filter(&(&1["plan_id"] == plan.id))
    end

    test "duplicate identical saves are idempotent in outcome" do
      plan = make_plan!()
      assert {:ok, _} = edit(plan.id, alex(), %{"title" => "Dinner at Juniper"})
      assert {:ok, %{plan: again}} = edit(plan.id, alex(), %{"title" => "Dinner at Juniper"})
      assert again.title == "Dinner at Juniper"
      assert Repo.get!(SharedPlan, plan.id).title == "Dinner at Juniper"
    end

    test "the stored dedupe stamp no longer carries the typo subject" do
      plan = make_plan!()
      assert is_map(plan.alignment["dedupe"])
      assert {:ok, %{plan: edited}} = edit(plan.id, alex(), %{"title" => "Dinner at Juniper"})
      components = SocialFlow.plan_dedupe_components(edited)
      assert edited.alignment["dedupe"]["subject"] == components["subject"]
      assert edited.alignment["dedupe"]["key"] == SocialFlow.plan_dedupe_key(edited)
    end
  end

  describe "authority" do
    test "participant without lead rights is refused and nothing changes" do
      plan = make_plan!()
      assert {:error, :not_authorized} = edit(plan.id, jordan(), %{"title" => "Hijacked"})
      assert Repo.get!(SharedPlan, plan.id).title == "Diner at Juniper"
    end

    test "non-participant is refused as not_a_member" do
      plan = make_plan!()
      assert {:error, :not_a_member} = edit(plan.id, taylor(), %{"title" => "Hijacked"})
      assert Repo.get!(SharedPlan, plan.id).title == "Diner at Juniper"
    end

    test "unknown plan is not_found; junk id is invalid, never a crash" do
      assert {:error, :not_found} = edit(Ecto.UUID.generate(), alex(), %{"title" => "X"})
      assert {:error, :invalid} = SocialFlow.edit_plan_details(%{plan_id: nil})
      assert {:error, :invalid} = SocialFlow.edit_plan_details(%{})
    end

    test "a co_lead participant row can edit" do
      plan = make_plan!()

      {:ok, _} =
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          "plan_id" => plan.id,
          "user_id" => taylor(),
          "role" => "co_lead",
          "response_state" => "accepted",
          "authority_source" => "test"
        })
        |> Repo.insert()

      # Taylor is a co_lead participant row but NOT a member of the
      # alex-jordan conversation, and conversation-plan access is
      # membership-based (ensure_plan_access) - so this shape is
      # refused at the access door, honestly. The co_lead leg is
      # therefore exercised on a Center plan below.
      assert {:error, :not_a_member} = edit(plan.id, taylor(), %{"title" => "Co-lead rename"})

      {:ok, center_plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Solo diner",
          "location" => "Cafe 21",
          "time_label" => "Monday 6:00 PM",
          "participant_user_ids" => [taylor()]
        })

      # Promote Taylor's participant row to co_lead.
      Repo.get_by!(PlanParticipant, plan_id: center_plan.id, user_id: taylor())
      |> PlanParticipant.changeset(%{"role" => "co_lead"})
      |> Repo.update!()

      assert {:ok, %{plan: edited}} = edit(center_plan.id, taylor(), %{"title" => "Solo dinner"})
      assert edited.title == "Solo dinner"
    end

    test "creator fallback: a plan with no lead row is editable by its creator only" do
      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Fallback diner",
          "location" => "Cafe 21",
          "time_label" => "Monday 6:00 PM"
        })

      # Remove the lead row to reach the documented fallback shape.
      Repo.delete_all(from pp in PlanParticipant, where: pp.plan_id == ^plan.id)

      assert {:ok, _} = edit(plan.id, alex(), %{"title" => "Fallback dinner"})
      assert {:error, :not_a_member} = edit(plan.id, jordan(), %{"title" => "Nope"})
    end
  end

  describe "input contract" do
    setup do
      {:ok, plan: make_plan!()}
    end

    test "empty, whitespace-only and over-length titles are refused whole", %{plan: plan} do
      assert {:error, :empty_title} = edit(plan.id, alex(), %{"title" => ""})
      assert {:error, :empty_title} = edit(plan.id, alex(), %{"title" => "   \t "})

      assert {:error, :title_too_long} =
               edit(plan.id, alex(), %{"title" => String.duplicate("x", 121)})

      assert {:error, :invalid_title} = edit(plan.id, alex(), %{"title" => 42})
      # No silent truncation: the row still holds the original title.
      assert Repo.get!(SharedPlan, plan.id).title == "Diner at Juniper"
    end

    test "title is trimmed, exactly at the bound is accepted", %{plan: plan} do
      assert {:ok, %{plan: edited}} = edit(plan.id, alex(), %{"title" => "  Dinner at Juniper  "})
      assert edited.title == "Dinner at Juniper"
      exact = String.duplicate("y", 120)
      assert {:ok, %{plan: edited2}} = edit(plan.id, alex(), %{"title" => exact})
      assert edited2.title == exact
    end

    test "location contract: empty / over-length refused; virtual location is not editable", %{
      plan: plan
    } do
      assert {:error, :empty_location} = edit(plan.id, alex(), %{"location" => " "})

      assert {:error, :location_too_long} =
               edit(plan.id, alex(), %{"location" => String.duplicate("x", 201)})

      {:ok, virtual, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Video diner",
          "plan_type" => "virtual",
          "meeting_link" => "https://example.com/meet",
          "time_label" => "Monday 6:00 PM"
        })

      assert {:error, :location_not_editable} =
               edit(virtual.id, alex(), %{"location" => "Somewhere"})

      assert {:ok, %{plan: renamed}} = edit(virtual.id, alex(), %{"title" => "Video dinner"})
      assert renamed.location == "Online"
    end

    test "no changes and unknown fields are refused", %{plan: plan} do
      assert {:error, :no_changes} = edit(plan.id, alex(), %{})
      assert {:error, :unknown_field} = edit(plan.id, alex(), %{"status" => "cancelled"})
      assert {:error, :unknown_field} = edit(plan.id, alex(), %{"bogus" => "x"})
    end
  end

  describe "edit vs revision boundary" do
    test "a schedule field in an edit refuses the WHOLE edit atomically" do
      plan = make_plan!()

      assert {:error, :schedule_field_requires_revision} =
               edit(plan.id, alex(), %{
                 "title" => "Sneaky rename",
                 "time_label" => "Friday 9:00 PM"
               })

      row = Repo.get!(SharedPlan, plan.id)
      assert row.title == "Diner at Juniper"
      assert row.time_label == "Friday 7:30 PM"
    end

    test "an edit lands while a revision is proposed, and touches nothing of the revision's" do
      plan = make_plan!()

      assert {:ok, %{revision: revision}} =
               SocialFlow.propose_revision(%{
                 plan_id: plan.id,
                 proposed_by_user_id: jordan(),
                 changes: %{"time_label" => "8:00 PM"},
                 trace_id: "trace-w4-edit-test"
               })

      assert {:ok, %{plan: edited}} = edit(plan.id, alex(), %{"title" => "Dinner at Juniper"})
      assert edited.title == "Dinner at Juniper"
      assert edited.time_label == "Friday 7:30 PM"

      revision_after = Repo.get!(OpalCore.SocialFlow.PlanRevision, revision.id)
      assert revision_after.status == "proposed"
      assert revision_after.proposed_changes["time_label"] == "8:00 PM"
    end
  end

  describe "terminal plans" do
    test "a cancelled plan cannot be edited" do
      plan = make_plan!()

      assert {:ok, _} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "t"})

      assert {:error, :invalid_status} = edit(plan.id, alex(), %{"title" => "Zombie rename"})
      assert Repo.get!(SharedPlan, plan.id).title == "Diner at Juniper"
    end

    test "a completed plan cannot be edited" do
      plan = make_plan!()

      {:ok, plan} =
        plan
        |> SharedPlan.changeset(%{status: "agreed"})
        |> PlanTransition.guard_changeset(:plan, :agree)
        |> Repo.update()

      {:ok, plan} =
        plan
        |> SharedPlan.changeset(%{status: "completed"})
        |> PlanTransition.guard_changeset(:plan, :complete)
        |> Repo.update()

      assert {:error, :invalid_status} = edit(plan.id, alex(), %{"title" => "History rewrite"})
    end
  end
end
