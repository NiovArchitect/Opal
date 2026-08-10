defmodule OpalCore.SocialFlow.HumanValidationTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Execution.{
    CorrectionLedger,
    HumanValidation,
    MaturityNetwork,
    QuestionLedger,
    RuntimeTruth
  }

  setup do
    QuestionLedger.reset()
    CorrectionLedger.reset()
    :ok
  end

  describe "natural conversation intake" do
    test "parses real language without developer jargon" do
      r = HumanValidation.conversation_intake()
      assert r["pass"]
      assert r["no_developer_language"]
      refute r["private_text_in_telemetry"]
      assert r["admitted"] >= 3
    end

    test "messages include founder-problem phrases" do
      msgs = HumanValidation.natural_messages()
      assert Enum.any?(msgs, &String.contains?(&1, "you pick"))
      assert Enum.any?(msgs, &String.contains?(&1, "thursday"))
      assert Enum.any?(msgs, &String.contains?(&1, "not too far"))
    end
  end

  describe "question ledger" do
    test "records privacy-safe reasons" do
      assert {:ok, e} =
               QuestionLedger.record(%{
                 reason_category: "missing_willingness",
                 topic: "thursday",
                 plan_index: 1
               })

      refute Map.has_key?(e, "text")
      refute e["private_text"]

      s = QuestionLedger.summary()
      assert s["questions_asked"] >= 1
      assert s["goal"] == "fewer_and_higher_value"
    end

    test "marks eliminable questions as opportunity" do
      {:ok, e} =
        QuestionLedger.record(%{
          reason_category: "missing_time",
          topic: "when",
          could_have_been_eliminated: true
        })

      QuestionLedger.mark_eliminable(e["id"], true)
      s = QuestionLedger.summary()
      assert s["could_have_been_eliminated"] >= 1
    end
  end

  describe "correction ledger" do
    test "time correction propagates dependently only" do
      r = HumanValidation.apply_time_correction()
      assert r["pass"]
      assert "time" in r["propagation"]["invalidated"]
      assert "relationship_context" in r["propagation"]["preserved"]
      refute r["stale_recommendation_continues"]
    end

    test "no user blame" do
      {:ok, e} =
        CorrectionLedger.record(%{
          target: "inference",
          failure_class: "wrong_preference"
        })

      refute e["user_blame"]
      s = CorrectionLedger.summary()
      refute s["user_blame"]
    end
  end

  describe "low-effort flagship" do
    test "minimal human authority is enough" do
      r = HumanValidation.low_effort_flagship()
      assert r["pass"]
      assert r["forms"] == 0
      assert r["searches"] == 0
      assert r["questions_to_low_effort"] <= 1
    end
  end

  describe "longitudinal real compound advantage" do
    test "plan 10 labor decreases vs plan 1" do
      r = HumanValidation.longitudinal_progress()
      assert r["pass"]
      assert r["labor_decreases"]
      assert r["plan_10_questions"] < r["plan_1_questions"]
    end
  end

  describe "privacy shared payload" do
    test "no private causes in shared copy" do
      r = HumanValidation.privacy_shared_payload()
      assert r["pass"]
      refute r["forbidden_in_copy"]
    end
  end

  describe "group partial win" do
    test "5 of 8 without universal poll" do
      r = HumanValidation.group_partial_win()
      assert r["pass"]
      assert r["no_universal_poll"]
      assert r["no_shame_absent"]
    end
  end

  describe "maturity network effect" do
    test "0% to 100% mature reduces questions" do
      r = MaturityNetwork.run(8)
      assert r["pass"]
      assert r["network_effect"]
      assert r["visible_stays_flat"]

      first = List.first(r["series"])
      last = List.last(r["series"])
      assert last["questions"] < first["questions"]
    end
  end

  describe "runtime truth" do
    test "honest classes never fake connected" do
      a = RuntimeTruth.audit()
      assert a["merged_ne_live"]
      assert a["silent_synthetic_as_real_forbidden"]
      assert is_list(a["capabilities"])

      assert Map.has_key?(a["by_class"], "client_contract") or
               Map.has_key?(a["by_class"], "synthetic") or
               Map.has_key?(a["by_class"], "real_handoff")
    end
  end

  describe "full validation campaign" do
    test "run_all is green without new intelligence layers" do
      report = HumanValidation.run_all()
      assert report["pass"], inspect(report)
      assert report["no_new_intelligence_layer"]
      assert report["harness_quality_still_green"]
    end
  end
end
