defmodule OpalCore.SocialFlow.EconomicQualificationTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.{
    AttributionEntitlement,
    AttributionGraph,
    EconomicPool,
    EconomicQualification,
    ProviderEconomicFact
  }

  defp direct_chain(author \\ "chanelle", moment \\ "moment-chanelle") do
    [
      %{
        "moment_id" => moment,
        "author_user_id" => author,
        "hop" => 0,
        "evidence" => %{
          "seeded_reality_from_moment" => true,
          "place_remained_to_transaction" => true
        }
      }
    ]
  end

  defp assist_chain do
    [
      %{
        "moment_id" => "moment-assist",
        "author_user_id" => "maya",
        "hop" => 0,
        "evidence" => %{
          "seeded_reality_from_moment" => true,
          "place_remained_to_transaction" => false,
          "independent_search" => false
        }
      }
    ]
  end

  defp multi_chain do
    [
      %{
        "moment_id" => "m-direct",
        "author_user_id" => "chanelle",
        "hop" => 0,
        "evidence" => %{
          "seeded_reality_from_moment" => true,
          "place_remained_to_transaction" => true
        }
      },
      %{
        "moment_id" => "m-assist",
        "author_user_id" => "maya",
        "hop" => 1,
        "evidence" => %{"seeded_reality_from_moment" => true}
      }
    ]
  end

  describe "live economic honesty" do
    test "live economic provider/commission/settlement/payout all false" do
      s = EconomicQualification.status()
      assert s["live_economic_provider"] == false
      assert s["live_commission"] == false
      assert s["live_settlement"] == false
      assert s["live_payout"] == false
      assert s["is_payout"] == false
      assert s["is_wallet"] == false
      refute EconomicQualification.confirmed_booking_equals_earned_value?()
      refute EconomicQualification.llm_can_create_economic_fact?()
    end
  end

  describe "ECON-03 confirmed only → pending" do
    test "confirmed_booking_does_not_equal_earned_value" do
      q =
        EconomicQualification.qualify(%{
          "execution_status" => "confirmed",
          "execution_id" => "ex-1",
          "transaction_id" => "tx-1",
          "experience_completed" => false,
          "causal_chain" => direct_chain()
        })

      assert q["status"] == "pending"
      assert q["reason"] == "confirmed_booking_not_economic_value"
      assert q["is_payout"] == false
      assert q["confirmed_booking_equals_earned_value"] == false
    end
  end

  describe "ECON-01 Moment → confirmed → completed → qualified" do
    test "direct causal with simulated commission qualifies" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "execution_id" => "ex-done",
          "transaction_id" => "tx-done",
          "commission_pool" => 15.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "execution_id" => "ex-done",
          "transaction_id" => "tx-done",
          "reality_id" => "reality-1",
          "provider_economic_fact" => fact,
          "causal_chain" => direct_chain()
        })

      q = chain["qualification"]
      assert q["status"] == "qualified"
      assert q["simulation"] == true
      assert q["live_economic"] == false
      assert q["is_payout"] == false
      assert q["pool"]["amount"] == 15.0
      assert q["pool"]["grows_with_lineage"] == false
      assert q["pool"]["source"] == "simulation"

      assert chain["attribution"]["status"] == "attributed"
      assert Enum.any?(chain["entitlements"], fn e ->
               e["author_user_id"] == "chanelle" and e["status"] == "qualified" and
                 e["causal_strength"] == "direct_causal"
             end)

      # Privacy
      assert chain["privacy"]["creator_sees_who_booked"] == false
      safe = AttributionEntitlement.privacy_safe_creator_summary(hd(chain["entitlements"]))
      assert safe["copy"] =~ "inspired"
      refute safe["shows_who"]
    end
  end

  describe "ECON-02 Moment → confirmed → cancelled → no value" do
    test "cancelled_booking_does_not_qualify" do
      refute EconomicQualification.cancelled_booking_qualifies?()

      q =
        EconomicQualification.qualify(%{
          "execution_status" => "cancelled",
          "execution_id" => "ex-c",
          "transaction_id" => "tx-c",
          "causal_chain" => direct_chain()
        })

      assert q["status"] == "no_value"
      assert q["is_payout"] == false

      # Attribution history can still be computed independently
      a =
        AttributionGraph.attribute_transaction(%{
          "id" => "tx-c",
          "status" => "completed",
          "force_attribute" => true,
          "causal_chain" => direct_chain()
        })

      assert a["status"] == "attributed"
    end
  end

  describe "ECON-08 provider economic reversal" do
    test "qualification reversed retains historical record" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-rev",
          "economic_event_type" => "commission_reversed",
          "status" => "reversed",
          "reversal_reason" => "provider_refund"
        })

      q =
        EconomicQualification.qualify(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-rev",
          "provider_economic_fact" => fact,
          "prior_qualification_status" => "qualified",
          "causal_chain" => direct_chain()
        })

      assert q["status"] == "reversed"
      assert q["historical_record_retained"] == true
      assert Enum.any?(q["entitlements"], &(&1["status"] == "reversed"))
    end
  end

  describe "ECON-04 Opal source → value with no creator entitlement" do
    test "platform economics without creator" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-opal",
          "commission_pool" => 10.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-opal",
          "provider_economic_fact" => fact,
          "opal_recommended" => true,
          "causal_chain" => []
        })

      assert chain["qualification"]["status"] == "qualified"
      assert chain["attribution"]["creator_attribution"] == "none"
      assert chain["entitlements"] == []
    end
  end

  describe "ECON-05 multi-source → one pool" do
    test "one_transaction_creates_one_economic_pool" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-multi",
          "commission_pool" => 15.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-multi",
          "provider_economic_fact" => fact,
          "causal_chain" => multi_chain()
        })

      pool = chain["pool"]
      assert pool["pool_id"]
      assert pool["amount"] == 15.0
      refute EconomicPool.expand_pool_for_hops?(pool, 5)

      # more hops do not expand pool
      assert length(chain["attribution"]["contributors"]) >= 2
      assert pool["creator_count_does_not_expand_pool"] == true

      pool2 = EconomicPool.from_economic_fact(fact)
      assert EconomicPool.one_transaction_one_pool?(pool, pool2)
    end
  end

  describe "ECON-06 recruitment → no entitlement" do
    test "recruitment_does_not_create_entitlement" do
      refute AttributionEntitlement.recruitment_creates_entitlement?()
      refute AttributionGraph.recruitment_attributable?()

      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-rec",
          "commission_pool" => 15.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-rec",
          "provider_economic_fact" => fact,
          "recruitment_event" => true,
          "causal_chain" => direct_chain("recruited-user")
        })

      # Qualification may still observe economic value; creator attribution abstains
      assert chain["attribution"]["status"] == "abstain"
      assert chain["entitlements"] == []
    end
  end

  describe "ECON-07 view-only → no entitlement" do
    test "view_only_does_not_create_entitlement" do
      refute AttributionEntitlement.view_only_creates_entitlement?()

      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-view",
          "commission_pool" => 15.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-view",
          "provider_economic_fact" => fact,
          "causal_chain" => [
            %{
              "moment_id" => "m-view",
              "author_user_id" => "viewer-creator",
              "hop" => 0,
              "evidence" => %{"viewed_only" => true}
            }
          ]
        })

      # Non-causal filtered from attribution → no creator entitlements
      assert chain["attribution"]["contributors"] == [] or
               chain["attribution"]["status"] == "attributed"

      refute Enum.any?(chain["entitlements"], &(&1["status"] in ~w(qualified candidate)))
    end
  end

  describe "ECON-09 assist distinguishable from direct" do
    test "assist remains policy_review not automatic qualified payout path" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-assist",
          "commission_pool" => 12.0
        })

      # strong_assist: seeded reality but place did not remain
      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-assist",
          "provider_economic_fact" => fact,
          "causal_chain" => assist_chain()
        })

      assert chain["qualification"]["status"] == "qualified"
      ent = Enum.find(chain["entitlements"], &(&1["author_user_id"] == "maya"))
      assert ent
      assert ent["causal_strength"] == "strong_assist"
      assert ent["status"] == "candidate"
      assert ent["role"] == "eligible_for_policy_review"
      assert ent["is_payout"] == false
    end
  end

  describe "property invariants" do
    test "more_hops_do_not_expand_pool" do
      fact = ProviderEconomicFact.simulate_commission(%{"transaction_id" => "tx-h", "commission_pool" => 15.0})
      pool = EconomicPool.from_economic_fact(fact)
      refute EconomicPool.expand_pool_for_hops?(pool, 0)
      refute EconomicPool.expand_pool_for_hops?(pool, 99)
    end

    test "economic_qualification_requires_provider_provenance" do
      q =
        EconomicQualification.qualify(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-noprov"
          # no economic fact
        })

      assert q["status"] == "unknown"
      assert q["reason"] == "provider_economic_truth_missing"
    end

    test "llm_cannot_create_economic_fact" do
      q =
        EconomicQualification.qualify(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-llm",
          "provider_economic_fact" => %{
            "llm_invented" => true,
            "commission_pool" => 999,
            "provenance" => %{
              "source" => "llm",
              "observed_at" => DateTime.utc_now()
            }
          }
        })

      assert q["status"] == "abstain"
      assert q["reason"] == "llm_cannot_create_economic_fact"
    end

    test "creator_entitlement_does_not_leak_downstream_identity" do
      refute AttributionEntitlement.leaks_downstream_identity?()
      priv = EconomicQualification.privacy_invariants()
      assert priv["creator_sees_who_booked"] == false
      assert priv["forbidden_creator_copy"] =~ "Jordan"
    end

    test "payout_policy_not_required_for_causal_attribution" do
      a =
        AttributionGraph.attribute_transaction(%{
          "id" => "tx-attr-only",
          "status" => "completed",
          "causal_chain" => direct_chain()
        })

      assert a["status"] == "attributed"
      assert a["is_payout"] == false
    end

    test "attribution_history_survives_economic_reversal" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-surv",
          "status" => "reversed",
          "economic_event_type" => "commission_reversed"
        })

      q =
        EconomicQualification.qualify(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-surv",
          "provider_economic_fact" => fact,
          "causal_chain" => direct_chain()
        })

      assert q["status"] == "reversed"
      # force attribution still available
      a =
        AttributionGraph.attribute_transaction(%{
          "id" => "tx-surv",
          "status" => "completed",
          "force_attribute" => true,
          "causal_chain" => direct_chain()
        })

      assert a["status"] == "attributed"
      assert a["contributors"] != []
    end

    test "policy_version present" do
      assert EconomicQualification.policy_version() == "econ-dev-0.1"
      assert AttributionEntitlement.policy_version() == "econ-dev-0.1"
    end

    test "development debug never product UI" do
      q = EconomicQualification.qualify(%{"execution_status" => "confirmed", "transaction_id" => "d"})
      snap = EconomicQualification.development_debug_snapshot(q)
      assert snap["development_only"] == true
      assert snap["not_product_ui"] == true
      assert snap["is_payout"] == false
      assert snap["live_economic"] == false
    end

    test "social set is not financial settlement naming" do
      # Internal economic uses settlement_state; social Set remains separate
      fact = ProviderEconomicFact.simulate_commission(%{"transaction_id" => "tx-set"})
      assert fact["settlement_state"] == "simulated_settled"
      refute Map.has_key?(fact, "set")
    end
  end

  describe "structural loops" do
    test "social moment structural loop" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-moment-loop",
          "commission_pool" => 15.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-moment-loop",
          "execution_id" => "ex-moment",
          "reality_id" => "reality-from-moment",
          "provider_economic_fact" => fact,
          "causal_chain" => direct_chain("chanelle", "moment-a")
        })

      assert chain["qualification"]["status"] == "qualified"
      assert chain["attribution"]["status"] == "attributed"
      assert Enum.any?(chain["entitlements"], &(&1["status"] == "qualified"))
      assert chain["is_payout"] == false
    end

    test "direct chat loop no moment" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-chat",
          "commission_pool" => 8.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-chat",
          "provider_economic_fact" => fact,
          "opal_recommended" => true,
          "causal_chain" => []
        })

      assert chain["qualification"]["status"] == "qualified"
      assert chain["entitlements"] == []
    end

    test "personal solo loop" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-solo",
          "commission_pool" => 5.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-solo",
          "provider_economic_fact" => fact,
          "causal_chain" => []
        })

      assert chain["qualification"]["status"] == "qualified"
      assert chain["is_payout"] == false
    end
  end

  describe "multi-hop bound" do
    test "hop beyond max filtered from entitlement" do
      fact =
        ProviderEconomicFact.simulate_commission(%{
          "transaction_id" => "tx-hops",
          "commission_pool" => 15.0
        })

      chain =
        EconomicQualification.qualify_transaction_chain(%{
          "execution_status" => "confirmed",
          "experience_completed" => true,
          "transaction_id" => "tx-hops",
          "provider_economic_fact" => fact,
          "causal_chain" =>
            direct_chain("a", "m0") ++
              [
                %{
                  "moment_id" => "m5",
                  "author_user_id" => "ancient",
                  "hop" => 5,
                  "evidence" => %{
                    "seeded_reality_from_moment" => true,
                    "place_remained_to_transaction" => true
                  }
                }
              ]
        })

      refute Enum.any?(chain["entitlements"], &(&1["author_user_id"] == "ancient"))
      assert Enum.any?(chain["entitlements"], &(&1["author_user_id"] == "a"))
    end
  end
end
