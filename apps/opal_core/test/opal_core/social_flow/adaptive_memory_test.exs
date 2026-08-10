defmodule OpalCore.SocialFlow.AdaptiveMemoryTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Execution.{
    MemoryAdmission,
    MemoryCompose,
    MemoryFit,
    MemoryKind,
    MemoryMetrics,
    MemoryScope,
    MemoryStore,
    OutcomeLearning
  }

  setup do
    MemoryStore.reset()
    MemoryMetrics.reset()
    :ok
  end

  describe "memory earns retention" do
    test "explicit correction is gold" do
      assert {:ok, r} =
               MemoryCompose.remember(%{
                 explicit_correction: true,
                 text: "That place was way too loud.",
                 owner_user_id: "u1",
                 relationship_id: "u1|u2",
                 counterpart_user_id: "u2",
                 scope: "relationship"
               })

      assert r["remembered"]
      assert r["fact"]["kind"] == "explicit_correction"
      assert r["fact"]["dimension"] == "noise_level"
      assert r["fact"]["narrow_interpretation"]
      refute r["profile_machine"]
    end

    test "single choice is not favorite restaurant" do
      r =
        OutcomeLearning.from_outcome(%{
          chose_place: true,
          place: "Harbor Table",
          repeat_count: 1,
          user_id: "u1"
        })

      refute r["admit"]
      assert r["choice_ne_love"]
    end

    test "omission is weak evidence" do
      r = OutcomeLearning.from_outcome(%{not_selected: true, place: "A", user_id: "u1"})
      refute r["admit"]
      assert r["omission_ne_dislike"]
    end

    test "attendance is not enjoyment" do
      r =
        OutcomeLearning.from_outcome(%{
          plan_completed: true,
          place: "Harbor",
          user_id: "u1"
        })

      refute r["admit"]
      assert r["attendance_ne_enjoyment"]
    end

    test "does not retain without work value" do
      d =
        MemoryAdmission.evaluate(%{
          kind: "inferred_preference",
          value: "likes the color blue",
          owner_user_id: "u1"
        })

      refute d["admit"]
    end
  end

  describe "authority and kinds" do
    test "correction outranks inference" do
      assert MemoryKind.outranks?("explicit_correction", "inferred_preference")

      assert MemoryKind.authority_rank("explicit_fact") >
               MemoryKind.authority_rank("repeated_behavior")
    end

    test "python cannot direct-write" do
      d =
        MemoryAdmission.evaluate(%{
          kind: "explicit_fact",
          text: "quiet",
          work_eliminated: ["eliminate_question"],
          python_direct_write: true,
          owner_user_id: "u1"
        })

      refute d["admit"]
      assert d["reason"] == "python_cannot_write_durable_truth"
    end

    test "python proposal still goes through elixir admit" do
      assert {:ok, r} =
               MemoryCompose.remember_python_proposal(%{
                 kind: "inferred_preference",
                 value: "maybe jazz",
                 owner_user_id: "u1",
                 work_eliminated: ["improve_fit"],
                 evidence: "single_choice",
                 repeat_count: 1
               })

      # weak evidence should reject
      refute r["remembered"]
    end
  end

  describe "scope privacy" do
    test "relationship memory does not leak to other relationship" do
      assert {:ok, _} =
               MemoryCompose.remember(%{
                 explicit_correction: true,
                 text: "too loud for dates",
                 owner_user_id: "u1",
                 relationship_id: "u1|partner",
                 counterpart_user_id: "partner",
                 scope: "relationship",
                 dimension: "noise_level",
                 value: "quiet_for_dates"
               })

      a = MemoryStore.retrieve(%{"owner_user_id" => "u1", "relationship_id" => "u1|partner"})
      b = MemoryStore.retrieve(%{"owner_user_id" => "u1", "relationship_id" => "u1|friend"})

      assert a["count"] >= 1
      assert b["count"] == 0
    end

    test "plan-scoped is not durable universal" do
      d =
        MemoryAdmission.evaluate(%{
          kind: "explicit_fact",
          text: "I'm broke this week",
          owner_user_id: "u1",
          scope: "plan",
          plan_id: "p1",
          plan_scoped: true,
          dimension: "cost",
          value: "broke_this_week"
        })

      assert d["admit"]
      refute d["fact"]["durable"]
    end

    test "shared summary never exposes private budget" do
      s =
        MemoryCompose.shared_safe_summary([
          %{"dimension" => "cost", "value" => "broke", "visibility" => "private"}
        ])

      assert s["never_exposes"]
      assert s["shared_hints"] == []
    end
  end

  describe "correction is narrow" do
    test "too loud does not mean hates restaurants" do
      dim = MemoryScope.narrow_dimension("That restaurant was too loud.")
      assert dim == "noise_level"
      refute dim == "restaurants"
    end
  end

  describe "questions eliminated" do
    test "trusted memory eliminates quiet/lively re-ask" do
      assert {:ok, _} =
               MemoryCompose.remember(%{
                 explicit: true,
                 user_stated: true,
                 text: "Quiet places please",
                 owner_user_id: "u1",
                 relationship_id: "u1|u2",
                 counterpart_user_id: "u2",
                 scope: "relationship",
                 dimension: "noise_level",
                 value: "quiet"
               })

      assert {:ok, fit} =
               MemoryCompose.apply_to_alignment(%{
                 owner_user_id: "u1",
                 relationship_id: "u1|u2",
                 pending_questions: ["quiet_or_lively", "budget"]
               })

      assert fit["questions_eliminated"] >= 1
      assert fit["questions_still_needed"] < 2
      refute fit["based_on_your_preferences"]
    end

    test "multi-plan benchmark: fifth plan asks less" do
      b = MemoryCompose.multi_plan_benchmark()
      assert b["pass"]
      assert b["improved"]
      assert b["plan_5_questions"] < b["plan_1_questions"]
      assert b["no_cross_relationship_leak"]
    end
  end

  describe "candidate compression" do
    test "loud venues eliminated after too-loud correction" do
      assert {:ok, _} =
               MemoryCompose.remember(%{
                 explicit_correction: true,
                 text: "way too loud",
                 owner_user_id: "u1",
                 relationship_id: "r1",
                 scope: "relationship",
                 dimension: "noise_level",
                 value: "too_loud"
               })

      fit =
        MemoryFit.apply(
          %{"owner_user_id" => "u1", "relationship_id" => "r1"},
          candidates: [
            %{"place" => "Quiet Garden", "loud" => false},
            %{"place" => "Club X", "loud" => true, "vibe" => "lively"}
          ]
        )

      assert fit["candidates_eliminated"] >= 1
      assert Enum.any?(fit["kept_candidates"], &(&1["place"] == "Quiet Garden"))
    end
  end

  describe "supersession and forget" do
    test "new explicit supersedes old" do
      assert {:ok, r1} =
               MemoryCompose.remember(%{
                 explicit: true,
                 user_stated: true,
                 text: "I hate sushi",
                 owner_user_id: "u1",
                 scope: "user",
                 dimension: "cuisine",
                 value: "hate_sushi"
               })

      assert {:ok, r2} =
               MemoryCompose.remember(%{
                 explicit: true,
                 user_stated: true,
                 text: "I love sushi now",
                 owner_user_id: "u1",
                 scope: "user",
                 dimension: "cuisine",
                 value: "love_sushi"
               })

      old = MemoryStore.get(r1["fact"]["id"])
      new = MemoryStore.get(r2["fact"]["id"])
      assert old["superseded"] == true
      assert new["value"] == "love_sushi"
    end

    test "forget works" do
      assert {:ok, r} =
               MemoryCompose.remember(%{
                 explicit: true,
                 user_stated: true,
                 text: "quiet",
                 owner_user_id: "u1",
                 scope: "user",
                 dimension: "noise_level",
                 value: "quiet"
               })

      assert {:ok, _} = MemoryCompose.forget(r["fact"]["id"])
      assert MemoryStore.get(r["fact"]["id"])["forgotten"]
    end
  end

  describe "metrics" do
    test "learning progress tracks elimination vs corrections" do
      _ = MemoryCompose.multi_plan_benchmark()
      p = MemoryMetrics.learning_progress()
      assert p["questions_eliminated_total"] >= 1
      assert p["target"] == "remember_more_only_when_ask_less"
    end
  end

  describe "compound alignment" do
    test "many private models → one shared-safe conclusion" do
      alias OpalCore.SocialFlow.Execution.CompoundAlignment

      assert {:ok, c} =
               CompoundAlignment.compose(%{
                 participants: [
                   %{
                     user_id: "a",
                     facts: [
                       %{"dimension" => "cost", "value" => "budget", "kind" => "explicit_fact"}
                     ]
                   },
                   %{
                     user_id: "b",
                     facts: [
                       %{
                         "dimension" => "travel_burden",
                         "value" => "avoid_far",
                         "kind" => "explicit_correction"
                       }
                     ]
                   }
                 ],
                 relationship_id: "a|b",
                 plan_type: "dinner"
               })

      refute c["private_leakage"]
      assert c["know_more_show_less"]
      assert c["most_data_does_not_win"]
      assert c["shared_output"]["private_causes_hidden"]
      # Never surfaces "A can't afford..."
      refute is_binary(c["shared_output"]["copy"]) and
               String.contains?(c["shared_output"]["copy"] || "", "afford")
    end

    test "compression ratio private complexity → few decisions" do
      alias OpalCore.SocialFlow.Execution.CompoundAlignment

      r = CompoundAlignment.compression_ratio(140, 2)
      assert r["excellent"]
      refute r["public_ratio"]
    end

    test "compound series questions trend down" do
      alias OpalCore.SocialFlow.Execution.CompoundAlignment

      b =
        CompoundAlignment.compound_benchmark([
          %{plan_index: 1, questions: 5, manual_steps: 8, visible_moments: 3},
          %{plan_index: 5, questions: 1, manual_steps: 2, visible_moments: 1}
        ])

      assert b["pass"]
      assert b["questions_trend_down"]
    end
  end

  describe "repeated behavior" do
    test "three comparable choices can admit repeated behavior" do
      r =
        OutcomeLearning.from_outcome(%{
          place: "Harbor",
          repeat_count: 3,
          user_id: "u1",
          relationship_id: "r1",
          scope: "relationship"
        })

      assert r["admit"]
      assert r["fact"]["kind"] == "repeated_behavior"
    end
  end

  describe "sensitive inference blocked" do
    test "does not infer medical from crumbs" do
      d =
        MemoryAdmission.evaluate(%{
          kind: "inferred_preference",
          text: "might have medical issues",
          value: "medical",
          dimension: "medical",
          sensitive_trait: true,
          work_eliminated: ["improve_fit"],
          owner_user_id: "u1"
        })

      refute d["admit"]
      assert d["reason"] == "sensitive_inference_blocked"
    end
  end
end
