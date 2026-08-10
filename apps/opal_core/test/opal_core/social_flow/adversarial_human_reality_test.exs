defmodule OpalCore.SocialFlow.AdversarialHumanRealityTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Execution.{
    AdversarialConversation,
    AdversarialHumanReality,
    AdversarialJourneys,
    AdversarialPersonas,
    AdversarialSoak,
    CoordinationResidue
  }

  describe "personas" do
    test "operational profiles without moral labels" do
      inv = AdversarialHumanReality.persona_inventory()
      assert inv["pass"]
      assert inv["no_moral_labels"]
      assert "low_planning_participation" in inv["personas"]
      refute "lazy" in inv["personas"]
    end

    test "maturity group mix builds" do
      g = AdversarialPersonas.group(8, 0.5, required_count: 2)
      assert length(g) == 8
      assert Enum.count(g, & &1["mature"]) == 4
    end
  end

  describe "natural conversation" do
    test "matrix admits natural text and rejects weak over-upgrade" do
      m = AdversarialConversation.matrix()
      assert m["pass"]
      assert m["weak_not_over_upgraded"]
      assert m["no_set_from_weak"]
    end

    test "maybe does not authorize Set" do
      i = AdversarialConversation.interpret("maybe")
      refute i["admitted"]
      refute i["authorizes_set"]
      refute i["over_upgraded"]
    end

    test "phrase match does not false-fire on bare tokens" do
      assert AdversarialConversation.interpret("you guys go without me")["message_class"] ==
               "participation"

      assert AdversarialConversation.interpret("don't wait on me")["message_class"] ==
               "participation"

      assert AdversarialConversation.interpret("nah not there")["message_class"] == "veto"

      assert AdversarialConversation.interpret("i'm already downtown")["message_class"] ==
               "live_state"

      assert AdversarialConversation.interpret("i'm running late")["message_class"] ==
               "live_state"
    end
  end

  describe "courtship journeys" do
    test "low-effort path keeps forms at zero" do
      j = AdversarialJourneys.courtship_low_effort()
      assert j["pass"]
      assert j["forms"] == 0
      assert j["residue"]["irreducible_count"] >= 1
    end

    test "schedule withhold does not leak cause" do
      j = AdversarialJourneys.courtship_withhold_schedule()
      assert j["pass"]
      refute j["cause_leaked"]
    end

    test "contradiction current wins" do
      assert AdversarialJourneys.contradiction_current_wins()["pass"]
    end
  end

  describe "group journeys" do
    test "partial participation progresses without poll" do
      j = AdversarialJourneys.group_partial(8)
      assert j["pass"]
      refute j["universal_poll"]
    end

    test "required person blocks majority" do
      j = AdversarialJourneys.required_person_blocks()
      assert j["pass"]
      refute j["set_forced"]
    end

    test "organizer bias does not win by data volume" do
      assert AdversarialJourneys.organizer_bias()["pass"]
    end
  end

  describe "compound and residue" do
    test "plan1 to plan10 avoidable residue falls" do
      j = AdversarialJourneys.compound_plan_series()
      assert j["pass"]
      assert j["reduction"]["improved"]
      assert j["residue_plan_10"]["avoidable_count"] < j["residue_plan_1"]["avoidable_count"]
    end

    test "relationship scope isolation" do
      assert AdversarialJourneys.relationship_scope_isolation()["pass"]
    end
  end

  describe "privacy and soak" do
    test "privacy probe matrix" do
      assert AdversarialJourneys.privacy_probe_matrix()["pass"]
    end

    test "seeded soak is reproducible and clean" do
      a = AdversarialSoak.run_seed(42)
      b = AdversarialSoak.run_seed(42)
      assert a["pass"]
      assert a["seed"] == b["seed"]
      assert a["size"] == b["size"]
    end

    test "interaction late join capacity revision" do
      assert AdversarialSoak.interaction_late_join_capacity_revision()["pass"]
    end
  end

  describe "full campaign" do
    test "run_all local matrix with no open P0/P1" do
      r = AdversarialHumanReality.run_all(seeds: AdversarialSoak.default_seeds())
      assert r["pass"]
      assert r["defects"]["p0"]["open"] == []
      assert r["defects"]["p1"]["open"] == []
      assert r["laws"]["no_new_architecture_by_default"]
      assert r["hosted"]["do_not_fake"]
      assert r["pilot"]["recommendation"] == "READY FOR SMALL PILOT"
      assert r["coordination_residue"]["reduction"]["improved"]
    end
  end

  describe "residue metric" do
    test "irreducible authority is not avoidable" do
      refute CoordinationResidue.avoidable?("irreducible_human_authority")
      assert CoordinationResidue.avoidable?("product_defect")
    end
  end
end
