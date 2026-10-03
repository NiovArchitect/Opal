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
