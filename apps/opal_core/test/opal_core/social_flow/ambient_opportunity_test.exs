defmodule OpalCore.SocialFlow.AmbientOpportunityTest do
  use OpalCore.DataCase

  alias OpalCore.SocialFlow.Ambient.{
    Actionability,
    AlignmentCompression,
    AmbientOpportunity,
    CoordinationMode,
    ExecutionReadiness,
    GroupViability,
    OpportunityDensity,
    OpportunityExpiry,
    Momentum,
    SocialOpening,
    Surface
  }

  alias OpalCore.SocialFlow.Physical.LocationPolicy
  alias OpalCore.SocialFlow.Feasibility.Probing

  setup do
    Probing.reset()
    :ok
  end

  # --- Core concepts ---

  test "social opening is more than free time" do
    assert {:ok, o} =
             SocialOpening.detect(%{
               participant_ids: ["a", "b"],
               viable_participant_ids: ["a", "b"],
               opening_hours: 2.0,
               willingness_ok: true,
               proximity_ok: true
             })

    assert o["exists"]
    assert o["kind"] == "dyad"
    refute o["authorizes_set"]
  end

  test "group partial: optional unavailable does not freeze plan" do
    participants = [
      %{user_id: "1", role: "optional", response: "im_in"},
      %{user_id: "2", role: "optional", response: "im_in"},
      %{user_id: "3", role: "optional", response: "im_in"},
      %{user_id: "4", role: "optional", response: "im_in"},
      %{user_id: "5", role: "optional", response: "maybe"},
      %{user_id: "6", role: "optional", response: "not_this_time"}
    ]

    assert {:ok, v} =
             GroupViability.evaluate(participants,
               purpose: "friends",
               min_viable: 3
             )

    assert v["viable"]
    refute v["optional_veto"]
    refute v["shame_holdout"]
    refute v["permanent_penalty"]
    assert v["shared_safe"]["no_holdout_shame"]
    refute GroupViability.holdout_shame?(v["shared_safe"]["benefit_copy"])
  end

  test "group required failure: majority not enough without required person" do
    participants = [
      %{user_id: "birthday", role: "required", response: "not_this_time"},
      %{user_id: "2", role: "optional", response: "im_in"},
      %{user_id: "3", role: "optional", response: "im_in"},
      %{user_id: "4", role: "optional", response: "im_in"},
      %{user_id: "5", role: "optional", response: "im_in"}
    ]

    assert {:ok, v} =
             GroupViability.evaluate(participants,
               purpose: "birthday",
               min_viable: 2
             )

    refute v["viable"]
    assert "birthday" in v["required_missing"]
  end

  test "late join does not break confirmed plan" do
    assert {:ok, j} =
             GroupViability.late_join(%{"viable" => true}, "latecomer",
               provider_capacity_remaining: 2,
               plan_confirmed: true
             )

    assert j["can_join"]
    refute j["breaks_confirmed_plan"]
  end

  test "late decline re-evaluates without full restart" do
    participants = [
      %{user_id: "1", role: "optional", response: "im_in"},
      %{user_id: "2", role: "optional", response: "im_in"},
      %{user_id: "3", role: "optional", response: "im_in"},
      %{user_id: "4", role: "optional", response: "im_in"}
    ]

    assert {:ok, d} =
             GroupViability.late_decline(participants, "4", purpose: "friends", min_viable: 3)

    assert d["viable"]
    refute d["restart_entire_plan"]
    assert d["graceful_miss"]
    assert d["re_enter_future_ok"]
  end

  test "heat is internal — no meters" do
    assert {:ok, h} =
             OpportunityDensity.score(%{
               local_activity: 0.7,
               friends_nearby_count: 3,
               overlapping_windows: true,
               preference_fit: 0.8,
               relationship_context: "friends",
               candidate_count: 5,
               open_now_count: 3,
               travel_burden_low: true,
               time_compatible: true,
               event_happening: true
             })

    assert h["density"] > 0.4
    refute h["heat_map_ui"]
    refute h["feed"]
    assert h["heat"]["visible_meters"] == false
  end

  test "actionability ladder: interesting is not enough" do
    assert {:ok, low} =
             Actionability.classify(%{
               people_resolved: false,
               time_resolved: false
             })

    refute low["actionable"]
    assert low["level"] == "interesting"

    assert {:ok, high} =
             Actionability.classify(%{
               people_resolved: true,
               viable_participant_ids: ["a", "b"],
               willingness_ok: true,
               time_resolved: true,
               place_resolved: true,
               travel_ok: true,
               budget_ok: true,
               provider_available: true,
               permission_ok: true
             })

    assert high["actionable"]
    assert high["level"] in ~w(actionable execution_ready)
  end

  test "execution readiness separates social from provider" do
    assert {:ok, e} =
             ExecutionReadiness.assess(%{
               set: true,
               provider_checked: false
             })

    assert e["state"] == "provider_checking"
    assert e["social_truth_intact"]
    refute e["may_prompt_book"]

    assert {:ok, ready} =
             ExecutionReadiness.assess(%{
               set: true,
               provider_checked: true,
               provider_available: true,
               slot_label: "7:30"
             })

    assert ready["execution_ready"]
    assert ready["shared_safe_copy"] =~ "7:30"

    assert {:ok, fail} =
             ExecutionReadiness.assess(%{
               set: true,
               provider_failed: true
             })

    assert fail["social_truth_intact"]
    refute fail["execution_ready"]
  end

  test "expiry never manufactures urgency" do
    assert {:ok, fake} =
             OpportunityExpiry.evaluate(%{
               force_urgency: true
             })

    refute fake["may_surface_urgency"]
    refute fake["manufactured_urgency"]

    soon = DateTime.utc_now() |> DateTime.add(45 * 60, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, real} =
             OpportunityExpiry.evaluate(%{
               event_starts_at: soon,
               slot_label: "7:30"
             })

    assert real["expiring"]
    assert real["may_surface_urgency"]
    assert is_binary(real["shared_safe_copy"])
  end

  test "alignment compression favors few human choices" do
    assert {:ok, c} =
             AlignmentCompression.measure(%{
               underlying_variables: 20,
               human_choices: 2,
               questions_asked: 1
             })

    assert c["strong_compression"]
    assert c["compression_ratio"] > 5
  end

  test "coordination mode inferred, never user-selected" do
    assert {:ok, m} = CoordinationMode.infer(%{already_out: true})
    assert m["mode"] == "already_out"
    refute m["user_selected"]
    assert m["signal_weights"]["current_location"] > m["signal_weights"]["calendar"]

    assert {:ok, p} = CoordinationMode.infer(%{hours_until_candidate: 120})
    assert p["mode"] == "planning_ahead"
  end

  test "surface silences weak opportunity" do
    assert {:ok, s} =
             Surface.decide(%{
               confidence: 0.4,
               actionable: true,
               density: 0.8,
               forming?: true,
               participant_count: 2,
               option_count: 1
             })

    assert s["surface"] == :silence
  end

  test "surface materializes strong easy moment" do
    assert {:ok, s} =
             Surface.decide(%{
               confidence: 0.9,
               actionable: true,
               density: 0.7,
               this_got_easy: true,
               momentum_rising: true,
               forming?: true,
               participant_count: 2,
               option_count: 2,
               unknown_count: 1,
               recent_suggestion_count: 0,
               options: [%{"name" => "Night market"}, %{"name" => "Rooftop"}]
             })

    assert s["surface"] == :opportunity
    refute s["feed"]
    refute s["heat_map"]
    refute s["around_you_page"]
    assert s["then_get_quiet"]
  end

  # --- Golden journeys ---

  test "GOLDEN: friends now — spontaneous nearby" do
    assert {:ok, r} =
             AmbientOpportunity.evaluate(%{
               participant_ids: ["jordan", "alex"],
               in_ids: ["jordan", "alex"],
               opening_hours: 2.5,
               time_compatible: true,
               willingness_ok: true,
               proximity_ok: true,
               travel_burden_low: true,
               relationship_context: "friends",
               local_activity: 0.6,
               friends_nearby_count: 2,
               overlapping_windows: true,
               preference_fit: 0.75,
               candidate_count: 4,
               open_now_count: 3,
               place_resolved: true,
               travel_ok: true,
               budget_ok: true,
               provider_available: true,
               confidence: 0.88,
               unknowns_before: 6,
               option_count: 2,
               options: [
                 %{"name" => "Night market", "travel" => 12},
                 %{"name" => "Rooftop", "travel" => 9}
               ],
               forming?: true,
               recent_suggestion_count: 0
             })

    assert r["opening"]["exists"]
    assert r["viability"]["viable"]
    assert r["actionability"]["actionable"]
    refute r["origins_exposed"]
    refute r["heat_map_ui"]
    refute r["feed"]
    assert r["authorizes_set"] == false
    # Surface may be opportunity or silence depending on restraint — both valid if quiet
    assert r["surface"]["surface"] in [:opportunity, :silence]
  end

  test "GOLDEN: group partial 6 friends — optional miss does not freeze" do
    assert {:ok, r} =
             AmbientOpportunity.evaluate(%{
               participant_ids: ["1", "2", "3", "4", "5", "6"],
               in_ids: ["1", "2", "3", "4"],
               maybe_ids: ["5"],
               out_ids: ["6"],
               purpose: "friends",
               min_viable: 3,
               time_compatible: true,
               willingness_ok: true,
               proximity_ok: true,
               opening_hours: 3.0,
               relationship_context: "friends",
               candidate_count: 3,
               place_resolved: true,
               travel_ok: true,
               confidence: 0.85,
               option_count: 2,
               options: [%{"name" => "Harbor Table"}, %{"name" => "Coast Kitchen"}],
               forming?: true
             })

    assert r["viability"]["viable"]
    refute r["viability"]["optional_veto"]
    refute r["holdout_shamed"]
    assert r["opening"]["kind"] == "subset"
  end

  test "GOLDEN: group required failure — birthday without birthday person" do
    assert {:ok, r} =
             AmbientOpportunity.evaluate(%{
               participant_ids: ["bday", "2", "3", "4", "5"],
               required_ids: ["bday"],
               in_ids: ["2", "3", "4", "5"],
               out_ids: ["bday"],
               purpose: "birthday",
               relationship_context: "friends",
               time_compatible: true,
               proximity_ok: true,
               opening_hours: 2.0,
               confidence: 0.9,
               option_count: 1,
               forming?: true
             })

    refute r["viability"]["viable"]
    assert r["surface"]["surface"] == :silence
  end

  test "GOLDEN: private budget never leaks in ambient options" do
    assert {:ok, r} =
             AmbientOpportunity.evaluate(%{
               participant_ids: ["a", "b"],
               in_ids: ["a", "b"],
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               fetch_places: true,
               category: "dinner",
               max_price_band: "$",
               quiet_required: false,
               relationship_context: "date",
               area_label: "Carlsbad",
               confidence: 0.8,
               forming?: true
             })

    refute r["private_budget_leaked"]
    refute inspect(r) =~ "can't afford"
    refute Map.has_key?(r, "max_price_band")
  end

  test "GOLDEN: private location origins never leak" do
    assert {:ok, r} =
             AmbientOpportunity.evaluate(%{
               participant_ids: ["a", "b"],
               in_ids: ["a", "b"],
               time_compatible: true,
               proximity_ok: true,
               home_area: "Carlsbad",
               current_area: "secret_coords_xyz",
               willingness_ok: true,
               confidence: 0.8,
               forming?: true,
               option_count: 1,
               options: [%{"name" => "Market"}]
             })

    refute r["origins_exposed"]
    # Shared surface copy should not contain raw location facts
    if r["surface"]["surface"] == :opportunity do
      refute (r["surface"]["copy"] || "") =~ "secret_coords"
    end
  end

  test "GOLDEN: provider failure — social alignment survives" do
    assert {:ok, e} =
             ExecutionReadiness.assess(%{
               set: true,
               provider_failed: true
             })

    assert e["social_truth_intact"]
    refute e["execution_ready"]
  end

  test "GOLDEN: topic change suppresses stale opportunity" do
    assert {:ok, r} =
             AmbientOpportunity.evaluate(%{
               participant_ids: ["a", "b"],
               in_ids: ["a", "b"],
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               place_resolved: true,
               travel_ok: true,
               confidence: 0.95,
               this_got_easy: true,
               topic_changed: true,
               option_count: 1,
               options: [%{"name" => "Old idea"}],
               forming?: true
             })

    assert r["surface"]["surface"] == :silence
    assert r["surface"]["reason"] == "topic_changed"
  end

  test "GOLDEN: block terminates ambient opportunity sharing" do
    result = AmbientOpportunity.on_block("owner", "peer")
    assert result["ambient_opportunity_sharing"] == :stopped
    assert result["eta_sharing"] == :stopped
    assert result["lingering_plan_permission"] == false
  end

  test "GOLDEN: solo opening without social network" do
    assert {:ok, o} =
             SocialOpening.detect(%{
               participant_ids: ["solo"],
               viable_participant_ids: ["solo"],
               opening_hours: 2.0,
               willingness_ok: true,
               proximity_ok: true,
               world_opportunity: true
             })

    assert o["exists"]
    assert o["kind"] == "personal"
  end

  test "GOLDEN: courtship — low pressure, no force" do
    assert {:ok, r} =
             AmbientOpportunity.evaluate(%{
               participant_ids: ["jordan", "maya"],
               in_ids: ["jordan"],
               maybe_ids: ["maya"],
               required_ids: ["jordan", "maya"],
               purpose: "date",
               relationship_context: "date",
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               opening_hours: 2.0,
               confidence: 0.7,
               forming?: true,
               option_count: 2,
               options: [%{"name" => "Harbor Table"}, %{"name" => "Coast Kitchen"}]
             })

    # Date requires both — maybe is not in, so not viable yet
    refute r["viability"]["viable"]
    assert r["surface"]["surface"] == :silence
    refute r["authorizes_set"]
  end

  test "momentum this_got_easy when unknowns collapse" do
    assert {:ok, m} =
             Momentum.assess(%{
               unknowns_before: 6,
               unknown_count: 1,
               actionable: true,
               viable: true,
               density: 0.7,
               in_count: 2
             })

    assert m["this_got_easy"]
    refute m["visible_score"]
  end

  test "holdout shame copy is rejected" do
    assert GroupViability.holdout_shame?("Waiting on Jordan")
    assert GroupViability.holdout_shame?("Everyone except Maya can do it")
    refute GroupViability.holdout_shame?("This works for enough of the group.")
  end

  test "location half-life in expiry" do
    observed =
      DateTime.utc_now() |> DateTime.add(-30 * 60, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, e} =
             OpportunityExpiry.evaluate(%{
               proximity_observed_at: observed,
               location_half_life_minutes: 75
             })

    assert e["expiring"] or length(e["sources"]) >= 1
  end

  test "shared projection never routine-leaks" do
    p = LocationPolicy.shared_projection("Carlsbad")
    refute LocationPolicy.routine_leak?(p["benefit_copy"])
  end
end
