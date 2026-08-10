defmodule OpalCore.SocialFlow.RealityClosureTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Execution.{
    CoordinationResidue,
    HostedParity,
    PilotReadiness,
    RealityClosure
  }

  describe "coordination residue" do
    test "types distinguish avoidable vs irreducible" do
      assert CoordinationResidue.avoidable?("product_defect")
      assert CoordinationResidue.desirable?("irreducible_human_authority")
      refute CoordinationResidue.avoidable?("irreducible_human_authority")
    end

    test "maps open_maps with resolved destination as product defect" do
      c = CoordinationResidue.classify("open_maps", %{"destination_resolved" => true})
      assert c["type"] == "product_defect"
      assert c["avoidable"]
    end

    test "choose_meaningful_tradeoff is desirable agency" do
      c = CoordinationResidue.classify("choose_meaningful_tradeoff", %{})
      assert c["type"] in ~w(irreducible_human_authority desirable_human_choice)
    end

    test "episode reduction plan1 vs plan10" do
      story = PilotReadiness.residue_story()
      assert story["reduction"]["improved"]
      assert story["plan_10"]["avoidable_count"] < story["plan_1"]["avoidable_count"]
      assert story["plan_10"]["irreducible_count"] >= 1
    end
  end

  describe "hosted parity" do
    test "pending migrations after last hosted set" do
      m = HostedParity.migration_audit()
      # Post-deploy 2026-08-10: 20260817–19 applied on hosted boot
      assert m["pending_count"] == 0
      assert m["last_hosted_migration"] == "20260819000001"
    end

    test "capability gaps include server_deploy_needed when still stale" do
      a =
        HostedParity.audit(
          main_sha: "6a2cb6c",
          api_health: "timeout",
          commits_ahead_of_hosted_image: 127
        )

      assert a["health_200_insufficient"]
      assert a["recommendation_hint"] == "server_deploy_needed_before_pilot"
    end

    test "priority order starts with migrations" do
      a = HostedParity.audit()
      assert hd(a["priority_order"]) == "database_migrations"
    end
  end

  describe "pilot readiness" do
    test "current state READY after hosted adversarial closure" do
      p = PilotReadiness.evaluate_current()
      assert p["recommendation"] == "READY FOR SMALL PILOT"
      assert p["blockers"] == []
      refute Enum.any?(p["blockers"], &(&1["id"] == "server_image_stale"))
      refute Enum.any?(p["blockers"], &(&1["id"] == "migrations_pending"))
      assert p["no_vague_percentage"]
      assert p["providers"]["pilot_can_proceed_without_live_places"]
    end

    test "READY only when hosted adversarial flagged complete" do
      p =
        PilotReadiness.evaluate(
          main_sha: "45ab6df",
          api_health: "ok",
          web_http: "200",
          commits_ahead_of_hosted_image: 0,
          human_validation: %{"pass" => true, "harness_quality_still_green" => true},
          hosted_adversarial_complete: true
        )

      assert p["recommendation"] == "READY FOR SMALL PILOT"
      assert p["blockers"] == []
    end
  end

  describe "reality closure campaign" do
    test "report composes three tracks without new intelligence" do
      r =
        RealityClosure.report(
          main_sha: "e6eec0a",
          api_health: "ok",
          web_http: "200",
          commits_ahead_of_hosted_image: 0,
          hosted_adversarial_complete: true
        )

      assert r["pass"]
      assert r["laws"]["no_new_intelligence_module"]
      assert r["recommendation"] == "READY FOR SMALL PILOT"
      assert r["tracks"]["A_hosted_parity"]["migrations"]["pending_count"] == 0
      assert r["tracks"]["B_providers_devices"]["founder_only_for"] != []
      assert r["tracks"]["C_dogfood"]["do_not_manufacture_plan_series"]
    end
  end
end
