defmodule OpalCore.SocialFlow.VirtualPlaceB1Test do
  @moduledoc """
  Repair #18 Division B (B1) - virtual place as first-class.

  Covers the design's audit dispositions at the writer/projection
  level; the real-path scenarios live in shots/regression/cases/
  b1-s1..s5. The pre-existing virtual_plan_test.exs (6 tests) is the
  floor and stays untouched.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.ProviderAction
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.OpalIntent
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.Execution.{ExecutionRequirements, PlanLifecycle}
  alias OpalCore.SocialFlow.{JourneyAuthority, MeetingLinks, OpalCalendar, PlanReminder, SharedPlan}
  alias OpalCore.SocialFlow.OpalCalendar.{Commitment, Reminders}

  setup do
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()

    for {id, name} <- [{a, "Alex"}, {b, "Maya"}] do
      {:ok, _} =
        %User{}
        |> User.changeset(%{id: id, handle: "b1_" <> String.slice(id, 0, 8), display_name: name})
        |> Repo.insert()
    end

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "b1-dyad"})
      |> Repo.insert()

    for uid <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    {:ok, a: a, b: b, conversation_id: conv.id}
  end

  defp conversation_plan(cid, user, attrs) do
    {:ok, plan, _} = SocialFlow.create_tentative_plan_from_conversation(cid, user, attrs)
    plan
  end

  describe "authority + projection (step 1)" do
    test "place_projection is explicit and hides a dormant physical link", %{a: a} do
      plan = %SharedPlan{
        plan_type: "in_person",
        location: "Juniper and Ivy",
        meeting_link: "https://zoom.us/j/dormant"
      }

      proj = SharedPlan.place_projection(plan)
      assert proj["kind"] == "physical"
      assert proj["label"] == "Juniper and Ivy"
      assert proj["meeting_link"] == nil
      assert proj["join_available"] == false
      assert proj["directions_available"] == true

      contract = SharedPlan.to_contract(plan)
      assert contract["place"] == proj
      assert contract["meeting_link"] == nil
    end

    test "virtual projection carries provider, sanitized link, join_available", %{a: _a} do
      plan = %SharedPlan{
        plan_type: "virtual",
        location: "Online",
        meeting_link: "https://meet.google.com/abc-defg-hij"
      }

      proj = SharedPlan.place_projection(plan)
      assert proj["kind"] == "virtual"
      assert proj["label"] == "Online"
      assert proj["meeting_provider"] == "google_meet"
      assert proj["join_available"] == true
      assert proj["directions_available"] == false
      assert SharedPlan.virtual?(plan)
    end

    test "provider derivation from link host; explicit label wins", %{a: a, conversation_id: cid} do
      plan =
        conversation_plan(cid, a, %{
          "title" => "Zoom sync",
          "plan_type" => "virtual",
          "meeting_link" => "https://zoom.us/j/42"
        })

      assert plan.meeting_provider == "zoom"
      assert plan.alignment["plan_type"] == "virtual"
      assert plan.alignment["meeting_link"] == "https://zoom.us/j/42"
      assert plan.alignment["meeting_provider"] == "zoom"
      assert MeetingLinks.provider_for("https://teams.microsoft.com/l/x") == "teams"
      assert MeetingLinks.provider_for("javascript:alert(1)") == nil
    end
  end

  describe "graph create (A7 - the live F14-04 drop)" do
    test "graph create honors plan_type/meeting_link and schedules the join reminder", %{a: a} do
      assert {:ok, plan, _participants, false} =
               SocialFlow.create_plan_from_graph_create(a, %{
                 "title" => "Virtual watch party",
                 "time_label" => "Saturday 6 PM",
                 "plan_type" => "virtual",
                 "meeting_link" => "https://zoom.us/j/watch",
                 "idempotency_key" => "b1-graph-#{Ecto.UUID.generate()}"
               })

      assert plan.plan_type == "virtual"
      assert plan.location == "Online"
      assert plan.meeting_link == "https://zoom.us/j/watch"
      assert plan.meeting_provider == "zoom"
      assert plan.alignment["plan_type"] == "virtual"

      reminder = from(r in PlanReminder, where: r.plan_id == ^plan.id) |> Repo.one()
      assert reminder
      assert reminder.source_lineage["origin"] == "virtual_join"
    end

    test "graph create without plan_type stays byte-shape physical", %{a: a} do
      assert {:ok, plan, _, false} =
               SocialFlow.create_plan_from_graph_create(a, %{
                 "title" => "Park picnic",
                 "location" => "Balboa Park",
                 "idempotency_key" => "b1-graph-#{Ecto.UUID.generate()}"
               })

      assert plan.plan_type == "in_person"
      assert plan.location == "Balboa Park"
      contract = SharedPlan.to_contract(plan)
      assert contract["place"]["kind"] == "physical"
      assert contract["meeting_link"] == nil
    end
  end

  describe "journey projection (A1)" do
    test "virtual journey: no leave, no maps, join block instead", %{a: a, conversation_id: cid} do
      plan =
        conversation_plan(cid, a, %{
          "title" => "Video dinner",
          "plan_type" => "virtual",
          "meeting_link" => "https://zoom.us/j/dinner"
        })

      journey = JourneyAuthority.project(plan, a, %{})
      assert journey["leave"] == %{
               "available" => false,
               "reason" => "virtual_no_travel",
               "fabricated" => false
             }

      assert journey["navigation"] == %{"available" => false, "reason" => "virtual_join_instead"}
      assert journey["join"]["url"] == "https://zoom.us/j/dinner"
      assert journey["join"]["available"] == true
      assert journey["place_projection"]["kind"] == "virtual"
      refute inspect(journey) =~ "daddr=Online"
    end

    test "journey activate births a virtual plan agreed, honoring type over venue string", %{
      a: a,
      b: _b,
      conversation_id: cid
    } do
      assert {:ok, journey} =
               JourneyAuthority.activate(%{
                 "user_id" => a,
                 "conversation_id" => cid,
                 "title" => "Activate virtual",
                 "plan_type" => "virtual",
                 "place" => "Juniper and Ivy",
                 "meeting_link" => "https://zoom.us/j/activate",
                 "time_label" => "Friday 6 PM"
               })

      assert journey["place_projection"]["kind"] == "virtual"
      assert journey["join"]["url"] == "https://zoom.us/j/activate"
      assert journey["leave"]["available"] == false

      plan = Repo.get_by!(SharedPlan, conversation_id: cid, title: "Activate virtual")
      assert plan.plan_type == "virtual"
      assert plan.location == "Online"
      assert plan.status == "agreed"
      assert plan.meeting_provider == "zoom"
      assert plan.alignment["plan_type"] == "virtual"

      # And the born-agreed plan is journey-eligible on the read path.
      assert {:ok, fetched} = JourneyAuthority.get(plan.id, a)
      assert fetched["join"]["available"] == true
    end

    test "a fold sync must not adopt a journey-born plan (mirror is not fold input)", %{
      a: a,
      conversation_id: cid
    } do
      assert {:ok, _journey} =
               JourneyAuthority.activate(%{
                 "user_id" => a,
                 "conversation_id" => cid,
                 "title" => "Sync-proof virtual",
                 "plan_type" => "virtual",
                 "meeting_link" => "https://zoom.us/j/syncproof",
                 "time_label" => "Friday 6 PM"
               })

      plan = Repo.get_by!(SharedPlan, conversation_id: cid, title: "Sync-proof virtual")
      assert plan.status == "agreed"

      # The chats list / thread reads fold-sync every conversation.
      _ = OpalCore.SocialFlow.ConversationAlignment.sync_conversation(cid)

      after_sync = Repo.get!(SharedPlan, plan.id)
      assert after_sync.status == "agreed"
      assert after_sync.plan_type == "virtual"
      assert after_sync.created_by_user_id == a

      leads =
        from(p in OpalCore.SocialFlow.PlanParticipant,
          where: p.plan_id == ^plan.id and p.role == "lead"
        )
        |> Repo.all()

      assert length(leads) == 1
      assert hd(leads).user_id == a
    end

    test "physical journey keeps maps and has no join block", %{a: a, conversation_id: cid} do
      plan =
        conversation_plan(cid, a, %{
          "title" => "Dinner out",
          "place" => "Juniper and Ivy"
        })

      journey = JourneyAuthority.project(plan, a, %{})
      assert journey["navigation"]["available"] == true
      assert journey["join"] == nil
      assert journey["place_projection"]["kind"] == "physical"
    end
  end

  describe "PlanCompletion gates (A4)" do
    test "virtual drive: restaurants skipped_virtual, no ride/directions, join step link_missing",
         %{a: a, conversation_id: cid} do
      plan =
        conversation_plan(cid, a, %{
          "title" => "Online game night",
          "plan_type" => "virtual"
        })

      assert {:ok, %{steps: steps}} = SocialFlow.PlanCompletion.drive(plan.id, a)
      by_id = Map.new(steps, &{&1["id"], &1})
      assert by_id["restaurants"]["status"] == "skipped_virtual"
      assert by_id["join"]["status"] == "link_missing"
      refute Map.has_key?(by_id, "ride")
      refute Map.has_key?(by_id, "directions")
    end

    test "physical drive keeps the restaurant/ride machinery", %{a: a} do
      assert {:ok, plan, _} =
               SocialFlow.create_tentative_plan_from_center(a, %{
                 "title" => "Dinner in Coronado",
                 "location" => "Coronado",
                 "time_label" => "Friday 7 PM"
               })

      assert {:ok, %{steps: steps}} = SocialFlow.PlanCompletion.drive(plan.id, a)
      by_id = Map.new(steps, &{&1["id"], &1})
      refute by_id["restaurants"]["status"] == "skipped_virtual"
      refute Map.has_key?(by_id, "join")
    end
  end

  describe "conversion writer (S2 core)" do
    test "solo direct conversion + convert back restores venue, link dormant", %{a: a} do
      assert {:ok, plan, _} =
               SocialFlow.create_tentative_plan_from_center(a, %{
                 "title" => "Dinner at Juniper",
                 "location" => "Juniper and Ivy",
                 "time_label" => "Thursday 7:30 PM"
               })

      # Stamp a venue like an attach would, so the stash has content.
      plan =
        plan
        |> SharedPlan.changeset(%{
          alignment:
            Map.put(plan.alignment, "venue", %{
              "name" => "Juniper and Ivy",
              "address" => "2228 University Ave"
            })
        })
        |> Repo.update!()

      assert {:ok, %{plan: converted, revision: revision, applied: true}} =
               SocialFlow.convert_plan_place_type(%{
                 plan_id: plan.id,
                 user_id: a,
                 to_plan_type: "virtual",
                 meeting_link: "https://zoom.us/j/convert"
               })

      assert revision.status == "accepted"
      assert converted.plan_type == "virtual"
      assert converted.location == "Online"
      assert converted.meeting_link == "https://zoom.us/j/convert"
      assert converted.meeting_provider == "zoom"
      assert converted.place_changed_at
      assert converted.status == "tentative"
      assert get_in(converted.alignment, ["suspended_place", "venue", "name"]) == "Juniper and Ivy"
      assert converted.alignment["plan_type"] == "virtual"

      # Column and mirror agree; calendar re-projected with the type.
      commitment =
        from(c in Commitment, where: c.shared_plan_id == ^plan.id and c.status == "active")
        |> Repo.all()
        |> List.first()

      if commitment do
        assert commitment.place_label == "Online"
        assert commitment.metadata["plan_type"] == "virtual"
      end

      # Idempotent no-op on repeat.
      assert {:ok, %{applied: false, noop: true}} =
               SocialFlow.convert_plan_place_type(%{
                 plan_id: plan.id,
                 user_id: a,
                 to_plan_type: "virtual"
               })

      # Convert back: venue restored, link retained on the row but
      # hidden from the contract, join reminder cancelled.
      assert {:ok, %{plan: restored, applied: true}} =
               SocialFlow.convert_plan_place_type(%{
                 plan_id: plan.id,
                 user_id: a,
                 to_plan_type: "in_person"
               })

      assert restored.plan_type == "in_person"
      assert restored.location == "Juniper and Ivy"
      assert get_in(restored.alignment, ["venue", "name"]) == "Juniper and Ivy"
      assert restored.meeting_link == "https://zoom.us/j/convert"
      assert SharedPlan.to_contract(restored)["meeting_link"] == nil
      assert SharedPlan.to_contract(restored)["place"]["kind"] == "physical"

      join_reminders =
        from(r in PlanReminder,
          where: r.plan_id == ^plan.id and r.status == "scheduled",
          select: r.source_lineage
        )
        |> Repo.all()

      refute Enum.any?(join_reminders, &(&1["origin"] == "virtual_join"))
    end

    test "shared conversion proposes, holds, then applies on accept", %{
      a: a,
      b: b,
      conversation_id: cid
    } do
      plan =
        conversation_plan(cid, a, %{
          "title" => "Shared dinner",
          "place" => "The Henry",
          "time_label" => "Friday 7 PM"
        })

      assert {:ok, %{plan: held, revision: revision, applied: false}} =
               SocialFlow.convert_plan_place_type(%{
                 plan_id: plan.id,
                 user_id: a,
                 to_plan_type: "virtual",
                 meeting_link: "https://meet.google.com/abc-defg-hij"
               })

      assert held.plan_type == "in_person"
      assert Repo.get!(SharedPlan, plan.id).plan_type == "in_person"

      # The proposer cannot accept their own proposal.
      assert {:error, _} =
               SocialFlow.respond_to_revision(%{
                 revision_id: revision.id,
                 user_id: a,
                 decision: "accept",
                 trace_id: "b1-test"
               })

      assert {:ok, %{plan: applied_plan}} =
               SocialFlow.respond_to_revision(%{
                 revision_id: revision.id,
                 user_id: b,
                 decision: "accept",
                 trace_id: "b1-test"
               })

      assert applied_plan.plan_type == "virtual"
      assert applied_plan.location == "Online"
      assert applied_plan.status == "changed"
      assert applied_plan.time_label == plan.time_label
      assert applied_plan.alignment["plan_type"] == "virtual"
    end

    test "refusals: terminal plan, bogus type, stranger", %{a: a, conversation_id: cid} do
      plan =
        conversation_plan(cid, a, %{"title" => "Doomed dinner", "place" => "The Henry"})

      {:ok, cancelled} =
        plan
        |> SharedPlan.changeset(%{status: "cancelled"})
        |> OpalCore.SocialFlow.PlanTransition.guard_changeset(:plan, :cancel)
        |> Repo.update()

      assert {:error, :invalid_status} =
               SocialFlow.convert_plan_place_type(%{
                 plan_id: cancelled.id,
                 user_id: a,
                 to_plan_type: "virtual"
               })

      assert {:error, :invalid_plan_type} =
               SocialFlow.convert_plan_place_type(%{
                 plan_id: plan.id,
                 user_id: a,
                 to_plan_type: "hologram"
               })

      stranger = Ecto.UUID.generate()

      {:ok, _} =
        %User{}
        |> User.changeset(%{
          id: stranger,
          handle: "b1_stranger",
          display_name: "Stranger"
        })
        |> Repo.insert()

      assert {:error, _} =
               SocialFlow.convert_plan_place_type(%{
                 plan_id: plan.id,
                 user_id: stranger,
                 to_plan_type: "virtual"
               })

      assert Repo.get!(SharedPlan, plan.id).plan_type == "in_person"
    end
  end

  describe "physical-path gates (A2/A3/A6/A10/A12)" do
    test "PlanLifecycle: virtual plans never emit travel phases" do
      start = DateTime.add(DateTime.utc_now(), 30 * 60, :second)

      attrs = %{
        "set" => true,
        "when" => start,
        "plan_start" => start,
        "place_kind" => "virtual",
        "plan_type" => "dinner"
      }

      assert {:ok, %{"phase" => phase}} = PlanLifecycle.phase(attrs)
      assert phase not in ["departure_approaching", "in_transit"]

      in_transit = Map.put(attrs, "navigation_started", true)
      assert {:ok, %{"phase" => phase2}} = PlanLifecycle.phase(in_transit)
      refute phase2 == "in_transit"

      physical = Map.put(attrs, "place_kind", "in_person")
      assert {:ok, %{"phase" => "departure_approaching"}} = PlanLifecycle.phase(physical)
    end

    test "ExecutionRequirements: explicit place_kind suppresses navigation + dinner reservation" do
      assert {:ok, req} =
               ExecutionRequirements.infer(%{
                 "plan_type" => "dinner",
                 "place_kind" => "virtual",
                 "place" => "Online",
                 "set" => true
               })

      assert req["navigation_useful"] == false
      assert req["reservation_needed"] == false
      refute "navigation" in req["execution_path"]

      assert {:ok, physical} =
               ExecutionRequirements.infer(%{
                 "plan_type" => "dinner",
                 "place_kind" => "in_person",
                 "place" => "Juniper and Ivy",
                 "set" => true
               })

      assert physical["reservation_needed"] == true
    end

    test "ProviderAction refuses venue attach + places search for virtual plans", %{
      a: a,
      conversation_id: cid
    } do
      plan =
        conversation_plan(cid, a, %{
          "title" => "Video dinner",
          "plan_type" => "virtual",
          "meeting_link" => "https://zoom.us/j/x"
        })

      assert {:error, :plan_is_virtual} =
               ProviderAction.start_places_search(%{
                 user_id: a,
                 plan_id: plan.id,
                 destination: "Online"
               })

      assert {:error, :plan_is_virtual} =
               ProviderAction.attach_selected_venue(
                 a,
                 %{"name" => "Juniper and Ivy", "address" => "2228 University Ave"},
                 %{"plan_id" => plan.id}
               )

      assert Repo.get!(SharedPlan, plan.id).location == "Online"
    end

    test "calendar projection carries plan_type metadata; reminders refuse leave_by for virtual" do
      start = DateTime.add(DateTime.utc_now(), 3 * 3600, :second)

      virtual_commitment = %{
        "id" => Ecto.UUID.generate(),
        "owner_user_id" => Ecto.UUID.generate(),
        "start_at" => DateTime.to_iso8601(start),
        "metadata" => %{"plan_type" => "virtual"}
      }

      intents = Reminders.prepare_for_commitment(virtual_commitment, travel_minutes: 25)
      assert Enum.all?(intents, &(&1["kind"] != "leave_by"))

      physical_commitment = put_in(virtual_commitment, ["metadata", "plan_type"], "in_person")
      intents = Reminders.prepare_for_commitment(physical_commitment, travel_minutes: 25)
      assert Enum.any?(intents, &(&1["kind"] == "leave_by"))
    end

    test "calendar projection from a virtual plan stamps metadata", %{a: a, conversation_id: cid} do
      plan =
        conversation_plan(cid, a, %{
          "title" => "Zoom sync",
          "plan_type" => "virtual",
          "meeting_link" => "https://zoom.us/j/cal"
        })

      assert {:ok, commitments} = OpalCalendar.project_from_shared_plan(plan)
      assert commitments != []

      for c <- commitments do
        assert c.place_label == "Online"
        assert c.metadata["plan_type"] == "virtual"
        assert c.metadata["meeting_link"] == "https://zoom.us/j/cal"
      end
    end
  end

  describe "intent separation (chat)" do
    test "\"Video dinner with Maya Tuesday\" keeps the dinner, marks virtual + provider" do
      ctx = %{social: %{frequent_contacts: [%{display_name: "Maya", user_id: "x"}]}}

      assert {:ok, intent} = OpalIntent.classify("Video dinner with Maya Tuesday", ctx)
      assert intent.intent == :plan_create
      assert intent.entities.plan_type == "virtual"
      assert String.downcase(intent.entities.what) == "dinner"
    end

    test "pure provider ask keeps today's behavior" do
      ctx = %{social: %{frequent_contacts: [%{display_name: "Maya", user_id: "x"}]}}

      assert {:ok, intent} = OpalIntent.classify("Schedule a Zoom with Maya Tuesday", ctx)
      assert intent.entities.plan_type == "virtual"
      assert intent.entities.what in ["Zoom", "zoom"]
      assert intent.entities.meeting_provider == "zoom"
    end
  end

  describe "Center planning context (A5)" do
    test "DependencyPlanner: virtual context makes physical deps not_applicable, link pending" do
      status =
        OpalCore.Center.DependencyPlanner.build(%{
          "plan_type" => "virtual",
          "who" => "Maya",
          "when" => "Tuesday"
        })

      assert status["destination"] == "not_applicable"
      assert status["venue"] == "not_applicable"
      assert status["travel"] == "not_applicable"
      assert status["reservation"] == "not_applicable"
      assert status["meeting_link"] == "pending"

      status2 =
        OpalCore.Center.DependencyPlanner.build(%{
          "plan_type" => "virtual",
          "who" => "Maya",
          "when" => "Tuesday",
          "meeting_link" => "https://zoom.us/j/x"
        })

      assert status2["meeting_link"] == "resolved"

      physical = OpalCore.Center.DependencyPlanner.build(%{"who" => "Maya", "when" => "Tuesday"})
      refute Map.has_key?(physical, "meeting_link")
    end

    test "PlanContextPatch settles plan_type from a virtual utterance" do
      patch = OpalCore.Center.PlanContextPatch.extract_from_text("video dinner with Maya Tuesday", %{})
      assert patch["plan_type"] == "virtual"

      patch2 =
        OpalCore.Center.PlanContextPatch.extract_from_text(
          "dinner on Zoom Friday https://zoom.us/j/patched",
          %{}
        )

      assert patch2["plan_type"] == "virtual"
      assert patch2["meeting_link"] == "https://zoom.us/j/patched"
      assert patch2["meeting_provider"] == "zoom"
    end
  end

  describe "PlanExecution (A9)" do
    test "virtual readiness is join readiness, never place-unresolved", %{
      a: a,
      conversation_id: cid
    } do
      plan =
        conversation_plan(cid, a, %{
          "title" => "Video dinner",
          "plan_type" => "virtual",
          "meeting_link" => "https://zoom.us/j/ready"
        })

      assert {:ok, ready} = SocialFlow.PlanExecution.readiness(plan.id)
      assert ready["status"] == "join_ready"
      assert ready["place_identity"] == nil

      linkless =
        conversation_plan(cid, a, %{"title" => "Video chat", "plan_type" => "virtual"})

      assert {:ok, ready2} = SocialFlow.PlanExecution.readiness(linkless.id)
      assert ready2["status"] == "needs_link"
    end
  end
end
