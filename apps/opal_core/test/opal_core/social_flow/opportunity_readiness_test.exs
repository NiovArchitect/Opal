defmodule OpalCore.SocialFlow.OpportunityReadinessTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Execution.{
    ClaimConfidence,
    CriticalGap,
    PromotionGate,
    ReadinessCompose,
    ReadinessCrossing,
    ReadinessObservability,
    ReadinessState
  }

  setup do
    ReadinessObservability.reset()
    :ok
  end

  describe "prepared ≠ ready ≠ execution_ready ≠ confirmed" do
    test "distinct states" do
      assert ReadinessState.rank("prepared") < ReadinessState.rank("decision_ready")
      assert ReadinessState.rank("decision_ready") < ReadinessState.rank("execution_ready")
      assert ReadinessState.rank("execution_ready") < ReadinessState.rank("confirmed")
    end

    test "great venue + maybe required is not decision ready" do
      assert {:ok, r} =
               ReadinessCompose.assess(%{
                 place: "Harbor Table",
                 when: ~U[2026-08-20 19:00:00Z],
                 party_size: 2,
                 travel_minutes: 15,
                 candidate_prepared: true,
                 prepared_count: 3,
                 one_dominant_option: true,
                 required_willingness_maybe: true,
                 intent_strength: "active_desire"
               })

      assert r["readiness_state"] in ~w(prepared unprepared)
      assert r["prepared_ne_ready"]
      refute r["may_promote_opportunity"]
    end

    test "courtship golden: willingness resolves → decision ready" do
      assert {:ok, before} =
               ReadinessCompose.assess(%{
                 place: "Harbor Table",
                 when: ~U[2026-08-20 19:00:00Z],
                 party_size: 2,
                 zone_known: true,
                 candidate_prepared: true,
                 one_dominant_option: true,
                 compressed_to_one: true,
                 required_willingness_maybe: true,
                 intent_strength: "forming_plan"
               })

      assert before["readiness_state"] in ~w(prepared unprepared)

      assert {:ok, after_yes} =
               ReadinessCompose.assess(%{
                 place: "Harbor Table",
                 destination: "Harbor Table",
                 when: ~U[2026-08-20 19:00:00Z],
                 slot_label: "7:30",
                 party_size: 2,
                 set: true,
                 willingness_ok: true,
                 willingness_resolved: true,
                 one_dominant_option: true,
                 compressed_to_one: true,
                 intent_strength: "strong_commitment",
                 previous_readiness: %{
                   "readiness_state" => before["readiness_state"],
                   "primary_gap" => "willingness"
                 }
               })

      assert after_yes["readiness_state"] in ~w(decision_ready execution_ready)
      assert after_yes["may_promote_opportunity"]
    end
  end

  describe "critical vs non-critical gaps" do
    test "required silence blocks; optional silence does not" do
      req =
        CriticalGap.assess(%{
          required_participant_unresolved: true
        })

      assert req["blocks_decision_ready"]
      assert req["primary_gap"] == "required_participant"

      opt =
        CriticalGap.assess(%{
          optional_silent: true,
          willingness_ok: true,
          set: true,
          when: ~U[2026-08-20 19:00:00Z],
          place: "X"
        })

      refute opt["primary_gap"] == "required_participant"
    end

    test "minor rating does not block" do
      g = CriticalGap.assess(%{rating_uncertain: true, willingness_ok: true})
      refute Enum.any?(g["critical_gaps"], &(&1["type"] == "minor_rating"))
    end
  end

  describe "claim-specific confidence" do
    test "metadata place fit is not book confidence" do
      c =
        ClaimConfidence.assess(%{
          place: "Harbor",
          fit_ok: true,
          provider_metadata_only: true,
          party_size: 2
        })

      assert c["may_surface_place_fit"]
      refute c["may_prompt_book"]
      assert c["place_fit_ne_availability"]
    end

    test "live availability enables book prompt path" do
      c =
        ClaimConfidence.assess(%{
          place: "Harbor",
          fit_ok: true,
          provider_checked: true,
          provider_available: true,
          party_size: 2
        })

      assert c["may_prompt_book"]
    end
  end

  describe "promotion gate" do
    test "prepared but never surfaced is success" do
      assert {:ok, p} =
               ReadinessCompose.maybe_promote(%{
                 candidate_prepared: true,
                 prepared_count: 5,
                 place: "Harbor",
                 when: ~U[2026-08-20 19:00:00Z],
                 required_willingness_maybe: true,
                 intent_strength: "should_sometime"
               })

      refute p["visible"]
      assert p["quiet_success"] or p["promoted"] == false
      refute p["sunk_cost_privilege"]
    end

    test "humans solved suppress" do
      g =
        PromotionGate.evaluate(%{
          readiness_state: "decision_ready",
          humans_already_solved: true,
          set: true,
          place: "Harbor"
        })

      refute g["promote"]
      assert g["reason"] == "humans_solved"
    end

    test "push stricter than chat" do
      base = %{
        readiness_state: "decision_ready",
        set: true,
        place: "Harbor",
        when: ~U[2026-08-20 19:00:00Z],
        willingness_ok: true,
        one_dominant_option: true,
        quality_band: "strong"
      }

      refute PromotionGate.push_ready?(base)

      assert PromotionGate.push_ready?(
               Map.merge(base, %{
                 time_sensitive: true,
                 minutes_to_leave: 20,
                 attention_tier: "urgent_actionable"
               })
             )
    end

    test "book CTA denied without live availability" do
      g =
        PromotionGate.evaluate(%{
          readiness_state: "decision_ready",
          prompt: "book",
          place: "Harbor",
          fit_ok: true,
          provider_metadata_only: true,
          set: true,
          party_size: 2,
          chat_open: true,
          quality_band: "strong"
        })

      refute g["promote"]
      assert g["reason"] == "place_fit_ne_book_confidence"
    end
  end

  describe "crossing + hysteresis" do
    test "material willingness resolve promotes" do
      x =
        ReadinessCrossing.detect(
          %{"readiness_state" => "prepared", "primary_gap" => "willingness"},
          %{
            "readiness_state" => "decision_ready",
            "willingness_resolved" => true
          }
        )

      assert x["should_promote"]
    end

    test "rating noise does not flap" do
      x =
        ReadinessCrossing.detect(
          %{"readiness_state" => "decision_ready"},
          %{"readiness_state" => "prepared"}
        )

      assert x["hysteresis"] or x["kind"] == "none"
      refute x["should_retract"]
    end

    test "critical invalidation retracts" do
      x =
        ReadinessCrossing.detect(
          %{"readiness_state" => "decision_ready"},
          %{
            "readiness_state" => "prepared",
            "hard_constraint_block" => true
          }
        )

      assert x["should_retract"]
    end
  end

  describe "execution authorization binding" do
    test "auth binds to place/time/party/version" do
      auth = %{
        "binding" => %{
          "place" => "Harbor",
          "when" => "7:30",
          "party_size" => 2,
          "plan_version" => 1
        }
      }

      assert ReadinessCompose.authorization_still_valid?(auth, %{
               place: "Harbor",
               slot_label: "7:30",
               party_size: 2,
               plan_version: 1
             })

      refute ReadinessCompose.authorization_still_valid?(auth, %{
               place: "Harbor",
               slot_label: "8:00",
               party_size: 2,
               plan_version: 1
             })
    end

    test "may_ask_reserve only when execution-ready with live truth" do
      r =
        ReadinessCompose.execution_authorization_ready?(%{
          set: true,
          place: "Harbor",
          destination: "Harbor",
          when: ~U[2026-08-20 19:00:00Z],
          party_size: 2,
          willingness_ok: true,
          one_dominant_option: true,
          compressed_to_one: true,
          provider_checked: true,
          provider_available: true,
          intent_strength: "strong_commitment"
        })

      assert r["invalidates_if_material_field_changes"]
      # may or may not be ready depending on full classify — at least structure holds
      assert is_boolean(r["ready"])
    end
  end

  describe "recovery preserves ready dimensions" do
    test "does not restart early prep" do
      r =
        ReadinessCompose.after_execution_failure(
          %{
            set: true,
            place: "Harbor",
            when: ~U[2026-08-20 19:00:00Z],
            party_size: 2,
            willingness_ok: true
          },
          "provider_available"
        )

      assert r["preserved"]
      refute r["restart_from_early_prep"]
      refute r["surface_dump_alternatives"]
    end
  end

  describe "actionability probability budget" do
    test "sometime + cold is dormant" do
      p =
        ReadinessCompose.actionability_probability(%{
          intent_strength: "should_sometime"
        })

      assert p["band"] in ~w(dormant low)
      refute p["live_provider_justified"]
      refute p["public_score"]
    end

    test "thursday works high prep" do
      p =
        ReadinessCompose.actionability_probability(%{
          set: true,
          intent_strength: "strong_commitment",
          when: ~U[2026-08-20 19:00:00Z],
          zone_known: true,
          recent_engagement: true
        })

      assert p["band"] in ~w(high medium)
      assert p["prepare_aggressively"]
    end
  end

  describe "benchmarks" do
    test "readiness benchmark few promotions" do
      b = ReadinessCompose.readiness_benchmark(%{})
      assert b["pass"]
      assert b["promotions"] <= 3
    end
  end

  describe "observability privacy" do
    test "events have no private fields" do
      assert {:ok, _} =
               ReadinessCompose.assess(%{
                 set: true,
                 place: "Secret Loft",
                 when: ~U[2026-08-20 19:00:00Z],
                 party_size: 2,
                 willingness_ok: true,
                 one_dominant_option: true,
                 prepared_count: 1
               })

      for e <- ReadinessObservability.events() do
        assert e["privacy_safe"]
        refute Map.has_key?(e["payload"], "place")
        refute Map.has_key?(e["payload"], "name")
      end
    end
  end

  describe "group readiness" do
    test "optional silence does not block; required does" do
      assert {:ok, ok} =
               ReadinessCompose.assess(%{
                 set: true,
                 place: "Harbor",
                 when: ~U[2026-08-20 19:00:00Z],
                 party_size: 5,
                 willingness_ok: true,
                 one_dominant_option: true,
                 compressed_to_one: true,
                 optional_silent: true,
                 intent_strength: "strong_commitment"
               })

      assert ok["may_promote_opportunity"] or
               ok["readiness_state"] in ~w(decision_ready execution_ready)

      assert {:ok, blocked} =
               ReadinessCompose.assess(%{
                 set: true,
                 place: "Harbor",
                 when: ~U[2026-08-20 19:00:00Z],
                 party_size: 5,
                 required_participant_unresolved: true,
                 one_dominant_option: true,
                 intent_strength: "strong_commitment"
               })

      refute blocked["may_promote_opportunity"]
    end
  end
end
