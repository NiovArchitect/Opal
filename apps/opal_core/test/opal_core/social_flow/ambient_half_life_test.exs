defmodule OpalCore.SocialFlow.AmbientHalfLifeTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Ambient.{
    Actionability,
    CapacityGap,
    Freshness,
    Incremental,
    PlanVersion,
    RecoveryPreservation,
    Resurface,
    RoleDependency,
    TrustFact
  }

  test "ladder: interesting is not visible interruption" do
    assert {:ok, low} =
             Actionability.classify(%{
               people_resolved: false,
               time_resolved: false
             })

    assert low["level"] == "interesting"
    assert low["interesting_is_not_visible"]
    refute low["deserves_attention"]
  end

  test "ladder: social viable without provider is not execution_ready" do
    assert {:ok, a} =
             Actionability.classify(%{
               people_resolved: true,
               viable_participant_ids: ["a", "b"],
               willingness_ok: true,
               time_resolved: true,
               place_resolved: true,
               travel_ok: true,
               budget_ok: true,
               permission_ok: true,
               provider_available: false
             })

    assert a["level"] in ~w(viable actionable relevant)
    refute a["level"] == "execution_ready"
  end

  test "execution_ready requires provider availability" do
    assert {:ok, a} =
             Actionability.classify(%{
               people_resolved: true,
               viable_participant_ids: ["a", "b"],
               willingness_ok: true,
               time_resolved: true,
               place_resolved: true,
               travel_ok: true,
               budget_ok: true,
               permission_ok: true,
               provider_available: true,
               execution_ready: true
             })

    assert a["level"] == "execution_ready"
    assert a["deserves_attention"]
  end

  test "source-specific half-life: location ages faster than saturday plan" do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    ago_2h = DateTime.add(now, -2 * 3600, :second)

    assert {:ok, loc} =
             Freshness.confidence(%{
               source_class: "current_location",
               observed_at: ago_2h,
               now: now
             })

    assert {:ok, sat} =
             Freshness.confidence(%{
               source_class: "saturday_plan",
               observed_at: ago_2h,
               now: now
             })

    assert loc["confidence"] < sat["confidence"]
    assert loc["stale"]
    refute sat["stale"]
  end

  test "native commitment lifecycle not wall-clock half-life" do
    assert {:ok, f} =
             Freshness.confidence(%{
               source_class: "native_commitment",
               lifecycle_active: true
             })

    assert f["confidence"] == 1.0
  end

  test "critical provider inventory stale forces recompute/suppress execution" do
    old =
      DateTime.utc_now() |> DateTime.add(-2 * 3600, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, d} =
             Freshness.dependency_freshness([
               %{
                 id: "provider_inventory",
                 source_class: "provider_inventory",
                 observed_at: old,
                 critical: true
               },
               %{
                 id: "time",
                 source_class: "saturday_plan",
                 observed_at: old,
                 critical: true
               }
             ])

    assert d["must_recompute"]
    assert d["must_suppress_execution"]
    assert "provider_inventory" in d["critical_stale"]
  end

  test "capacity overflow never silently drops people" do
    assert {:ok, g} = CapacityGap.evaluate(%{in_count: 5, capacity: 4, set: true})
    refute g["ok"]
    refute g["silently_dropped"]
    assert g["minimum_question"] == "different_place_or_smaller_group"
    assert g["social_set_intact"]
  end

  test "driver role absence fails despite majority in" do
    assert {:ok, r} =
             RoleDependency.evaluate(
               [
                 %{user_id: "d", response: "not_this_time", roles: ["driver"]},
                 %{user_id: "2", response: "im_in"},
                 %{user_id: "3", response: "im_in"},
                 %{user_id: "4", response: "im_in"}
               ],
               ["driver"]
             )

    refute r["roles_ok"]
    assert r["majority_cannot_override_role"]
  end

  test "resurface ignores rating noise" do
    assert {:ok, n} = Resurface.decide(["rating_micro_shift"])
    refute n["resurface"]
    assert {:ok, m} = Resurface.decide(["required_participant_left"])
    assert m["resurface"]
  end

  test "incremental: preference correction does not rebuild commitments" do
    {:partial, t} = Incremental.plan(["preference_correction"])
    assert "collective_fit" in t
    refute "group_viability" in t
    assert Incremental.preserves_context?("preference_correction")
  end

  test "plan version rejects late provider for old plan" do
    assert {:reject, r} =
             PlanVersion.gate_late_payload(
               %{"plan_version" => 2, "request_id" => "n"},
               %{"plan_version" => 1, "request_id" => "o", "available" => true}
             )

    assert r["must_not_surface"]
    assert r["must_not_change_execution"]
  end

  test "high confidence but stale must not influence" do
    old =
      DateTime.utc_now() |> DateTime.add(-4 * 3600, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, t} =
             TrustFact.evaluate(%{
               source_class: "current_location",
               observed_at: old,
               authority: 0.95
             })

    assert t["high_confidence_but_stale"]
    refute t["may_influence"]
    assert t["must_not_surface_from"]
  end

  test "TRUST FAILURE: proactive silence when evidence untrustworthy" do
    # Positive test companion: must remain silent / not influence
    old = DateTime.utc_now() |> DateTime.add(-90 * 60, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, t} =
             TrustFact.evaluate(%{
               source_class: "provider_inventory",
               observed_at: old
             })

    refute t["usable"]
  end

  test "recovery preserves resolved dimensions" do
    assert {:ok, m} = RecoveryPreservation.restaurant_filled_example()
    assert m["preserved_count"] >= 5
    refute m["restarted_time_inquiry"]
    refute m["restarted_who"]
  end

  test "explicit supersession retires old truth" do
    assert {:ok, s} =
             TrustFact.supersede(
               %{"id" => "t1", "day" => "thursday"},
               %{"id" => "t2", "day" => "friday", "observed_at" => DateTime.utc_now()}
             )

    assert s["retired"]["superseded"]
    assert s["active"]["day"] == "friday"
    assert s["active_uses_current_only"]
  end

  test "scope mismatch blocks influence" do
    assert {:ok, t} =
             TrustFact.evaluate(%{
               source_class: "explicit_willingness",
               observed_at: DateTime.utc_now(),
               plan_id: "p1",
               active_plan_id: "p2",
               lifecycle_active: true
             })

    # freshness ok but scope fails
    refute t["scope_ok"]
    refute t["may_influence"]
  end
end
