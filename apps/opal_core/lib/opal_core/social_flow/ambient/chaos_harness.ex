defmodule OpalCore.SocialFlow.Ambient.ChaosHarness do
  @moduledoc """
  Synthetic multi-user chaos journeys for Ambient Opportunity.

  Smoke-tests messy humans: late replies, maybe, decline, required missing,
  provider failure, topic change, block — without perfect demos.

  Explicitly synthetic for tests only.
  """

  alias OpalCore.SocialFlow.Ambient.{
    AmbientOpportunity,
    CapacityGap,
    ExecutionReadiness,
    FailureRadius,
    Freshness,
    GroupRecovery,
    GroupViability,
    Incremental,
    OpportunityExpiry,
    PaymentReadiness,
    PlanVersion,
    RecoveryPreservation,
    Resurface,
    RoleDependency,
    SocialOpening,
    StaleSuppression,
    TrustFact
  }

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
