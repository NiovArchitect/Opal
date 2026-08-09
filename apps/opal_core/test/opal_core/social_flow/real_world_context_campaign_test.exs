defmodule OpalCore.SocialFlow.RealWorldContextCampaignTest do
  @moduledoc "Real-world context + device harness campaign tests under frozen UX."
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.Availability

  alias OpalCore.SocialFlow.RealWorld.{
    CalendarSufficiency,
    ContextSource,
    Events
  }

  alias OpalCore.SocialFlow.RealWorld.Calendar.{Connector, FreeBusyStore, WriteAction}

  alias OpalCore.SocialFlow.RealWorld.Cognition.{
    AutomationLadder,
    DecisionCompression,
    EffortBudget,
    PlanVersion,
    ProgressiveEnrichment,
    Willingness,
    ZeroRedundancy
  }

  alias OpalCore.SocialFlow.RealWorld.Device.{ActionStateMachine, CapabilityRegistry}
  alias OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary
  alias OpalCore.SocialFlow.RealWorld.Location.{Grant, MovementMode, Precision, Retention}
  alias OpalCore.SocialFlow.RealWorld.Place.PreferenceMemory
  alias OpalCore.SocialFlow.RealWorld.Proximity.{Engine, MeetHalfway, TravelBurden}

  setup do
    FreeBusyStore.reset()
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "rw-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "rw-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "rw-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  # --- Context source registry ---

  test "context source builds facts with metadata" do
    assert {:ok, fact} =
             ContextSource.build(%{
               source: "calendar_free_busy",
               owner_user_id: "u1",
               confidence: 0.9,
               step_eliminated: "manual_calendar_check",
               payload: %{"busy" => false}
             })

    assert fact["permission_class"] == "owner_private"
    assert ContextSource.usable?(fact)
    refute ContextSource.usable?(ContextSource.revoke(fact))
  end

  # --- Calendar free/busy ---

  test "calendar free/busy eliminates manual check when free", %{a: a} do
    FreeBusyStore.grant_permission(a.id)
    FreeBusyStore.put_busy(a.id, [])

    s = DateTime.add(DateTime.utc_now(), 86_400, :second) |> DateTime.truncate(:microsecond)
    e = DateTime.add(s, 7200, :second)

    result =
      CalendarSufficiency.enrich_facts(
        a.id,
        %{has_fresh_windows: false, shared_overlap_found: false},
        candidate_start: s,
        candidate_end: e,
        willingness: "willing"
      )

    assert result.calendar.calendar_free_for_candidate == true
    assert result.decision == :needs_permission
    assert result.should_ask_time == false
    assert result.step_eliminated == "manual_calendar_check"
  end

  test "calendar busy does not pretend free", %{a: a} do
    FreeBusyStore.grant_permission(a.id)
    s = DateTime.add(DateTime.utc_now(), 86_400, :second) |> DateTime.truncate(:microsecond)
    e = DateTime.add(s, 7200, :second)
    FreeBusyStore.put_busy(a.id, [%{"start_at" => s, "end_at" => e}])

    result =
      CalendarSufficiency.enrich_facts(
        a.id,
        %{has_fresh_windows: false},
        candidate_start: s,
        candidate_end: e
      )

    assert result.calendar.calendar_free_for_candidate == false
    assert result.decision == :needs_input
  end

  test "calendar denied falls back to manual path", %{a: a} do
    result =
      CalendarSufficiency.enrich_facts(
        a.id,
        %{has_fresh_windows: false},
        candidate_start: DateTime.utc_now(),
        candidate_end: DateTime.add(DateTime.utc_now(), 3600, :second)
      )

    assert result.calendar.calendar_status in [:not_connected, :unavailable, :denied]
    assert result.decision == :needs_input
  end

  test "free_busy never carries titles" do
    FreeBusyStore.grant_permission("u")

    FreeBusyStore.put_busy("u", [
      %{
        "start_at" => ~U[2026-08-10 12:00:00Z],
        "end_at" => ~U[2026-08-10 13:00:00Z],
        "title" => "Therapy"
      }
    ])

    assert {:ok, [block]} =
             Connector.free_busy("u", %{
               start_at: ~U[2026-08-10 00:00:00Z],
               end_at: ~U[2026-08-11 00:00:00Z]
             })

    refute Map.has_key?(block, "title")
    assert block["no_event_titles"] == true
  end

  test "calendar write requires authorization" do
    assert {:ok, prep} =
             WriteAction.prepare(%{
               set_authorized: true,
               actor_user_id: "a",
               conversation_id: "c",
               start_at: ~U[2026-08-10 19:00:00Z],
               end_at: ~U[2026-08-10 21:00:00Z]
             })

    assert prep["state"] == "prepared"
    assert {:error, :user_authorization_required} = WriteAction.authorize(prep)

    assert {:ok, auth} = WriteAction.authorize(prep, user_authorized: true)
    assert {:ok, created} = WriteAction.execute(auth)
    assert created["state"] == "created"
  end

  # --- Willingness vs free ---

  test "blank calendar free is not social willingness" do
    r = Willingness.readiness(%{free: true, willingness: "unknown"})
    refute r["ready_to_propose"]
    assert r["reason"] == "free_willingness_unknown"

    r2 = Willingness.readiness(%{free: true, willingness: "unwilling"})
    refute r2["ready_to_propose"]

    r3 = Willingness.readiness(%{free: true, willingness: "willing"})
    assert r3["ready_to_propose"]
  end

  test "willingness classifier" do
    assert Willingness.classify_text("I'm in") == "explicit_yes"
    assert Willingness.classify_text("not interested") == "unwilling"
    assert Willingness.classify_text("maybe") == "soft_yes"
  end

  # --- Zero redundancy ---

  test "zero redundancy skips answered questions" do
    refute ZeroRedundancy.should_ask?(:time_availability, %{calendar_free_for_candidate: true})
    refute ZeroRedundancy.should_ask?(:area, %{both_near_same_area: true})
    assert ZeroRedundancy.should_ask?(:time_availability, %{})
  end

  # --- Location ---

  test "precision ladder caps over-collection" do
    assert Precision.required_for("dinner_between") == "coarse_area"
    assert Precision.cap_request("precise_coordinates", "dinner_between") == "coarse_area"
    assert Precision.sufficient?("neighborhood", "meet_halfway")
  end

  test "purpose-bound location grant is not permanent" do
    assert {:ok, g} =
             Grant.build(%{
               owner_user_id: "a",
               purpose: "approximate_for_plan",
               conversation_id: "c"
             })

    refute g["permanent_exposure"]
    assert Grant.active?(g)
    refute Grant.active?(Grant.revoke(g))
  end

  test "location retention expires current location quickly" do
    assert Retention.ttl_seconds("current_approximate_location") <
             Retention.ttl_seconds("familiar_area")

    old = %{
      "source" => "current_approximate_location",
      "observed_at" => DateTime.add(DateTime.utc_now(), -3600, :second)
    }

    assert Retention.expired?(old)
  end

  test "movement mode is temporary and revocable" do
    assert {:error, :user_authorization_required} =
             MovementMode.start(%{plan_id: "p1", actor_user_id: "a"})

    assert {:ok, mode} =
             MovementMode.start(%{
               plan_id: "p1",
               conversation_id: "c",
               actor_user_id: "a",
               user_authorized: true,
               eta: "15m"
             })

    assert mode["temporary"] == true
    assert MovementMode.active?(mode)
    refute MovementMode.active?(MovementMode.revoke(mode))
  end

  # --- Proximity ---

  test "proximity feasibility never exposes coordinates" do
    assert {:ok, f} =
             Engine.feasibility([
               %{"user_id" => "a", "travel_minutes" => 10},
               %{"user_id" => "b", "travel_minutes" => 12}
             ])

    assert f["label"] == "easy for both"
    assert f["no_coordinates"] == true
    refute f["participant_coordinates_exposed"]
  end

  test "travel burden prefers balanced options" do
    unbalanced = %{"a" => 5, "b" => 55}
    balanced = %{"a" => 20, "b" => 25}
    assert TravelBurden.better?(balanced, unbalanced)

    ranked =
      TravelBurden.rank_options([
        %{"id" => "far", "travels" => unbalanced},
        %{"id" => "fair", "travels" => balanced}
      ])

    assert hd(ranked)["id"] == "fair"
  end

  test "meet halfway shared copy is safe" do
    assert {:ok, z} =
             MeetHalfway.candidate_zones([
               %{"area_label" => "Carlsbad"},
               %{"area_label" => "Encinitas"}
             ])

    assert z["shared_copy"] == "A couple areas fit."
    assert length(z["zones"]) <= 3
  end

  # --- Device / booking ---

  test "device capability registry and action state machine" do
    assert {:ok, cap} =
             CapabilityRegistry.register("u", "calendar.read_free_busy", %{
               permission_state: "granted"
             })

    assert CapabilityRegistry.ready?(cap)

    assert {:ok, action} =
             ActionStateMachine.new("navigation.start", %{
               available: true,
               permission_state: "granted",
               conversation_id: "c",
               actor_user_id: "u"
             })

    assert action["state"] == "authorization_required"
    assert {:ok, ready} = ActionStateMachine.transition(action, :user_authorized)
    assert {:ok, exec} = ActionStateMachine.transition(ready, :execute)
    assert {:ok, done} = ActionStateMachine.transition(exec, :success, summary: "On the way")
    assert ActionStateMachine.shared_outcome(done)["summary"] == "On the way"
  end

  test "booking never claims booked without provider confirm" do
    assert {:ok, i} = ProviderBoundary.inquire(%{venue_id: "v1", conversation_id: "c"})
    assert i["booked"] == false

    assert {:ok, checked} =
             ProviderBoundary.check_availability(i, [%{"id" => "s1", "label" => "7:30"}])

    assert checked["booked"] == false
    assert {:error, :user_authorization_required} = ProviderBoundary.request_booking(checked)

    assert {:ok, req} = ProviderBoundary.request_booking(checked, user_authorized: true)
    assert req["booked"] == false
    assert {:ok, conf} = ProviderBoundary.confirm(req, "prov-1")
    assert conf["booked"] == true
  end

  # --- Cognition ---

  test "automation ladder blocks execute without authorize for external actions" do
    state = %{"rung" => "prepare", "action" => "make_reservation"}
    assert {:ok, s1} = AutomationLadder.advance(state)
    assert s1["rung"] == "authorize"
    assert s1["awaiting_authorization"] == true

    assert {:error, :authorization_required} =
             AutomationLadder.advance(%{
               "rung" => "authorize",
               "action" => "make_reservation",
               "user_authorized" => false
             })
  end

  test "effort budget prefers confirmation over editor" do
    assert EffortBudget.path_cost(:one_confirmation)["effort_score"] <
             EffortBudget.path_cost(:manual_editor)["effort_score"]

    assert EffortBudget.path_cost(:one_recommendation)["effort_score"] <
             EffortBudget.path_cost(:browse_many)["effort_score"]
  end

  test "plan version cancels stale derived work" do
    assert {:ok, plan} = PlanVersion.new(%{conversation_id: "c", time_key: "thu"})
    assert {:ok, plan} = PlanVersion.attach_work(plan, %{"kind" => "places", "id" => "w1"})
    assert length(PlanVersion.active_work(plan)) == 1

    assert {:ok, plan2, cancelled} = PlanVersion.revise(plan, %{time_key: "fri"})
    assert plan2["version"] == 2
    assert length(cancelled) == 1
    assert PlanVersion.active_work(plan2) == []
  end

  test "progressive enrichment stays private" do
    assert {:ok, p} =
             ProgressiveEnrichment.plan_prefetch(%{
               gap: "time",
               time_almost_aligned: true
             })

    assert "place_candidates" in p["prefetch"]
    refute p["expose_now"]

    r = ProgressiveEnrichment.private_result("place_candidates", %{"n" => 2})
    assert r["private"] == true
    refute r["expose_now"]
  end

  test "decision compression eliminates dominated options" do
    result =
      DecisionCompression.compress([
        %{"id" => "a", "score" => 5, "cost" => 1, "travel" => 10},
        %{"id" => "b", "score" => 2, "cost" => 5, "travel" => 40},
        %{"id" => "c", "score" => 4.6, "cost" => 2, "travel" => 12}
      ])

    ids = Enum.map(result["options"], & &1["id"])
    refute "b" in ids
    assert length(result["options"]) <= 3
  end

  test "preference memory corrections supersede" do
    assert {:ok, p} =
             PreferenceMemory.remember(%{
               owner_user_id: "a",
               preference: "sushi",
               polarity: "prefer"
             })

    assert {:ok, c} = PreferenceMemory.correct(p, %{preference: "not sushi", polarity: "avoid"})
    assert c["polarity"] == "avoid"
    assert c["supersedes"] == "sushi"
  end

  # --- Runtime fuse into resolve_intervention ---

  test "resolve_intervention uses calendar free for candidate", %{a: a, conv: conv} do
    FreeBusyStore.grant_permission(a.id)
    FreeBusyStore.put_busy(a.id, [])
    s = DateTime.add(DateTime.utc_now(), 48 * 3600, :second) |> DateTime.truncate(:microsecond)
    e = DateTime.add(s, 3 * 3600, :second)

    assert {:ok, i} =
             Availability.resolve_intervention(conv.id, a.id,
               candidate_start: s,
               candidate_end: e,
               willingness: "willing"
             )

    assert i["decision"] == "needs_permission"
    assert i["should_ask_time"] == false
    assert i["step_eliminated"] == "manual_calendar_check"
    assert i["authorizes_set"] == false
  end

  test "real-world events recordable", %{conv: conv} do
    assert {:ok, _} =
             Events.record("calendar.updated", conv.id, %{"status" => "refreshed"})

    assert {:error, :event_not_allowed} = Events.record("alignment.set", conv.id, %{})
  end
end
