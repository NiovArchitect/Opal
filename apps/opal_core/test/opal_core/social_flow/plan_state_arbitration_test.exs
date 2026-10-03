defmodule OpalCore.SocialFlow.PlanStateArbitrationTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.PlanStateArbitration, as: PSA

  # Fort Oak: Tue Sep 29 2026 8:00 PM America/Los_Angeles (PDT = UTC-7)
  # → 2026-09-30 03:00:00Z
  @fort_oak %{
    "commitment" => "aligned",
    "date" => %{
      "value" => "Tuesday · Sep 29",
      "resolved_on" => "2026-09-29",
      "timezone" => "America/Los_Angeles"
    },
    "exact_time" => %{"state" => "locked", "value" => "8:00 PM"},
    "place" => %{"state" => "locked", "value" => "Fort Oak"},
    "execution" => %{"state" => "unknown", "executed" => false, "authorized_by" => []},
    "activity" => %{"value" => "Dinner", "execution_type" => "reservation"},
    # Stale shared_plans.start_at — must not win over resolved_on
    "start_at" => ~U[2026-08-20 16:06:33.000000Z]
  }

  @fort_oak_start ~U[2026-09-30 03:00:00Z]

  test "canonical start prefers resolved_on + exact_time + tz over stale start_at" do
    start = PSA.canonical_start(@fort_oak)
    assert DateTime.compare(start, @fort_oak_start) == :eq
  end

  test "falls back to start_at when resolved_on missing" do
    attrs = Map.drop(@fort_oak, ["date"]) |> Map.put("date", %{"value" => "Tuesday · Sep 29"})
    assert DateTime.compare(PSA.canonical_start(attrs), ~U[2026-08-20 16:06:33.000000Z]) == :eq
  end

  describe "Fort Oak time-travel (no real sleep)" do
    test "Sep 28 — future: next_together yes, upcoming_ready yes, future_execution yes" do
      # Sep 28 12:00 PT = Sep 28 19:00Z
      now = ~U[2026-09-28 19:00:00.000000Z]
      arb = PSA.evaluate(@fort_oak, now: now)

      assert arb["temporal_state"] == "future"
      assert arb["next_together_eligible"] == true
      assert arb["upcoming_ready"] == true
      assert arb["future_execution_actionable"] == true
      assert arb["impossible_combinations"] == []
      refute PSA.impossible_combination?(arb)
    end

    test "Sep 29 before window — still future/approaching, gates open" do
      # Sep 29 10:00 AM PT = Sep 29 17:00Z
      now = ~U[2026-09-29 17:00:00.000000Z]
      arb = PSA.evaluate(@fort_oak, now: now)

      assert arb["temporal_state"] == "future"
      assert arb["next_together_eligible"] == true
      assert arb["upcoming_ready"] == true
      assert arb["future_execution_actionable"] == true
    end

    test "Sep 29 approaching — within 90m of start" do
      # Sep 29 7:00 PM PT = Sep 30 02:00Z (60m before 8PM)
      now = ~U[2026-09-30 02:00:00.000000Z]
      arb = PSA.evaluate(@fort_oak, now: now)

      assert arb["temporal_state"] == "approaching"
      assert arb["next_together_eligible"] == true
      assert arb["upcoming_ready"] == true
      assert arb["future_execution_actionable"] == true
    end

    test "Sep 29 during window — live: next_together yes, upcoming_ready no, execution no" do
      # Sep 29 8:30 PM PT = Sep 30 03:30Z
      now = ~U[2026-09-30 03:30:00.000000Z]
      arb = PSA.evaluate(@fort_oak, now: now)

      assert arb["temporal_state"] == "live"
      assert arb["next_together_eligible"] == true
      assert arb["upcoming_ready"] == false
      assert arb["future_execution_actionable"] == false
    end

    test "Sep 30 — past: all future gates closed" do
      # Sep 30 12:00 PT = Sep 30 19:00Z (>3h after start)
      now = ~U[2026-09-30 19:00:00.000000Z]
      arb = PSA.evaluate(@fort_oak, now: now)

      assert arb["temporal_state"] == "past"
      assert arb["next_together_eligible"] == false
      assert arb["upcoming_ready"] == false
      assert arb["future_execution_actionable"] == false
    end

    test "Oct 2 — past: next_together=no, upcoming_ready=no, future_execution=no" do
      # Oct 2 evening PT ≈ Oct 3 03:00Z (matches recovery snapshot)
      now = ~U[2026-10-03 03:00:00.000000Z]
      arb = PSA.evaluate(@fort_oak, now: now)

      assert arb["temporal_state"] == "past"
      assert arb["next_together_eligible"] == false
      assert arb["upcoming_ready"] == false
      assert arb["future_execution_actionable"] == false
      assert arb["past_plan_as_next_together"] == false
      assert arb["past_plan_as_upcoming_ready"] == false
      assert arb["past_plan_future_execution_cta"] == false
      assert arb["past_plan_future_attention"] == false
      assert arb["past_plan_auto_memory"] == false
      assert arb["impossible_combinations"] == []
      refute PSA.next_together_eligible?(arb)
      refute PSA.upcoming_ready?(arb)
      refute PSA.future_execution_actionable?(arb)
    end

    test "Sep 29 7:59 PM PT — approaching; 8:00 PM — live boundary" do
      # 7:59 PM PT = Sep 30 02:59Z; 8:00 PM PT = Sep 30 03:00Z
      approaching = PSA.evaluate(@fort_oak, now: ~U[2026-09-30 02:59:00.000000Z])
      assert approaching["temporal_state"] == "approaching"
      assert approaching["next_together_eligible"] == true

      live = PSA.evaluate(@fort_oak, now: ~U[2026-09-30 03:00:00.000000Z])
      assert live["temporal_state"] == "live"
      assert live["upcoming_ready"] == false
      assert live["future_execution_actionable"] == false
    end
  end

  describe "Past Shared Reality ≠ attendance ≠ Memory" do
    test "MUTUALLY_ACCEPTED_PAST_PLAN_BECOMES_SHARED_HISTORY" do
      arb = PSA.evaluate(@fort_oak, now: ~U[2026-10-03 03:00:00.000000Z])
      assert arb["past_shared_reality"] == true
      assert arb["past_accepted_plan_disappears_from_history"] == false
      assert PSA.past_shared_reality?(arb)
    end

    test "PAST_PLAN_NOT_AUTO_CONFIRMED_ATTENDANCE" do
      arb = PSA.evaluate(@fort_oak, now: ~U[2026-10-03 03:00:00.000000Z])
      assert arb["occurrence_state"] == "past_unverified"
      assert arb["plan_participant_implies_attendance"] == false
      refute arb["occurrence_state"] in ~w(likely_occurred confirmed_occurred)
    end

    test "LOCATION_OPTIONAL / LOCATION_PERMISSION_REQUIRED_FOR_LOCATION_EVIDENCE" do
      arb = PSA.evaluate(@fort_oak, now: ~U[2026-10-03 03:00:00.000000Z])
      assert arb["location_required_to_create_past_history"] == false
      assert arb["location_required_to_create_memory"] == false

      with_loc =
        PSA.evaluate(
          Map.merge(@fort_oak, %{
            "location_permission" => true,
            "arrived_near_destination" => true
          }),
          now: ~U[2026-10-03 03:00:00.000000Z]
        )

      assert with_loc["past_shared_reality"] == true
      assert with_loc["occurrence_state"] == "likely_occurred"
      assert "location_arrival" in with_loc["occurrence_evidence"]

      no_perm =
        PSA.evaluate(
          Map.merge(@fort_oak, %{
            "location_permission" => false,
            "arrived_near_destination" => true
          }),
          now: ~U[2026-10-03 03:00:00.000000Z]
        )

      refute "location_arrival" in no_perm["occurrence_evidence"]
      assert no_perm["occurrence_state"] == "past_unverified"
    end

    test "POST_EVENT_CONVERSATION_CAN_RAISE_OCCURRENCE_CONFIDENCE" do
      arb =
        PSA.evaluate(
          Map.put(@fort_oak, "post_event_conversation_evidence", true),
          now: ~U[2026-10-03 03:00:00.000000Z]
        )

      assert arb["occurrence_state"] == "likely_occurred"
      assert "post_event_conversation" in arb["occurrence_evidence"]
    end

    test "PROVIDER_FULFILLMENT_CAN_RAISE_OCCURRENCE_CONFIDENCE" do
      arb =
        PSA.evaluate(
          Map.merge(@fort_oak, %{"provider_confirmed" => true, "journey_arrived" => true}),
          now: ~U[2026-10-03 03:00:00.000000Z]
        )

      assert arb["occurrence_state"] == "confirmed_occurred"
      assert "provider_fulfillment" in arb["occurrence_evidence"]
      assert "journey_arrival" in arb["occurrence_evidence"]
    end

    test "PARTICIPANT_ATTENDANCE_CAN_DIVERGE / CONTRADICTORY_ATTENDANCE_EVIDENCE" do
      contradicted =
        PSA.evaluate(
          Map.put(@fort_oak, "could_not_attend", true),
          now: ~U[2026-10-03 03:00:00.000000Z]
        )

      assert contradicted["past_shared_reality"] == true
      assert contradicted["occurrence_state"] == "contradicted"
      assert contradicted["plan_participant_implies_attendance"] == false
    end

    test "PAST_SHARED_REALITY_CAN_FEED_MEMORY_CANDIDATE" do
      arb = PSA.evaluate(@fort_oak, now: ~U[2026-10-03 03:00:00.000000Z])
      assert {:ok, meta} = PSA.memory_candidate_input(arb)
      assert meta["type"] == "shared_experience"
      assert meta["auto_durable"] == false
      assert meta["auto_publish"] == false
    end

    test "PAST_SHARED_REALITY_DOES_NOT_AUTO_PUBLISH" do
      arb = PSA.evaluate(@fort_oak, now: ~U[2026-10-03 03:00:00.000000Z])
      assert arb["past_shared_reality_auto_publishes"] == false
      assert arb["confirmed_experience_auto_publishes"] == false
      assert arb["past_plan_auto_memory"] == false
      assert arb["reliability_score"] == false
      assert arb["flake_score"] == false
    end

    test "EVENT_TIMEZONE_CANONICAL / USER_TIMEZONE_PRESENTATION_ONLY" do
      arb = PSA.evaluate(@fort_oak, now: ~U[2026-10-03 03:00:00.000000Z])
      assert arb["plan_timezone"] == "America/Los_Angeles"
      assert arb["canonical_start_at"] == "2026-09-30T03:00:00Z"
      # Travel / user TZ must not mutate plan clock — same instant regardless of presentation
      assert DateTime.compare(arb["canonical_start"], @fort_oak_start) == :eq
    end

    test "WALL_CLOCK_TRANSITION_WITHOUT_MESSAGE" do
      future = PSA.evaluate(@fort_oak, now: ~U[2026-09-28 19:00:00.000000Z])
      past = PSA.evaluate(@fort_oak, now: ~U[2026-10-03 03:00:00.000000Z])
      assert future["temporal_state"] == "future"
      assert past["temporal_state"] == "past"
      assert past["past_shared_reality"] == true
      # No message/edit required — only `now` changed
      assert arb_same_plan?(future, past)
    end

    test "NEXT_TOGETHER_EXCLUDES_PAST / PAST_EXECUTION_ACTION_ZERO" do
      arb = PSA.evaluate(@fort_oak, now: ~U[2026-10-03 03:00:00.000000Z])
      refute arb["next_together_eligible"]
      refute arb["future_execution_actionable"]
      assert arb["component_local_past_calculation"] == false
    end

    test "canceled accepted plan is not past_shared_reality" do
      arb =
        PSA.evaluate(Map.put(@fort_oak, "cancelled", true),
          now: ~U[2026-10-03 03:00:00.000000Z]
        )

      assert arb["temporal_state"] == "past"
      refute arb["past_shared_reality"]
      assert arb["occurrence_state"] == "planned_only"
    end
  end

  defp arb_same_plan?(a, b) do
    a["canonical_start_at"] == b["canonical_start_at"] and
      a["plan_timezone"] == b["plan_timezone"]
  end

  test "Clock.freeze injects now without real sleep" do
    OpalCore.SocialFlow.Clock.freeze(~U[2026-10-03 03:00:00.000000Z])

    try do
      arb = PSA.evaluate(@fort_oak)
      assert arb["temporal_state"] == "past"
      refute arb["next_together_eligible"]
    after
      OpalCore.SocialFlow.Clock.unfreeze()
    end
  end

  test "canceled plan is not next-together or ready" do
    arb =
      PSA.evaluate(Map.put(@fort_oak, "cancelled", true),
        now: ~U[2026-09-28 19:00:00.000000Z]
      )

    assert arb["temporal_state"] == "past"
    refute arb["next_together_eligible"]
    refute arb["upcoming_ready"]
  end

  test "impossible_combination detects PAST+NEXT_TOGETHER claims" do
    assert PSA.impossible_combination?(%{
             "temporal_state" => "past",
             "next_together_eligible" => true
           })

    assert PSA.impossible_combination?(%{
             "temporal_state" => "past",
             "reservation_authorizable" => true
           })

    assert PSA.impossible_combination?(%{
             "plan_alignment_state" => "canceled",
             "upcoming_ready" => true
           })

    refute PSA.impossible_combination?(%{
             "temporal_state" => "past",
             "next_together_eligible" => false,
             "upcoming_ready" => false,
             "future_execution_actionable" => false
           })
  end

  test "layers stay separated in snapshot" do
    arb = PSA.evaluate(@fort_oak, now: ~U[2026-09-28 19:00:00.000000Z])
    assert arb["plan_alignment_state"] == "aligned"
    assert arb["temporal_state"] == "future"
    assert arb["execution_state"] == "unknown"
    assert "plan_set" in arb["dominant_hints"]
    assert "reservation_approval_distinct" in arb["dominant_hints"]
    assert is_binary(arb["lifecycle_phase"])
  end
end
