defmodule OpalCore.SocialFlow.OrganismBreakerTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.{
    HistoricalIntelligenceReconciliation,
    MicroJourney,
    OrganismBreaker,
    PrivatePreparation
  }

  describe "git-verified prior SHAs are the foundation" do
    test "historical reconciliation has no lost capabilities marked not_found" do
      s = HistoricalIntelligenceReconciliation.summary()
      assert s["lost_count"] == 0
      assert s["capability_rows"] >= 30
      assert s["present_or_partial"] >= 25
      # Duplicates are risks to track, not silent loss
      assert is_list(s["duplicated_risks"])
    end
  end

  describe "private preparation leadership" do
    test "stealth date sequence does not auto-send private steps" do
      refute PrivatePreparation.private_prep_equals_shared?()
      refute PrivatePreparation.leadership_is_control?()
      refute PrivatePreparation.auto_sends_to_peers?(:select_place)
      refute PrivatePreparation.auto_sends_to_peers?(:prepare_surprise)
      assert PrivatePreparation.auto_sends_to_peers?(:share_place)

      seq =
        PrivatePreparation.stealth_date_sequence([
          :curate_accept,
          :select_place,
          :prepare_surprise,
          :share_place
        ])

      assert seq["leak_free"] == true
      assert seq["private_steps"] == 3
      assert seq["shared_steps"] == 1
    end
  end

  describe "micro-journey engagement law still holds" do
    test "points streaks and compulsion rewards prohibited" do
      p = MicroJourney.prohibited_mechanics()
      assert :points_for_app_open in p
      assert :daily_use_streak in p
      assert :variable_compulsion_reward in p
      assert :partner_driven_interrupt in p
    end
  end

  describe "ORGANISM BREAKER soak — not 24 combos" do
    test "512 seeded scenarios pass cross-layer invariants" do
      report = OrganismBreaker.run(rounds: 512, base_seed: 42)

      assert report["rounds"] == 512
      assert report["not_architecture_admiration"] == true
      assert report["honest_scope"] == "domain_composition_soak"
      assert "live_economic_value" in report["does_not_claim"] or
               "live_economic_value" in (report["does_not_claim"] || [])

      # Must not claim UI soak done
      assert report["scorecard"]["ui_390_soak"] == "NOT_RUN"
      assert report["scorecard"]["multi_client_realtime_soak"] == "NOT_RUN"
      assert report["scorecard"]["follow_graph_durable"] == "NOT_POSTGRES"

      # Failures must be empty — if not, print classes for repair
      unless report["pass"] do
        flunk("""
        ORGANISM BREAKER FAILED
        failed=#{report["failed"]}
        classes=#{inspect(report["failure_classes"])}
        sample=#{inspect(Enum.take(report["failures"], 3))}
        """)
      end

      assert report["pass"] == true
      assert report["failed"] == 0
      assert report["passed"] == 512
    end

    test "reproducible seed failure format" do
      r = OrganismBreaker.run_seed(42)
      assert Map.has_key?(r, "seed")
      assert Map.has_key?(r, "scenario")
      assert Map.has_key?(r, "pass")
      assert r["checks"] >= 8
    end

    test "1024 round pressure optional batch" do
      report = OrganismBreaker.run(rounds: 1024, base_seed: 7)
      assert report["rounds"] == 1024

      unless report["pass"] do
        flunk("1024 soak failed classes=#{inspect(report["failure_classes"])}")
      end

      assert report["failed"] == 0
    end
  end
end
