defmodule OpalCore.SocialFlow.CompoundQualityTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Execution.{
    AlignmentAdvantage,
    CompoundQuality,
    MemoryStore
  }

  setup do
    MemoryStore.reset()
    :ok
  end

  describe "alignment advantage" do
    test "structured work elimination not a public score" do
      adv =
        AlignmentAdvantage.measure(
          %{
            questions: 5,
            manual_steps: 8,
            candidates_considered: 40,
            provider_queries: 4,
            visible_options: 3,
            visible_interventions: 3,
            time_to_readiness_units: 100,
            privacy_violations: 0
          },
          %{
            questions: 1,
            manual_steps: 2,
            candidates_considered: 8,
            provider_queries: 1,
            visible_options: 1,
            visible_interventions: 1,
            time_to_readiness_units: 30,
            privacy_violations: 0,
            corrections: 0
          }
        )

      assert adv["advantage"]
      assert adv["deltas"]["questions_avoided"] == 4
      refute adv["public_score"]
      assert AlignmentAdvantage.summarize(adv)["summary_lines"] != []
    end
  end

  describe "dyad maturity Plan 1 vs Plan 10" do
    test "plan 10 is substantially easier than plan 1" do
      d = CompoundQuality.dyad_maturity_series()

      assert d["pass"]
      assert d["plan_10_easier"]
      assert d["plan_10_questions"] < d["plan_1_questions"]
      assert d["advantage_p1_vs_p10"]["advantage"]
      assert d["no_cross_relationship_leak"]
      assert d["noise_not_up"]
    end

    test "series includes plan 1 2 5 10 20" do
      d = CompoundQuality.dyad_maturity_series()
      indexes = Enum.map(d["series"], & &1["plan_index"])
      assert 1 in indexes
      assert 5 in indexes
      assert 10 in indexes
      assert 20 in indexes
    end
  end

  describe "group compression 2/4/8/20" do
    test "visible decisions stay ≤ 3 as private facts grow" do
      results = Enum.map([2, 4, 8, 20], &CompoundQuality.group_compression/1)

      assert Enum.all?(results, & &1["pass"])
      assert Enum.all?(results, & &1["visible_le_3"])

      facts = Enum.map(results, & &1["private_facts"])
      # private complexity grows with group size
      assert List.last(facts) > List.first(facts)
    end

    test "20-user group: hundreds of facts potential, ≤3 visible" do
      g = CompoundQuality.group_compression(20)
      assert g["pass"]
      assert g["private_facts"] >= 20
      assert g["visible_decisions"] <= 3
      refute g["private_leakage"]
    end
  end

  describe "fairness" do
    test "organizer 5x data does not auto-win" do
      f = CompoundQuality.fairness_suite()
      assert f["pass"]
      assert f["organizer_has_more"]
      assert f["most_data_does_not_win"]
      assert f["unknown_ne_approval"]
      refute f["private_leakage"]
    end
  end

  describe "current intent overrides prior" do
    test "fancy beats historical casual immediately" do
      r = CompoundQuality.current_intent_overrides_prior()
      assert r["pass"]
      assert r["current_wins"]
      assert r["no_argument"]
    end
  end

  describe "nonlinear composition" do
    test "A+B timing composition eliminates when-question" do
      r = CompoundQuality.nonlinear_composition_value()
      assert r["pass"]
      assert r["composition_eliminates_when_question"]
      assert r["greater_than_sum"]
    end
  end

  describe "compromise vs preference" do
    test "successful compromise is not personal love" do
      r = CompoundQuality.compromise_vs_preference()
      assert r["pass"]
      assert r["do_not_infer_a_loves_steakhouse"]
    end
  end

  describe "strategy prior flexible" do
    test "meaningful tradeoff can still surface two options" do
      r = CompoundQuality.strategy_prior_flexible()
      assert r["pass"]
      assert r["prior_not_forced"]
    end
  end

  describe "low-effort user" do
    test "collapses toward one concrete decision" do
      r = CompoundQuality.low_effort_user_success()
      assert r["pass"]
      assert r["one_concrete"]
      assert r["forms_not_required"]
    end
  end

  describe "full campaign" do
    test "run_all passes" do
      report = CompoundQuality.run_all()
      assert report["pass"], "failed suites: #{inspect(report)}"
      assert report["moat"] == "coordination_work_disappears_because_opal_knows"
    end
  end
end
