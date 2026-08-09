defmodule OpalCore.SocialFlow.RealWorldJourneysTest do
  @moduledoc """
  Courtship / solo / group golden-path cognition journeys.
  Visual freeze: backend-only.
  """
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.RealWorld.Calendar.{FreeBusyStore, WriteAction}

  alias OpalCore.SocialFlow.RealWorld.Cognition.{
    Actionability,
    AutomationLadder,
    DecisionCompression,
    LeaveTime,
    PlanVersion,
    ProgressiveEnrichment,
    Willingness,
    ZeroRedundancy
  }

  alias OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary
  alias OpalCore.SocialFlow.RealWorld.Contacts.Matching
  alias OpalCore.SocialFlow.RealWorld.GroupFit
  alias OpalCore.SocialFlow.RealWorld.Memory.Layers
  alias OpalCore.SocialFlow.RealWorld.Proximity.{MeetHalfway, TravelBurden}

  setup do
    FreeBusyStore.reset()
    :ok
  end

  test "courtship golden path: free+willing → share ask → places → book authorize" do
    # Free from calendar is not enough alone
    free_only = Willingness.readiness(%{free: true, willingness: "unknown"})
    refute free_only["ready_to_propose"]

    ready = Willingness.readiness(%{free: true, willingness: "willing"})
    assert ready["ready_to_propose"]

    refute ZeroRedundancy.should_ask?(:time_availability, %{calendar_free_for_candidate: true})

    # Place compression to 1–3
    places =
      DecisionCompression.compress([
        %{"id" => "harbor", "score" => 4.8, "cost" => 2, "travel" => 15},
        %{"id" => "loud", "score" => 2.0, "cost" => 3, "travel" => 40},
        %{"id" => "quiet", "score" => 4.5, "cost" => 2, "travel" => 18}
      ])

    assert length(places["options"]) <= 3
    refute Enum.any?(places["options"], &(&1["id"] == "loud"))

    # Booking ladder
    {:ok, inq} = ProviderBoundary.inquire(%{venue_id: "harbor", conversation_id: "c"})

    {:ok, checked} =
      ProviderBoundary.check_availability(inq, [%{"id" => "730", "label" => "7:30"}])

    assert checked["booked"] == false

    ladder = %{"rung" => "prepare", "action" => "make_reservation"}
    {:ok, at_auth} = AutomationLadder.advance(ladder)
    assert at_auth["rung"] == "authorize"

    {:ok, requested} = ProviderBoundary.request_booking(checked, user_authorized: true)
    {:ok, conf} = ProviderBoundary.confirm(requested, "res-1")
    assert conf["booked"] == true

    # Calendar write after Set
    {:ok, prep} =
      WriteAction.prepare(%{
        set_authorized: true,
        actor_user_id: "a",
        conversation_id: "c",
        start_at: ~U[2026-08-14 19:30:00Z],
        end_at: ~U[2026-08-14 21:30:00Z]
      })

    {:ok, auth} = WriteAction.authorize(prep, user_authorized: true)
    {:ok, created} = WriteAction.execute(auth)
    assert created["state"] == "created"
  end

  test "solo journey: actionability silences weak chat" do
    assert {:silence, _} =
             Actionability.classify(%{
               confidence: 0.2,
               benefit: 0.1,
               casual_chat: true,
               forming?: false
             })

    assert {:actionable, _} =
             Actionability.classify(%{
               confidence: 0.9,
               benefit: 0.8,
               forming?: true,
               taps: 1,
               thinking_burden: 0.5
             })
  end

  test "group partial participation remains viable" do
    v =
      GroupFit.viable?(%{
        participants: [
          %{"user_id" => "a", "engagement" => "organizer"},
          %{"user_id" => "b", "engagement" => "yes_no"},
          %{"user_id" => "c", "engagement" => "silent"}
        ],
        required_user_ids: ["a"],
        travels: %{"a" => 15, "b" => 20, "c" => 25}
      })

    assert v["viable"]
    refute v["shame_holdout"]
  end

  test "plan revision invalidates Thursday place work when moving to Friday" do
    {:ok, plan} = PlanVersion.new(%{conversation_id: "c", time_key: "thu-evening"})
    {:ok, plan} = PlanVersion.attach_work(plan, %{"kind" => "places", "id" => "thu-places"})
    {:ok, plan} = PlanVersion.attach_work(plan, %{"kind" => "travel", "id" => "thu-travel"})

    {:ok, revised, cancelled} = PlanVersion.revise(plan, %{time_key: "fri-evening"})
    assert revised["version"] == 2
    assert length(cancelled) == 2
    assert Enum.all?(cancelled, &(&1["status"] == "cancelled_stale"))
  end

  test "leave-by is private; on-the-way requires auth" do
    {:ok, leave} =
      LeaveTime.compute(%{
        plan_start: ~U[2026-08-14 19:30:00Z],
        travel_minutes: 25
      })

    assert leave["origin_exposed"] == false
    assert {:error, :user_authorization_required} = LeaveTime.shared_on_the_way(leave)

    assert {:ok, shared} = LeaveTime.shared_on_the_way(leave, user_authorized: true)
    refute shared["origin_exposed"]
  end

  test "meet halfway + progressive prefetch stay private until gap opens" do
    {:ok, zones} =
      MeetHalfway.candidate_zones([
        %{"area_label" => "Carlsbad"},
        %{"area_label" => "Encinitas"}
      ])

    assert zones["shared_copy"] == "A couple areas fit."

    {:ok, pref} =
      ProgressiveEnrichment.plan_prefetch(%{gap: "time", time_almost_aligned: true})

    refute pref["expose_now"]
  end

  test "contacts matching hashes selected contacts only" do
    {:ok, req} =
      Matching.build_request(%{
        owner_user_id: "a",
        selected_contacts: [%{"e164" => "+15551234567", "display_hint" => "Jordan"}]
      })

    refute req["full_address_book_uploaded"]
    assert hd(req["contacts"])["raw_uploaded"] == false
    assert is_binary(hd(req["contacts"])["hash"])

    {:ok, inv} =
      Matching.contextual_invite(%{
        inviter_user_id: "a",
        conversation_id: "c",
        shared_safe_summary: "Jordan invited you to a plan in Opal."
      })

    assert inv["deep_link_resume"]
    refute inv["spam_invite"]
  end

  test "memory layers isolate relationship vs personal" do
    {:ok, personal} =
      Layers.put("personal_private", %{
        owner_user_id: "a",
        key: "food",
        payload: %{"pref" => "sushi"}
      })

    {:ok, rel} =
      Layers.put("relationship", %{
        owner_user_id: "a",
        scope_id: "rel-1",
        key: "vibe",
        payload: %{"pref" => "quiet"}
      })

    assert Layers.may_use_in_context?(personal, %{})
    refute Layers.may_use_in_context?(rel, %{"relationship_id" => "rel-2"})
    assert Layers.may_use_in_context?(rel, %{"relationship_id" => "rel-1"})

    corrected = Layers.correct(personal)
    refute Layers.may_use_in_context?(corrected, %{})
  end

  test "travel burden ranks fair options first" do
    ranked =
      TravelBurden.rank_options([
        %{"id" => "unfair", "travels" => %{"a" => 5, "b" => 55}},
        %{"id" => "fair", "travels" => %{"a" => 22, "b" => 24}}
      ])

    assert hd(ranked)["id"] == "fair"
  end
end
