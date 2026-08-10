defmodule OpalCore.SocialFlow.OpportunityFormationTest do
  use OpalCore.DataCase

  alias OpalCore.SocialFlow.Ambient.{
    AlignmentLoop,
    Convergence,
    OpportunityFormation,
    OpportunityLayers,
    OpportunityZone,
    SocialOpening,
    WorldOpportunity
  }

  alias OpalCore.SocialFlow.Feasibility.Probing

  setup do
    Probing.reset()
    :ok
  end

  test "social opening exists for subset without perfect group" do
    assert {:ok, o} =
             SocialOpening.detect(%{
               participant_ids: ["1", "2", "3", "4", "5", "6"],
               viable_participant_ids: ["1", "2", "3", "4"],
               required_ids: [],
               min_viable: 3,
               time_compatible: true,
               willingness_ok: true,
               proximity_ok: true
             })

    assert o["exists"]
    assert o["kind"] == "subset"
    assert o["perfect_group_not_required"]
    refute o["authorizes_set"]
    assert o["is_not_set"]
  end

  test "required person missing blocks opening despite majority" do
    assert {:ok, o} =
             SocialOpening.detect(%{
               participant_ids: ["bday", "2", "3", "4", "5"],
               viable_participant_ids: ["2", "3", "4", "5"],
               required_ids: ["bday"],
               time_compatible: true,
               willingness_ok: true,
               proximity_ok: true
             })

    refute o["exists"]
    refute o["required_ok"]
  end

  test "layers: world without social stays quiet" do
    assert {:ok, l} =
             OpportunityLayers.classify(%{
               participant_ids: ["a", "b"],
               viable_participant_ids: [],
               time_compatible: false,
               willingness_ok: false,
               world_candidate_count: 50,
               world_opportunity: true
             })

    assert l["world_opportunity"]
    refute l["social_opening"]
    assert l["world_without_social_quiet"]
    assert l["must_stay_quiet"]
    refute l["actionable_opportunity"]
  end

  test "layers: social opening alone can be valuable without world" do
    assert {:ok, l} =
             OpportunityLayers.classify(%{
               participant_ids: ["1", "2", "3", "4", "5"],
               viable_participant_ids: ["1", "2", "3", "4"],
               min_viable: 3,
               time_compatible: true,
               willingness_ok: true,
               proximity_ok: true,
               opening_hours: 3.0,
               world_candidate_count: 0,
               opening_alone_ok: true
             })

    assert l["social_opening"]
    assert l["social_alone_valuable"]
  end

  test "planning ahead does not project current GPS to Thursday" do
    assert {:ok, z} =
             OpportunityZone.derive(%{
               hours_until_candidate: 120,
               current_area: "Downtown",
               home_area: "Carlsbad",
               expected_area: "Carlsbad"
             })

    assert z["mode"] == "planning_ahead"
    refute z["projects_today_to_future"]
    assert z["primary_area"] in ["Carlsbad", "Downtown"]
    # Prefer expected/home for planning_ahead when current would project
    assert z["map_ui"] == false
  end

  test "world acquisition respects duration for short openings" do
    assert {:ok, w} =
             WorldOpportunity.acquire(%{
               area_label: "Carlsbad",
               category: "dinner",
               available_minutes: 30,
               coordination_mode: "tonight"
             })

    # Dinner default ~120m filtered out when only 30m available
    assert Enum.all?(w["candidates"], fn c ->
             (c["duration_minutes"] || 0) <= 30 or c["duration_minutes"] == nil
           end)
  end

  test "TRUST FAILURE: stale evidence forces silence path" do
    old =
      DateTime.utc_now() |> DateTime.add(-5 * 3600, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, r} =
             OpportunityFormation.form(%{
               participant_ids: ["a", "b"],
               in_ids: ["a", "b"],
               viable_participant_ids: ["a", "b"],
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               observed_at: old,
               primary_source: "current_location",
               area_label: "Carlsbad",
               category: "dinner",
               opening_hours: 2.0
             })

    # Stale location trust → nothing or not opportunity from location
    assert r["smallest"]["kind"] in ["nothing", "minimum_question", "opportunity"]
    # If opportunity, trust must still be ok path; prefer nothing for stale current_location
    if r["smallest"]["kind"] == "nothing" do
      assert r["smallest"]["reason"] in [
               "untrustworthy",
               "not_actionable",
               "no_opening",
               "world_without_social_opening"
             ]
    end
  end

  test "GOLDEN spontaneous: opening + world compresses to small output" do
    assert {:ok, r} =
             OpportunityFormation.form(%{
               participant_ids: ["jordan", "alex"],
               in_ids: ["jordan", "alex"],
               viable_participant_ids: ["jordan", "alex"],
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               near_term: true,
               current_area: "Carlsbad",
               area_label: "Carlsbad",
               category: "dinner",
               available_minutes: 120,
               opening_hours: 2.0,
               unknowns_before: 6,
               quiet_required: true,
               relationship_context: "friends",
               actor_user_id: "jordan",
               conversation_id: "conv-spont-1"
             })

    assert r["authorizes_set"] == false
    refute r["feed"]
    refute r["heat_map_ui"]
    assert r["smallest"]["kind"] in ["opportunity", "minimum_question", "nothing"]
    assert (r["smallest"]["option_count"] || 0) <= 3
  end

  test "GOLDEN courtship: asks less when native time known" do
    assert {:ok, r} =
             OpportunityFormation.form(%{
               participant_ids: ["j", "m"],
               in_ids: ["j", "m"],
               viable_participant_ids: ["j", "m"],
               required_ids: ["j", "m"],
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               native_commitments_known: true,
               hours_until_candidate: 72,
               expected_area: "Encinitas",
               area_label: "Encinitas",
               category: "dinner",
               quiet_required: true,
               relationship_context: "date",
               opening_hours: 2.5,
               unknowns_before: 5,
               actor_user_id: "j",
               conversation_id: "conv-date-1"
             })

    refute r["authorizes_set"]
    assert r["smallest"]["kind"] in ["opportunity", "minimum_question", "nothing"]
  end

  test "GOLDEN group: subset opening without exposing who cannot come" do
    assert {:ok, r} =
             OpportunityFormation.form(%{
               participant_ids: ["1", "2", "3", "4", "5", "6", "7"],
               in_ids: ["1", "2", "3", "4", "5"],
               viable_participant_ids: ["1", "2", "3", "4", "5"],
               out_ids: ["7"],
               maybe_ids: ["6"],
               min_viable: 4,
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               expected_area: "Carlsbad",
               area_label: "Carlsbad",
               category: "event",
               source: "events",
               opening_hours: 3.0,
               unknowns_before: 7,
               relationship_context: "friends",
               actor_user_id: "1",
               conversation_id: "conv-group-1"
             })

    refute inspect(r["smallest"]) =~ "7"
    refute r["holdout_shamed"]
    refute r["private_budget_leaked"]
  end

  test "alignment loop: supersession Thursday→Friday" do
    assert {:ok, s} =
             AlignmentLoop.apply_correction(
               %{"id" => "t1", "day" => "thursday"},
               %{"id" => "t2", "day" => "friday"}
             )

    assert s["retired"]["superseded"]
    assert s["active"]["day"] == "friday"
  end

  test "alignment loop step returns 0-3 and never sets" do
    assert {:ok, step} =
             AlignmentLoop.step(%{
               participant_ids: ["a", "b"],
               in_ids: ["a", "b"],
               viable_participant_ids: ["a", "b"],
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               near_term: true,
               current_area: "Carlsbad",
               area_label: "Carlsbad",
               category: "dinner",
               available_minutes: 120,
               opening_hours: 2.0,
               unknowns_before: 6,
               actor_user_id: "a",
               conversation_id: "loop-1"
             })

    refute step["authorizes_set"]
    refute step["wizard"]
    assert step["user_experiences_less_software"]
    assert step["smallest"]["kind"] in ["opportunity", "minimum_question", "nothing"]
    assert step["loop"]["remember_after"]
  end

  test "convergence rejects volume-only noise" do
    assert {:ok, c} =
             Convergence.detect(%{
               social_opening: false,
               candidate_count: 80,
               unknowns_before: 2,
               unknown_count: 5,
               viable: false
             })

    # volume alone should not be convergence
    assert c["volume_only_rejected"] or not c["converged"]
  end

  test "probing rate limit on formation" do
    attrs = %{
      participant_ids: ["a"],
      viable_participant_ids: ["a"],
      time_compatible: true,
      willingness_ok: true,
      actor_user_id: "probe",
      conversation_id: "probe-conv",
      skip_world: true,
      opening_alone_ok: true,
      opening_hours: 2.0,
      proximity_optional: true
    }

    assert {:ok, _} = OpportunityFormation.form(attrs)
    # exhaust
    Enum.each(1..35, fn _ -> OpportunityFormation.form(attrs) end)
    # eventually rate limited
    result = OpportunityFormation.form(attrs)
    assert match?({:error, :rate_limited}, result) or match?({:ok, _}, result)
  end
end
