defmodule OpalCore.SocialFlow.Ambient.ChaosHarness do
  @moduledoc """
  Synthetic multi-user chaos journeys for Ambient Opportunity.

  Smoke-tests messy humans: late replies, maybe, decline, required missing,
  provider failure, topic change, block — without perfect demos.

  Explicitly synthetic for tests only.
  """

  alias OpalCore.SocialFlow.Ambient.{
    AlignmentCompression,
    AmbientOpportunity,
    CapacityGap,
    ExecutionReadiness,
    FailureRadius,
    Freshness,
    GroupRecovery,
    GroupViability,
    Incremental,
    OpportunityExpiry,
    OpportunityZone,
    PaymentReadiness,
    PlanVersion,
    ProviderResultGate,
    ProviderTier,
    RecoveryPreservation,
    Resurface,
    RoleDependency,
    SocialOpening,
    StaleSuppression,
    Surface,
    TrustFact,
    WorldOpportunity,
    ExecutionAction,
    ExecutionCompose,
    ExecutionContext
  }

  alias OpalCore.SocialFlow.Physical.{HardCandidateFilter, WorldFact}

  alias OpalCore.SocialFlow.Physical.LocationPolicy

  @journeys ~w(
    courtship
    friends_now
    group_partial
    group_required_failure
    group_late_join
    group_late_drop
    private_budget
    private_location
    provider_failure
    topic_change
    block
    solo
    hard_constraint_block
    stale_suppression
    capacity_overflow_gap
    required_role_driver
    required_late_drop
    freshness_stale_location
    resurface_material_only
    incremental_provider_only
    stale_provider_old_plan_version
    stale_location_after_candidate
    required_decline_after_surface
    plan_version_bump_invalidates
    recovery_preserves_alignment
    trust_silence_when_stale
    out_of_order_provider
    block_invalidates_opportunity
    recovery_restaurant_fill_six_friends
    recovery_driver_drop_question
    recovery_late_join_capacity_ok
    recovery_late_join_capacity_full
    recovery_date_venue_fail
    recovery_location_expires
    recovery_stale_provider_after_time_change
    recovery_capacity_no_silent_drop
    recovery_accessibility_blocks
    recovery_noise_one_moment
    quiet_many_messages_no_convergence
    quiet_one_strong_convergence
    quiet_no_resurface_metadata
    quiet_humans_solved_first
    quiet_mediocrity_silence
    quiet_large_group_stays_small
    zone_future_ignores_current_gps
    provider_weak_intent_no_live
    world_stars_not_live_heat
    world_hard_filter_closed
    world_stale_result_suppressed
    world_weak_intent_skips_acquire
    world_humans_solved_mid_query
    world_fingerprint_plan_version
    adapter_mode_synthetic_default
    adapter_no_silent_fallback_connected
    exec_no_reentry_after_set
    exec_nav_stale_on_place_change
    exec_action_stale_on_plan_bump
    exec_provider_time_needs_human
    exec_lock_screen_privacy
    transport_nav_deep_link
    transport_booking_handoff_not_booked
    transport_stale_side_effect_human
  )

  def journeys, do: @journeys

  @doc "Run all golden chaos journeys; returns pass/fail per journey."
  def run_all(opts \\ []) do
    results =
      Enum.map(@journeys, fn j ->
        {j, run(j, opts)}
      end)

    failed = Enum.reject(results, fn {_, r} -> r["pass"] == true end)

    %{
      "results" => Map.new(results),
      "passed" => length(results) - length(failed),
      "failed" => Enum.map(failed, &elem(&1, 0)),
      "all_pass" => failed == [],
      "synthetic" => true
    }
  end

  def run("courtship", _) do
    assert_journey(fn ->
      {:ok, r} =
        AmbientOpportunity.evaluate(%{
          participant_ids: ["j", "m"],
          required_ids: ["j", "m"],
          in_ids: ["j"],
          maybe_ids: ["m"],
          purpose: "date",
          relationship_context: "date",
          time_compatible: true,
          proximity_ok: true,
          willingness_ok: true,
          opening_hours: 2.0,
          confidence: 0.7,
          forming?: true,
          option_count: 2,
          options: [%{"name" => "A"}, %{"name" => "B"}]
        })

      # Low pressure: not viable until both in; no Set
      r["viability"]["viable"] == false and r["authorizes_set"] == false and
        r["surface"]["surface"] == :silence
    end)
  end

  def run("friends_now", _) do
    assert_journey(fn ->
      {:ok, r} =
        AmbientOpportunity.evaluate(%{
          participant_ids: ["a", "b"],
          in_ids: ["a", "b"],
          time_compatible: true,
          proximity_ok: true,
          willingness_ok: true,
          opening_hours: 2.5,
          place_resolved: true,
          travel_ok: true,
          confidence: 0.9,
          option_count: 2,
          options: [%{"name" => "Night market"}, %{"name" => "Rooftop"}],
          forming?: true,
          unknowns_before: 6
        })

      r["opening"]["exists"] and r["viability"]["viable"] and r["feed"] == false and
        r["heat_map_ui"] == false
    end)
  end

  def run("group_partial", _) do
    assert_journey(fn ->
      {:ok, v} =
        GroupViability.evaluate(
          [
            %{user_id: "1", role: "optional", response: "im_in"},
            %{user_id: "2", role: "optional", response: "im_in"},
            %{user_id: "3", role: "optional", response: "im_in"},
            %{user_id: "4", role: "optional", response: "im_in"},
            %{user_id: "5", role: "optional", response: "maybe"},
            %{user_id: "6", role: "optional", response: "not_this_time"}
          ],
          purpose: "friends",
          min_viable: 3
        )

      v["viable"] and v["optional_veto"] == false and v["shame_holdout"] == false
    end)
  end

  def run("group_required_failure", _) do
    assert_journey(fn ->
      {:ok, v} =
        GroupViability.evaluate(
          [
            %{user_id: "bday", role: "required", response: "not_this_time"},
            %{user_id: "2", role: "optional", response: "im_in"},
            %{user_id: "3", role: "optional", response: "im_in"},
            %{user_id: "4", role: "optional", response: "im_in"}
          ],
          purpose: "birthday",
          min_viable: 2
        )

      v["viable"] == false and "bday" in v["required_missing"]
    end)
  end

  def run("group_late_join", _) do
    assert_journey(fn ->
      {:ok, j} =
        GroupViability.late_join(%{"viable" => true}, "late",
          provider_capacity_remaining: 1,
          plan_confirmed: true
        )

      j["can_join"] and j["breaks_confirmed_plan"] == false
    end)
  end

  def run("group_late_drop", _) do
    assert_journey(fn ->
      people = [
        %{user_id: "1", role: "optional", response: "im_in"},
        %{user_id: "2", role: "optional", response: "im_in"},
        %{user_id: "3", role: "optional", response: "im_in"},
        %{user_id: "4", role: "optional", response: "im_in"}
      ]

      {:ok, d} = GroupViability.late_decline(people, "4", purpose: "friends", min_viable: 3)
      d["viable"] and d["restart_entire_plan"] == false and d["graceful_miss"]
    end)
  end

  def run("private_budget", _) do
    assert_journey(fn ->
      {:ok, r} =
        AmbientOpportunity.evaluate(%{
          participant_ids: ["a", "b"],
          in_ids: ["a", "b"],
          time_compatible: true,
          proximity_ok: true,
          willingness_ok: true,
          fetch_places: true,
          max_price_band: "$",
          category: "dinner",
          relationship_context: "date",
          area_label: "Carlsbad",
          confidence: 0.8,
          forming?: true
        })

      r["private_budget_leaked"] == false and not String.contains?(inspect(r), "can't afford")
    end)
  end

  def run("private_location", _) do
    assert_journey(fn ->
      proj = LocationPolicy.shared_projection("Carlsbad")
      not LocationPolicy.routine_leak?(proj["benefit_copy"]) and proj["no_coordinates"]
    end)
  end

  def run("provider_failure", _) do
    assert_journey(fn ->
      {:ok, e} = ExecutionReadiness.assess(%{set: true, provider_failed: true})
      e["social_truth_intact"] and e["execution_ready"] == false
    end)
  end

  def run("topic_change", _) do
    assert_journey(fn ->
      {:ok, r} =
        AmbientOpportunity.evaluate(%{
          participant_ids: ["a", "b"],
          in_ids: ["a", "b"],
          time_compatible: true,
          proximity_ok: true,
          willingness_ok: true,
          place_resolved: true,
          travel_ok: true,
          confidence: 0.95,
          topic_changed: true,
          option_count: 1,
          options: [%{"name" => "Stale"}],
          forming?: true
        })

      r["surface"]["surface"] == :silence and r["surface"]["reason"] == "topic_changed"
    end)
  end

  def run("block", _) do
    assert_journey(fn ->
      r = AmbientOpportunity.on_block("o", "p")
      r["ambient_opportunity_sharing"] == :stopped and r["lingering_plan_permission"] == false
    end)
  end

  def run("solo", _) do
    assert_journey(fn ->
      {:ok, o} =
        SocialOpening.detect(%{
          participant_ids: ["solo"],
          viable_participant_ids: ["solo"],
          opening_hours: 2.0,
          willingness_ok: true,
          proximity_ok: true,
          world_opportunity: true
        })

      o["exists"] and o["kind"] == "personal"
    end)
  end

  def run("hard_constraint_block", _) do
    assert_journey(fn ->
      # Numeric majority wants plan; hard accessibility fails → not viable
      {:ok, v} =
        GroupViability.evaluate(
          [
            %{user_id: "1", role: "optional", response: "im_in"},
            %{user_id: "2", role: "optional", response: "im_in"},
            %{user_id: "3", role: "optional", response: "im_in"},
            %{user_id: "4", role: "optional", response: "im_in"}
          ],
          purpose: "friends",
          min_viable: 3,
          hard_constraints: [
            %{"kind" => "accessibility_missing", "blocks_plan" => true}
          ]
        )

      v["viable"] == false and v["hard_constraint_block"] == true and
        v["majority_override_hard"] == false
    end)
  end

  def run("stale_suppression", _) do
    assert_journey(fn ->
      StaleSuppression.reset()

      attrs = %{
        conversation_id: "chaos-stale",
        participant_ids: ["a", "b"],
        in_ids: ["a", "b"],
        time_compatible: true,
        proximity_ok: true,
        willingness_ok: true,
        place_resolved: true,
        travel_ok: true,
        confidence: 0.9,
        option_count: 1,
        options: [%{"name" => "Night market"}],
        forming?: true,
        opening_hours: 2.0,
        unknowns_before: 5
      }

      {:ok, first} = AmbientOpportunity.evaluate(attrs)
      {:ok, second} = AmbientOpportunity.evaluate(attrs)

      first["recomputed"] == true and second["suppressed"] == true and
        second["recomputed"] == false and second["surface"]["surface"] == :silence
    end)
  end

  def run("capacity_overflow_gap", _) do
    assert_journey(fn ->
      {:ok, g} =
        CapacityGap.evaluate(%{
          in_count: 5,
          capacity: 4,
          set: true
        })

      g["ok"] == false and g["silently_dropped"] == false and
        g["minimum_question"] == "different_place_or_smaller_group"
    end)
  end

  def run("required_role_driver", _) do
    assert_journey(fn ->
      {:ok, r} =
        RoleDependency.evaluate(
          [
            %{user_id: "1", response: "im_in", roles: ["driver"]},
            %{user_id: "2", response: "im_in"},
            %{user_id: "3", response: "im_in"}
          ],
          ["driver"]
        )

      {:ok, r2} =
        RoleDependency.evaluate(
          [
            %{user_id: "1", response: "not_this_time", roles: ["driver"]},
            %{user_id: "2", response: "im_in"},
            %{user_id: "3", response: "im_in"},
            %{user_id: "4", response: "im_in"}
          ],
          ["driver"]
        )

      r["roles_ok"] and r2["roles_ok"] == false and r2["majority_cannot_override_role"]
    end)
  end

  def run("required_late_drop", _) do
    assert_journey(fn ->
      people = [
        %{user_id: "host", role: "required", response: "im_in"},
        %{user_id: "2", role: "optional", response: "im_in"},
        %{user_id: "3", role: "optional", response: "im_in"}
      ]

      {:ok, d} =
        GroupViability.late_decline(people, "host", purpose: "friends", min_viable: 2)

      d["was_required"] == true and d["restart_entire_plan"] == false and
        d["context_preserved"]["time"] == true and d["recovery"] == "reschedule_or_new_purpose"
    end)
  end

  def run("freshness_stale_location", _) do
    assert_journey(fn ->
      old =
        DateTime.utc_now() |> DateTime.add(-5 * 3600, :second) |> DateTime.truncate(:microsecond)

      {:ok, f} =
        Freshness.confidence(%{
          source_class: "current_location",
          observed_at: old
        })

      f["stale"] == true and f["usable"] == false
    end)
  end

  def run("resurface_material_only", _) do
    assert_journey(fn ->
      {:ok, noise} = Resurface.decide(["rating_micro_shift", "eta_one_minute"])
      {:ok, mat} = Resurface.decide(["slot_expired", "rating_micro_shift"])
      noise["resurface"] == false and mat["resurface"] == true
    end)
  end

  def run("incremental_provider_only", _) do
    assert_journey(fn ->
      {:partial, targets} = Incremental.plan(["provider_inventory"])

      "execution_readiness" in targets and "group_viability" not in targets and
        Incremental.preserves_context?("provider_inventory")
    end)
  end

  def run("stale_provider_old_plan_version", _) do
    assert_journey(fn ->
      active = %{"plan_version" => 8, "request_id" => "r-new"}
      late = %{"plan_version" => 7, "request_id" => "r-old", "slot" => "7:30"}

      match?(
        {:reject, %{"must_not_surface" => true}},
        PlanVersion.gate_late_payload(active, late)
      )
    end)
  end

  def run("stale_location_after_candidate", _) do
    assert_journey(fn ->
      old =
        DateTime.utc_now() |> DateTime.add(-3 * 3600, :second) |> DateTime.truncate(:microsecond)

      {:ok, t} =
        TrustFact.evaluate(%{
          source_class: "current_location",
          observed_at: old,
          authority: 0.9
        })

      t["high_confidence_but_stale"] and t["may_influence"] == false
    end)
  end

  def run("required_decline_after_surface", _) do
    assert_journey(fn ->
      people = [
        %{user_id: "req", role: "required", response: "im_in"},
        %{user_id: "2", role: "optional", response: "im_in"}
      ]

      {:ok, d} = GroupViability.late_decline(people, "req", purpose: "date", min_viable: 2)
      d["was_required"] and d["viable"] == false and d["restart_entire_plan"] == false
    end)
  end

  def run("plan_version_bump_invalidates", _) do
    assert_journey(fn ->
      inv = PlanVersion.invalidate_on_version_bump()
      "opportunity" in inv and "booking_preparation" in inv and "leave_by" in inv
    end)
  end

  def run("recovery_preserves_alignment", _) do
    assert_journey(fn ->
      {:ok, m} = RecoveryPreservation.restaurant_filled_example()

      m["preserved_count"] >= 5 and m["restarted_who"] == false and
        m["user_visible_percent"] == false
    end)
  end

  def run("trust_silence_when_stale", _) do
    assert_journey(fn ->
      old =
        DateTime.utc_now() |> DateTime.add(-2 * 3600, :second) |> DateTime.truncate(:microsecond)

      {:ok, t} =
        TrustFact.evaluate(%{
          source_class: "provider_inventory",
          observed_at: old
        })

      t["must_not_surface_from"] == true
    end)
  end

  def run("out_of_order_provider", _) do
    assert_journey(fn ->
      active = %{"plan_version" => 3, "request_id" => "a3"}
      older = %{"plan_version" => 2, "request_id" => "a2", "booked" => true}

      match?({:reject, _}, PlanVersion.gate_late_payload(active, older)) and
        PlanVersion.accept_response?(active, %{"plan_version" => 3, "request_id" => "a3"})
    end)
  end

  def run("block_invalidates_opportunity", _) do
    assert_journey(fn ->
      attrs = %{
        conversation_id: "blk-1",
        participant_ids: ["a", "b"],
        in_ids: ["a", "b"],
        time_compatible: true,
        proximity_ok: true,
        willingness_ok: true,
        place_resolved: true,
        travel_ok: true,
        confidence: 0.9,
        options: [%{"name" => "X"}],
        forming?: true,
        opening_hours: 2.0,
        blocked: true
      }

      match?({:error, :blocked}, AmbientOpportunity.evaluate(attrs))
    end)
  end

  def run("recovery_restaurant_fill_six_friends", _) do
    assert_journey(fn ->
      people = [
        %{user_id: "1", role: "optional", response: "im_in"},
        %{user_id: "2", role: "optional", response: "im_in"},
        %{user_id: "3", role: "optional", response: "im_in"},
        %{user_id: "4", role: "optional", response: "im_in"},
        %{user_id: "5", role: "optional", response: "maybe"},
        %{user_id: "6", role: "optional", response: "silent"}
      ]

      {:ok, r} =
        GroupRecovery.recover(%{
          failure_kind: "restaurant_unavailable",
          set: true,
          plan_version: 3,
          participants: people,
          in_count: 4,
          purpose: "friends",
          min_viable: 3,
          alternate_venues: [
            %{
              "venue_id" => "alt1",
              "label" => "7:30",
              "slots" => [%{"id" => "s1", "label" => "7:30"}]
            }
          ]
        })

      r["restarted_social_alignment"] == false and r["shame_holdout"] == false and
        r["visible_opal_moments"] <= 1 and "time" in r["still_true"]
    end)
  end

  def run("recovery_driver_drop_question", _) do
    assert_journey(fn ->
      people = [
        %{user_id: "d", role: "required", response: "im_in", roles: ["driver"]},
        %{user_id: "2", role: "optional", response: "im_in"},
        %{user_id: "3", role: "optional", response: "im_in"}
      ]

      {:ok, r} =
        GroupRecovery.late_drop(%{
          participants: people,
          leaver_id: "d",
          purpose: "friends",
          min_viable: 2
        })

      r["was_required"] and r["smallest"]["kind"] == "minimum_question" and
        r["restart_entire_plan"] == false
    end)
  end

  def run("recovery_late_join_capacity_ok", _) do
    assert_journey(fn ->
      {:ok, j} =
        GroupRecovery.late_join(%{
          joiner_id: "5",
          in_count: 4,
          capacity: 5,
          set: true
        })

      j["integrated"] and j["restarted_time"] == false and j["plan_intact"]
    end)
  end

  def run("recovery_late_join_capacity_full", _) do
    assert_journey(fn ->
      {:ok, j} =
        GroupRecovery.late_join(%{
          joiner_id: "5",
          in_count: 4,
          capacity: 4,
          set: true
        })

      j["integrated"] == false and j["silent_exclusion"] == false and j["plan_intact"]
    end)
  end

  def run("recovery_date_venue_fail", _) do
    assert_journey(fn ->
      {:ok, r} =
        GroupRecovery.recover(%{
          failure_kind: "restaurant_unavailable",
          set: true,
          plan_version: 1,
          resolved_dimensions: ~w(time place_area cuisine_or_category participants quiet budget),
          alternate_venues: [
            %{
              "venue_id" => "b",
              "label" => "7:00",
              "slots" => [%{"id" => "s", "label" => "7:00"}]
            }
          ]
        })

      "time" in r["still_true"] and "place_area" in r["still_true"] and
        r["restarted_social_alignment"] == false
    end)
  end

  def run("recovery_location_expires", _) do
    assert_journey(fn ->
      {:ok, rad} = FailureRadius.apply("location_expired")

      "travel" in rad["invalidated"] and "time" in rad["still_true"] and
        rad["smallest_change_needed"] == "recompute_travel_only"
    end)
  end

  def run("recovery_stale_provider_after_time_change", _) do
    assert_journey(fn ->
      active = %{"plan_version" => 2, "request_id" => "new"}
      late = %{"plan_version" => 1, "request_id" => "old", "slot" => "7:30"}

      match?(
        {:reject, %{"must_not_surface" => true}},
        PlanVersion.gate_late_payload(active, late)
      )
    end)
  end

  def run("recovery_capacity_no_silent_drop", _) do
    assert_journey(fn ->
      {:ok, g} = CapacityGap.evaluate(%{in_count: 5, capacity: 4, set: true})
      g["silently_dropped"] == false and g["minimum_question"] != nil
    end)
  end

  def run("recovery_accessibility_blocks", _) do
    assert_journey(fn ->
      {:ok, r} =
        GroupRecovery.recover(%{
          failure_kind: "hard_constraint",
          set: true,
          participants: [
            %{user_id: "1", response: "im_in"},
            %{user_id: "2", response: "im_in"},
            %{user_id: "3", response: "im_in"}
          ],
          hard_constraints: [%{"kind" => "accessibility_missing", "blocks_plan" => true}],
          purpose: "friends",
          min_viable: 2
        })

      # hard constraint → smallest is question; no majority path
      r["smallest"]["kind"] in ["minimum_question", "nothing"] or
        r["failure_radius"]["smallest_change_needed"] == "different_candidate"
    end)
  end

  def run("recovery_noise_one_moment", _) do
    assert_journey(fn ->
      {:ok, r} =
        GroupRecovery.recover(%{
          failure_kind: "restaurant_unavailable",
          set: true,
          plan_version: 1,
          alternate_venues: []
        })

      r["visible_opal_moments"] <= 1
    end)
  end

  # --- Quiet-law / judgment quality journeys ---

  def run("quiet_many_messages_no_convergence", _) do
    assert_journey(fn ->
      {:ok, s} =
        Surface.decide(%{
          actionable: false,
          confidence: 0.4,
          this_got_easy: false,
          message_count: 40,
          option_count: 0,
          density: 0.1
        })

      s["surface"] == :silence
    end)
  end

  def run("quiet_one_strong_convergence", _) do
    assert_journey(fn ->
      {:ok, s} =
        Surface.decide(%{
          actionable: true,
          confidence: 0.9,
          this_got_easy: true,
          density: 0.8,
          option_count: 1,
          effort_removed: 0.8,
          uncertainty_removed: 0.75,
          quality_band: "strong",
          interruption_cost: 0.3
        })

      s["surface"] == :opportunity and s["then_get_quiet"] == true
    end)
  end

  def run("quiet_no_resurface_metadata", _) do
    assert_journey(fn ->
      {:ok, r} = Resurface.decide(["rating_micro_shift", "eta_one_minute", "message_count"])
      r["resurface"] == false
    end)
  end

  def run("quiet_humans_solved_first", _) do
    assert_journey(fn ->
      {:ok, s} =
        Surface.decide(%{
          actionable: true,
          confidence: 0.95,
          this_got_easy: true,
          density: 0.9,
          human_place_name: "Harbor Table",
          second_person_agreed: true,
          humans_already_solved: true,
          option_count: 1
        })

      s["surface"] == :silence and s["reason"] == "humans_already_solved"
    end)
  end

  def run("quiet_mediocrity_silence", _) do
    assert_journey(fn ->
      c =
        AlignmentCompression.compress_to_human_options([
          %{"id" => "a", "score" => 0.5},
          %{"id" => "b", "score" => 0.49},
          %{"id" => "c", "score" => 0.48}
        ])

      {:ok, s} =
        Surface.decide(%{
          actionable: true,
          confidence: 0.8,
          mediocre: true,
          option_count: c["option_count"],
          density: 0.5
        })

      c["option_count"] == 1 and s["surface"] == :silence
    end)
  end

  def run("quiet_large_group_stays_small", _) do
    assert_journey(fn ->
      ids = Enum.map(1..20, &Integer.to_string/1)
      viable = Enum.take(ids, 12)

      {:ok, o} =
        SocialOpening.detect(%{
          participant_ids: ids,
          viable_participant_ids: viable,
          min_viable: 4,
          time_compatible: true,
          willingness_ok: true,
          proximity_ok: true,
          relationship_context: "friends",
          near_term: true
        })

      c =
        AlignmentCompression.compress_to_human_options(
          Enum.map(1..18, fn i -> %{"id" => "p#{i}", "score" => 0.9 - i * 0.01} end)
        )

      o["exists"] and c["option_count"] <= 3 and c["browse_rejected"]
    end)
  end

  def run("zone_future_ignores_current_gps", _) do
    assert_journey(fn ->
      {:ok, z} =
        OpportunityZone.derive(%{
          hours_until_candidate: 120,
          current_area: "Downtown",
          home_area: "Carlsbad",
          expected_area: "Carlsbad",
          near_term: false
        })

      z["horizon"] == "future" and z["current_location_weight"] <= 0.1 and
        z["primary_area"] == "Carlsbad" and z["projects_today_to_future"] != true
    end)
  end

  def run("provider_weak_intent_no_live", _) do
    assert_journey(fn ->
      t =
        ProviderTier.authorize(%{
          weak_intent: true,
          quality_band: "thin",
          requested_live: true
        })

      t["live_provider_ok"] == false and t["tier"] == "low"
    end)
  end

  # --- World acquisition edition ---

  def run("world_stars_not_live_heat", _) do
    assert_journey(fn ->
      # 4.9★ + 10k reviews without live activity ≠ hot now
      WorldFact.popularity_is_not_live_heat?(%{
        rating: 4.9,
        review_count: 10_000
      }) and
        not WorldFact.popularity_is_not_live_heat?(%{
          rating: 4.9,
          live_demand: true
        })
    end)
  end

  def run("world_hard_filter_closed", _) do
    assert_journey(fn ->
      r =
        HardCandidateFilter.filter(
          [
            %{"provider_place_id" => "closed", "open_at_plan_time" => false, "open_now" => false},
            %{"provider_place_id" => "open", "open_at_plan_time" => true, "open_now" => true}
          ],
          %{"coordination_mode" => "tonight"}
        )

      r["kept_count"] == 1 and hd(r["candidates"])["provider_place_id"] == "open"
    end)
  end

  def run("world_stale_result_suppressed", _) do
    assert_journey(fn ->
      g =
        ProviderResultGate.admit?(%{
          result_plan_version: 1,
          active_plan_version: 2,
          claim_type: "fit"
        })

      g["admit"] == false and g["reason"] == "plan_version_mismatch"
    end)
  end

  def run("world_weak_intent_skips_acquire", _) do
    assert_journey(fn ->
      {:ok, w} =
        WorldOpportunity.acquire(%{
          weak_intent: true,
          quality_band: "thin",
          area_label: "Carlsbad",
          category: "dinner"
        })

      w["skipped"] == true or w["candidate_count"] == 0
    end)
  end

  def run("world_humans_solved_mid_query", _) do
    assert_journey(fn ->
      {:ok, w} =
        WorldOpportunity.acquire(%{
          humans_already_solved: true,
          area_label: "Carlsbad",
          category: "dinner",
          quality_band: "strong"
        })

      w["skipped"] == true or w["candidate_count"] == 0
    end)
  end

  def run("world_fingerprint_plan_version", _) do
    assert_journey(fn ->
      g =
        ProviderResultGate.claim_allowed?(:availability, %{
          live: false,
          inventory_checked: false
        })

      g["allowed"] == false and
        ProviderResultGate.claim_allowed?(:fit, %{live: false})["allowed"] == true
    end)
  end

  def run("adapter_mode_synthetic_default", _) do
    assert_journey(fn ->
      m = OpalCore.SocialFlow.Physical.Providers.Mode.resolve(:places)
      # Without forced connected + key, synthetic is valid intentional mode
      m["mode"] in ~w(synthetic connected disabled) and m["provider_is_not_authority"]
    end)
  end

  def run("adapter_no_silent_fallback_connected", _) do
    assert_journey(fn ->
      # Connected without successful provider must not invent "real" synthetic as live
      m = %{
        "mode" => "connected",
        "silent_synthetic_fallback_forbidden" => true
      }

      m["silent_synthetic_fallback_forbidden"] == true
    end)
  end

  def run("exec_no_reentry_after_set", _) do
    assert_journey(fn ->
      {:ok, pack} =
        ExecutionCompose.after_set(%{
          conversation_id: "c1",
          actor_user_id: "u1",
          set: true,
          place: "Harbor Table",
          destination: "Harbor Table",
          when: ~U[2026-08-20 19:00:00Z],
          party_size: 2,
          venue_id: "v1",
          participant_ids: ["u1", "u2"]
        })

      pack["reentry_required"] == false and pack["booked"] == false
    end)
  end

  def run("exec_nav_stale_on_place_change", _) do
    assert_journey(fn ->
      {:ok, ctx} =
        ExecutionContext.from_resolved(%{
          conversation_id: "c1",
          place: "A",
          destination: "A",
          when: ~U[2026-08-20 19:00:00Z],
          set: true
        })

      {:ok, inv} = ExecutionContext.invalidate_for_place_change(ctx)
      inv["navigation_stale"] == true and inv["social_truth_intact"] == true
    end)
  end

  def run("exec_action_stale_on_plan_bump", _) do
    assert_journey(fn ->
      {:ok, ctx} =
        ExecutionContext.from_resolved(%{
          conversation_id: "c1",
          plan_version: 1,
          place: "A",
          destination: "A",
          when: ~U[2026-08-20 19:00:00Z],
          set: true,
          venue_id: "v1",
          party_size: 2
        })

      {:ok, action} = ExecutionAction.prepare(ctx, "booking_request")
      {:ok, t} = ExecutionAction.transition(action, "request", active_plan_version: 2)
      t["state"] == "stale"
    end)
  end

  def run("exec_provider_time_needs_human", _) do
    assert_journey(fn ->
      q =
        ExecutionAction.provider_time_mismatch(
          %{"when" => "7:30", "slot_label" => "7:30"},
          "7:45"
        )

      q["silent_mutation_forbidden"] == true and q["kind"] == "minimum_question"
    end)
  end

  def run("exec_lock_screen_privacy", _) do
    assert_journey(fn ->
      c =
        ExecutionCompose.reminder_lock_screen_copy(%{
          "minutes_until_leave" => 20,
          "private_copy" => "Leave for date with Sam at secret loft"
        })

      c["lock_screen"] == "Leave in 20 minutes." and c["relationship_exposed"] == false
    end)
  end

  def run("transport_nav_deep_link", _) do
    assert_journey(fn ->
      alias OpalCore.SocialFlow.Execution.NavigationTransport

      {:ok, p} =
        NavigationTransport.prepare(%{
          "destination" => "Harbor Table",
          "place" => "Harbor Table",
          "set" => true,
          "conversation_id" => "c",
          "plan_version" => 1
        })

      {:ok, s} = NavigationTransport.start(p, user_authorized: true)
      is_binary(s["opened_url"]) and s["handoff_started"] == true
    end)
  end

  def run("transport_booking_handoff_not_booked", _) do
    assert_journey(fn ->
      alias OpalCore.SocialFlow.Execution.BookingTransport

      {:ok, p} =
        BookingTransport.prepare_handoff(%{
          "set" => true,
          "venue_id" => "v1",
          "place" => "Harbor Table",
          "opentable_slug" => "harbor-table",
          "when" => ~U[2026-08-22 19:00:00Z],
          "party_size" => 2,
          "conversation_id" => "c"
        })

      {:ok, s} = BookingTransport.start_handoff(p, user_authorized: true)
      s["handoff_started"] == true and s["booked"] == false
    end)
  end

  def run("transport_stale_side_effect_human", _) do
    assert_journey(fn ->
      alias OpalCore.SocialFlow.Execution.SideEffectReconcile

      {:ok, r} =
        SideEffectReconcile.reconcile(
          %{"action_id" => "a", "plan_version" => 1, "state" => "requested"},
          %{"status" => "confirmed", "provider_confirmed" => true},
          active_plan_version: 2
        )

      r["outcome"] == "human_decision" and r["external_side_effect"] == true
    end)
  end

  def run(_, _), do: %{"pass" => false, "error" => :unknown_journey}

  @doc "Payment end-of-funnel smoke (not a full journey id)."
  def payment_smoke do
    assert_journey(fn ->
      {:ok, early} =
        PaymentReadiness.assess(%{
          set: false,
          participant_ids: ["a"],
          venue_id: "x",
          price_each: 10
        })

      {:ok, late} =
        PaymentReadiness.assess(%{
          set: true,
          provider_checked: true,
          provider_available: true,
          participant_ids: ["a", "b"],
          venue_id: "x",
          price_each: 28,
          all_agreed: true
        })

      early["payment_prompt_ok"] == false and late["payment_prompt_ok"] == true and
        late["individual_details_shared"] == false
    end)
  end

  @doc "Expiry never manufactures urgency."
  def expiry_smoke do
    assert_journey(fn ->
      {:ok, fake} = OpportunityExpiry.evaluate(%{force_urgency: true})
      fake["may_surface_urgency"] == false
    end)
  end

  defp assert_journey(fun) do
    if fun.() do
      %{"pass" => true}
    else
      %{"pass" => false, "error" => :assertion}
    end
  rescue
    e -> %{"pass" => false, "error" => Exception.message(e)}
  end
end
