defmodule OpalCore.SocialFlow.ProactiveCoordinationTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Execution.{
    AttentionTier,
    BackgroundPrepare,
    DueWork,
    IntentStrength,
    PlanAwareness,
    ProactiveCompose,
    SurfaceRouter
  }

  setup do
    DueWork.reset()
    :ok
  end

  describe "attention tiers" do
    test "labels are internal only" do
      assert "dormant" in AttentionTier.tiers()
      assert AttentionTier.may_surface?("watch") == false
      assert AttentionTier.may_prepare?("prepare")
      assert AttentionTier.may_push?("urgent_actionable")
      refute AttentionTier.may_push?("actionable")
    end
  end

  describe "plan awareness" do
    test "set dinner 7 days out is watch or dormant — not urgent" do
      assert {:ok, aw} =
               PlanAwareness.evaluate(%{
                 set: true,
                 plan_type: "dinner",
                 place: "Harbor",
                 when: ~U[2026-08-20 19:00:00Z],
                 now: ~U[2026-08-13 12:00:00Z],
                 human_reports_booked: true,
                 provider_confirmed: true
               })

      assert aw["attention_tier"] in ~w(dormant watch prepare)
      refute aw["may_push"]
      refute aw["visible_plan_awareness"]
      assert aw["prepare_early_interrupt_late"]
    end

    test "departure window is urgent_actionable" do
      assert {:ok, aw} =
               PlanAwareness.evaluate(%{
                 set: true,
                 plan_type: "dinner",
                 place: "Harbor",
                 destination: "Harbor",
                 when: ~U[2026-08-14 19:00:00Z],
                 now: ~U[2026-08-14 18:35:00Z],
                 provider_confirmed: true,
                 human_reports_booked: true
               })

      assert aw["attention_tier"] == "urgent_actionable"
      assert aw["may_surface"]
    end

    test "park plan does not invent booking preparation need" do
      assert {:ok, aw} =
               PlanAwareness.evaluate(%{
                 set: true,
                 plan_type: "park",
                 place: "Balboa",
                 when: ~U[2026-08-20 16:00:00Z],
                 now: ~U[2026-08-18 12:00:00Z]
               })

      refute aw["requirements"]["reservation_needed"]
    end
  end

  describe "intent strength + decay" do
    test "stale should_sometime does not drive world work" do
      r =
        IntentStrength.assess(%{
          intent_strength: "should_sometime",
          intent_observed_at: ~U[2026-02-01 12:00:00Z],
          now: ~U[2026-08-10 12:00:00Z]
        })

      assert r["intent_strength"] == "none"
      refute r["proactive_world_ok"]
    end

    test "strong commitment prepares" do
      r =
        IntentStrength.assess(%{
          set: true,
          intent_strength: "strong_commitment",
          now: ~U[2026-08-10 12:00:00Z]
        })

      assert r["proactive_prepare_ok"]
    end
  end

  describe "watch ≠ notify / prepare ≠ ask" do
    test "watched set plan three days out surfaces nothing" do
      assert {:ok, r} =
               ProactiveCompose.tick(%{
                 set: true,
                 plan_type: "dinner",
                 place: "Harbor",
                 destination: "Harbor",
                 when: ~U[2026-08-20 19:00:00Z],
                 now: ~U[2026-08-17 12:00:00Z],
                 plan_id: "p1",
                 conversation_id: "c1",
                 plan_version: 1,
                 human_reports_booked: true,
                 provider_confirmed: true
               })

      refute r["visible"]
      assert r["quiet_success"]
      assert r["prepare_early_interrupt_late"]
    end

    test "prepare tier can prepare privately without ask" do
      assert {:ok, prep} =
               BackgroundPrepare.run(
                 %{
                   set: true,
                   plan_type: "dinner",
                   place: "Harbor",
                   when: ~U[2026-08-20 19:00:00Z],
                   plan_version: 1,
                   travel_minutes: 25,
                   now: ~U[2026-08-19 10:00:00Z]
                 },
                 %{
                   "attention_tier" => "prepare",
                   "allowed_work" => AttentionTier.allowed_work("prepare")
                 }
               )

      refute prep["surface"]
      refute prep["ask"]
      refute prep["notify"]
      refute prep["sunk_cost_privilege"]
      assert prep["model_called"] == false
      assert prep["live_provider_called"] == false
    end
  end

  describe "surface routing" do
    test "active conversation preferred over push" do
      r =
        SurfaceRouter.route(%{
          attention_tier: "urgent_actionable",
          chat_open: true,
          minutes_to_leave: 15,
          time_sensitive: true
        })

      assert r["surface"] == "active_conversation"
      assert r["present"]
    end

    test "duplicate surface suppressed" do
      r =
        SurfaceRouter.route(%{
          attention_tier: "actionable",
          app_foreground: true,
          already_presented_surfaces: ["in_app_passive"]
        })

      assert r["present"] == false
    end

    test "open after push does not re-present by default" do
      o =
        SurfaceRouter.on_user_open_after_push(%{
          conversation_id: "c1",
          plan_id: "p1"
        })

      assert o["already_presented"]
      assert o["do_not_re_present_in_chat"]
      assert o["continuation_context"]["not_generic_home"]
    end
  end

  describe "due work" do
    test "idempotent schedule and version suppress" do
      due = ~U[2026-08-15 12:00:00Z]

      assert {:ok, a} =
               DueWork.schedule(%{
                 kind: "prepare_leave_by",
                 plan_id: "due1",
                 plan_version: 1,
                 due_at: due
               })

      assert {:ok, b} =
               DueWork.schedule(%{
                 kind: "prepare_leave_by",
                 plan_id: "due1",
                 plan_version: 1,
                 due_at: due
               })

      assert b["idempotent_hit"]

      assert {:ok, fire} =
               DueWork.fire_due(%{
                 plan_id: "due1",
                 plan_version: 2,
                 now: ~U[2026-08-15 13:00:00Z]
               })

      assert Enum.all?(fire["fires"], &(&1["outcome"] == "suppress"))
      assert a["global_periodic_scan"] == false
    end

    test "cancel on plan cancel" do
      assert {:ok, _} =
               DueWork.schedule(%{
                 kind: "watch_re_eval",
                 plan_id: "cx",
                 plan_version: 1,
                 due_at: DateTime.add(DateTime.utc_now(), 3600, :second)
               })

      assert {:ok, cancelled} = DueWork.cancel_for_plan("cx")
      assert cancelled != []
    end
  end

  describe "direction change discards sunk prep" do
    test "revalidate fails quietly" do
      assert {:ok, prep} =
               BackgroundPrepare.run(
                 %{
                   set: true,
                   plan_type: "dinner",
                   place: "Italian Spot",
                   plan_version: 1,
                   now: DateTime.utc_now()
                 },
                 %{"attention_tier" => "prepare", "allowed_work" => ["opportunity_zone"]}
               )

      assert {:ok, rev} =
               BackgroundPrepare.revalidate_for_surface(prep, %{
                 plan_version: 1,
                 humans_changed_direction: true,
                 desired_category: "park"
               })

      refute rev["usable"]
      assert rev["discard_quietly"]
      refute rev["sunk_cost_privilege"]
    end
  end

  describe "proactive opening" do
    test "weak opening stays quiet" do
      assert {:ok, r} =
               ProactiveCompose.opening_tick(%{
                 participant_ids: ["a", "b"],
                 willingness_ok: true,
                 time_compatible: false,
                 intent_strength: "casual_mention"
               })

      refute r["visible"]
    end

    test "cold recommendation flag never surfaces" do
      assert {:ok, r} =
               ProactiveCompose.opening_tick(%{
                 participant_ids: ["a", "b"],
                 viable_participant_ids: ["a", "b"],
                 time_compatible: true,
                 willingness_ok: true,
                 proximity_ok: true,
                 world_opportunity: true,
                 cold_recommendation: true
               })

      refute r["visible"]
      assert r["reason"] == "weak_or_cold_opening"
    end
  end

  describe "required follow-up" do
    test "private to one person" do
      q =
        ProactiveCompose.required_follow_up(%{
          required_participant_unresolved: true,
          required_user_id: "u9"
        })

      assert q["private"]
      refute q["public_callout"]
      assert q["user_id"] == "u9"
    end

    test "optional silence not nagged" do
      q =
        ProactiveCompose.required_follow_up(%{
          required_participant_unresolved: false,
          optional_only_silent: true
        })

      refute q["visible"]
    end
  end

  describe "asymmetric prep" do
    test "organizer vs nearby differ privately" do
      rows =
        ProactiveCompose.asymmetric_prep(
          %{reservation_needed: true},
          [
            %{user_id: "org", role: "organizer"},
            %{user_id: "near", nearby: true},
            %{user_id: "far", long_distance: true}
          ]
        )

      assert Enum.find(rows, &(&1["user_id"] == "org"))["private_focus"] == "booking_context"
      assert Enum.find(rows, &(&1["user_id"] == "near"))["private_focus"] == "nothing"
      assert Enum.find(rows, &(&1["user_id"] == "far"))["private_focus"] == "leave_by_later"
      assert Enum.all?(rows, &(&1["group_manager_ui"] == false))
    end
  end

  describe "noise + labor benchmarks" do
    test "7-day noise: many events, few surfaces" do
      b = ProactiveCompose.noise_benchmark(%{})
      assert b["total_internal_events"] >= 40
      assert b["visible_surfaces"] <= 4
      assert b["pass"]
    end

    test "less software labor estimate" do
      l =
        ProactiveCompose.labor_removed_estimate(%{
          set: true,
          place: "Harbor",
          reminder_useful: true
        })

      assert l["steps_removed"] >= 2
      refute l["group_manager_ui"]
      refute l["task_assignments"]
    end
  end

  describe "material change triggers" do
    test "non-material skipped" do
      assert {:ok, r} =
               ProactiveCompose.on_material_change(
                 %{set: true, plan_type: "dinner", when: ~U[2026-08-20 19:00:00Z]},
                 "typing_indicator"
               )

      assert r["skipped"]
      refute r["visible"]
    end
  end

  describe "human in conversation during urgency" do
    test "does not push when chat open" do
      assert {:ok, r} =
               ProactiveCompose.tick(%{
                 set: true,
                 plan_type: "dinner",
                 place: "Harbor",
                 destination: "Harbor",
                 when: ~U[2026-08-14 19:00:00Z],
                 now: ~U[2026-08-14 18:40:00Z],
                 plan_id: "urg",
                 conversation_id: "c",
                 plan_version: 1,
                 provider_confirmed: true,
                 human_reports_booked: true,
                 chat_open: true,
                 navigation_useful: true
               })

      # May surface in conversation or stay quiet if JIT says nothing — never prefer push
      if r["visible"] do
        assert get_in(r, ["surface", "delivery_surface"]) in [
                 "active_conversation",
                 nil,
                 "in_app_passive"
               ] or
                 get_in(r, ["decision", "route", "surface"]) == "active_conversation"
      end
    end
  end
end
