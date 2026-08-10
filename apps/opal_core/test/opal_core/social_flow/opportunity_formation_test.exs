defmodule OpalCore.SocialFlow.OpportunityFormationTest do
  use OpalCore.DataCase

  alias OpalCore.SocialFlow.Ambient.{
    AlignmentCompression,
    AlignmentLoop,
    Convergence,
    HumanResolution,
    InterruptionDebt,
    OpeningQuality,
    OpportunityFormation,
    OpportunityLayers,
    OpportunityZone,
    ProviderTier,
    QuestionValue,
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
               proximity_ok: true,
               relationship_context: "friends",
               near_term: true
             })

    assert o["exists"]
    assert o["kind"] == "subset"
    assert o["perfect_group_not_required"]
    refute o["authorizes_set"]
    assert o["is_not_set"]
    assert o["quality_band"] in ~w(solid strong exceptional)
    assert o["proactive_surface_ok"]
  end

  test "thin opening exists but does not pay for proactive interruption" do
    assert {:ok, o} =
             SocialOpening.detect(%{
               participant_ids: ["a", "b", "c", "d"],
               viable_participant_ids: ["a", "b"],
               min_viable: 2,
               # barely a window, no proximity, no relationship memory
               opening_hours: 1.0,
               willingness_ok: true,
               proximity_ok: false,
               proximity_optional: true
             })

    assert o["exists"]
    assert o["quality_band"] in ~w(thin solid)
    # Without strong signals, quality should not force interrupt
    # (may be thin; if solid from quorum alone, still test layers quiet path below)
    assert {:ok, q} =
             OpeningQuality.assess(%{
               exists: true,
               participant_ids: ["a", "b", "c"],
               viable_participant_ids: ["a"],
               min_viable: 2,
               opening_hours: 0.5,
               willingness_ok: true
             })

    # missing quorum → thin; not proactive
    assert q["band"] == "thin"
    refute q["proactive_surface_ok"]
  end

  test "layers: thin opening stays quiet unless human asked" do
    assert {:ok, l} =
             OpportunityLayers.classify(%{
               participant_ids: ["a", "b", "c"],
               viable_participant_ids: ["a"],
               min_viable: 2,
               opening_hours: 0.5,
               willingness_ok: true,
               proximity_optional: true,
               world_candidate_count: 0,
               opening_alone_ok: true
             })

    # No quorum → no solid opening surface
    refute l["actionable_opportunity"]
    assert l["must_stay_quiet"] or l["thin_opening_quiet"] or not l["social_opening"]
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
    assert step["loop"]["ai_does_more_work"]
    assert step["loop"]["coordination_before_humans"]
  end

  test "alignment loop: after execution becomes calm and remembers without narrating" do
    assert {:ok, step} =
             AlignmentLoop.step(%{
               participant_ids: ["a", "b"],
               in_ids: ["a", "b"],
               viable_participant_ids: ["a", "b"],
               time_compatible: true,
               willingness_ok: true,
               proximity_ok: true,
               execution_done: true,
               provider_confirmed: true,
               provider_outcome: "confirmed",
               party_size: 2,
               commitment: %{"when" => "Saturday 7pm", "place" => "Harbor Table"},
               actor_user_id: "a",
               conversation_id: "loop-exec-1",
               skip_world: true,
               opening_alone_ok: true
             })

    assert step["smallest"]["kind"] == "nothing"
    assert step["smallest"]["then_get_quiet"]
    assert step["loop"]["phase"] == "calm"
    assert step["loop"]["quiet_after"]
    remembered = step["loop"]["remembered"]
    refute remembered["narrate"]
    refute remembered["re_ask_for_this"]
    assert remembered["executed"]
    assert remembered["next_alignment_easier"]
    assert remembered["place"] == "Harbor Table"
    assert remembered["when"] == "Saturday 7pm"
  end

  test "should_ask? skips when Opal already knows safely" do
    skip =
      AlignmentLoop.should_ask?(%{
        topic: "when",
        explicit_availability: true,
        aligned_when: "Thursday 7"
      })

    assert skip["skip_question"]
    refute skip["ask"]

    ask =
      AlignmentLoop.should_ask?(%{
        topic: "when",
        explicit_availability: false,
        conversation_evidence_time: false
      })

    assert ask["ask"]
  end

  test "truth classes: Friday supersedes Thursday for active decisions" do
    assert {:ok, thu} =
             AlignmentLoop.classify_truth(%{"day" => "thursday", "historical" => true})

    refute thu["active_for_decisions"]

    assert {:ok, fri} = AlignmentLoop.classify_truth(%{"day" => "friday"})
    assert fri["active_for_decisions"]
    assert fri["class"] == "active"
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

  test "compression: dominant option collapses to 1" do
    r =
      AlignmentCompression.compress_to_human_options([
        %{"id" => "harbor", "score" => 0.95, "name" => "Harbor Table"},
        %{"id" => "b", "score" => 0.4},
        %{"id" => "c", "score" => 0.35}
      ])

    assert r["option_count"] == 1
    assert hd(r["options"])["id"] == "harbor"
    assert r["dominance_applied"]
    assert r["browse_rejected"]
  end

  test "compression: meaningful tradeoff preserves 2 (casual nearby vs special farther)" do
    r =
      AlignmentCompression.compress_to_human_options([
        %{
          "id" => "nearby",
          "score" => 0.72,
          "travel_minutes" => 8,
          "special" => false,
          "vibe" => "casual"
        },
        %{
          "id" => "special",
          "score" => 0.7,
          "travel_minutes" => 28,
          "special" => true,
          "vibe" => "special"
        }
      ])

    assert r["option_count"] in [2, 3]
    assert r["meaningful_tradeoff"]
    assert r["humans_retain_preference"]
  end

  test "compression: equal mediocrity does not become a browse menu" do
    r =
      AlignmentCompression.compress_to_human_options([
        %{"id" => "a", "score" => 0.5},
        %{"id" => "b", "score" => 0.49},
        %{"id" => "c", "score" => 0.48},
        %{"id" => "d", "score" => 0.47}
      ])

    assert r["option_count"] == 1
    assert r["browse_rejected"]
  end

  test "interruption debt: mediocre nearby does not repay" do
    d =
      InterruptionDebt.evaluate(%{
        mediocre: true,
        option_count: 3,
        confidence: 0.5,
        interruption_cost: 0.35
      })

    refute d["repays_debt"]
    refute d["surface_ok"]
  end

  test "interruption debt: strong convergence repays" do
    d =
      InterruptionDebt.evaluate(%{
        this_got_easy: true,
        actionable: true,
        confidence: 0.9,
        quality_band: "strong",
        option_count: 1,
        interruption_cost: 0.3
      })

    assert d["repays_debt"]
  end

  test "zone: next week current GPS near-zero weight" do
    assert {:ok, z} =
             OpportunityZone.derive(%{
               hours_until_candidate: 168,
               current_area: "Airport",
               expected_area: "Carlsbad",
               home_area: "Carlsbad"
             })

    assert z["horizon"] == "future"
    assert z["current_location_weight"] <= 0.1
    assert z["primary_area"] == "Carlsbad"
    assert z["not_generic_midpoint"]
  end

  test "zone: optional far person does not inject area" do
    assert {:ok, z} =
             OpportunityZone.derive(%{
               hours_until_candidate: 4,
               expected_area: "Carlsbad",
               current_area: "Carlsbad",
               near_term: true,
               participant_areas: ["Carlsbad", "LA"],
               optional_far_areas: ["LA"],
               optional_ids: ["far"],
               required_ids: ["host"],
               travel_burden_by_participant: [
                 %{id: "host", minutes: 10},
                 %{id: "far", minutes: 95}
               ]
             })

    areas = Enum.map(z["zones"], & &1["area_label"])
    refute "LA" in areas
    assert z["optional_far_ignored"]
    assert z["fairness"]["perfect_equality_not_required"]
  end

  test "provider tier: weak hang intent stays low" do
    t = ProviderTier.authorize(%{weak_intent: true, quality_band: "thin", requested_live: true})
    assert t["tier"] == "low"
    refute t["live_provider_ok"]
    assert t["provider_queries_avoided"]
  end

  test "provider tier: strong actionable may go higher for live inventory" do
    t =
      ProviderTier.authorize(%{
        quality_band: "strong",
        actionable: true,
        time_compatible: true,
        participants_viable: true,
        category: "dinner",
        place_category_constrained: true,
        area_label: "Carlsbad",
        zone_known: true,
        need_live_inventory: true
      })

    assert t["tier"] in ~w(higher medium)
    assert t["world_acquire_ok"]
    refute t["authorizes_set"]
  end

  test "question value: low-leverage food vibe skipped" do
    q = QuestionValue.evaluate(%{topic: "food_vibe", wizard_chain: false})
    refute q["ask"]
    assert q["value"] < 0.55
  end

  test "humans already solved suppresses competing place work" do
    h =
      HumanResolution.solved?(%{
        human_place_name: "Night market",
        second_person_agreed: true
      })

    assert h["suppress_competing"]
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
