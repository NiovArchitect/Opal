defmodule OpalCore.SocialFlow.ProviderEconomicTruthTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.{
    AttributionGraph,
    EconomicQualification,
    ProviderEconomicAdapter,
    ProviderEconomicContract,
    ProviderEconomicEventStore,
    ProviderEconomicIngest
  }

  setup do
    ProviderEconomicEventStore.ensure_started()
    ProviderEconomicEventStore.reset!()
    :ok
  end

  defp direct_chain do
    [
      %{
        "moment_id" => "moment-a",
        "author_user_id" => "chanelle",
        "hop" => 0,
        "evidence" => %{
          "seeded_reality_from_moment" => true,
          "place_remained_to_transaction" => true
        }
      }
    ]
  end

  defp ingest!(attrs, opts \\ []) do
    assert {:ok, result} = ProviderEconomicIngest.ingest(attrs, opts)
    result
  end

  describe "live status honesty" do
    test "LIVE ECONOMIC VALUE not proven" do
      s = ProviderEconomicIngest.status()
      assert s["live_economic_provider"] == false
      assert s["live_completion_provider"] == false
      assert s["live_commission"] == false
      assert s["live_financial_settlement"] == false
      assert s["live_creator_payout"] == false
      assert s["live_economic_value"] == "NOT_PROVEN"
      assert "390_audience_selector_ux_incomplete" in s["pass18_holds"]
      assert "realtime_pubsub_audience_routing_audit" in s["pass18_holds"]
    end

    test "live mode rejected" do
      assert {:error, :live_economic_provider_not_available} =
               ProviderEconomicAdapter.observe_economic_event(%{
                 "mode" => "live",
                 "scenario" => "completed_commission",
                 "transaction_id" => "tx-live"
               })
    end
  end

  describe "ECON-10 completion event qualifies value" do
    test "recorded commission → qualified" do
      r =
        ingest!(
          %{
            "mode" => "recorded_fixture",
            "scenario" => "completed_commission",
            "transaction_id" => "tx-10",
            "execution_id" => "ex-10"
          },
          causal_chain: direct_chain()
        )

      assert r["qualification"]["status"] == "qualified"
      assert r["pool"]["amount"] == 12.0
      assert r["pool"]["currency"] == "USD"
      assert r["finality"] == "earned"
      assert r["fact"]["provider_contract_version"] == "rec-res-econ-0.1"
      assert r["fact"]["source_mode"] == "recorded_fixture"
      assert r["is_payout"] == false
      assert r["live_economic_value"] == "NOT_PROVEN"
      assert Enum.any?(r["entitlements"], &(&1["author_user_id"] == "chanelle"))
    end
  end

  describe "ECON-11 completed but zero commission" do
    test "no value" do
      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "completed_zero",
          "transaction_id" => "tx-11"
        })

      assert r["qualification"]["status"] == "no_value"
      assert r["qualification"]["reason"] == "provider_no_commission"
      assert r["is_payout"] == false
    end
  end

  describe "ECON-12 duplicate economic webhook" do
    test "duplicate_provider_event_does_not_duplicate_pool" do
      attrs = %{
        "mode" => "recorded_fixture",
        "scenario" => "completed_commission",
        "transaction_id" => "tx-12",
        "economic_event_id" => "ee-fixed-12"
      }

      r1 = ingest!(attrs)
      r2 = ingest!(attrs)

      assert r1["ingest_origin"] == :created
      assert r2["ingest_origin"] == :idempotent
      assert r1["pool"]["pool_id"] == r2["pool"]["pool_id"]
      assert length(ProviderEconomicEventStore.history("tx-12")) == 1
    end
  end

  describe "ECON-13 out-of-order reversal" do
    test "out_of_order_events_converge_to_provider_truth" do
      # Settlement/commission first
      ingest!(%{
        "mode" => "recorded_fixture",
        "scenario" => "completed_commission",
        "transaction_id" => "tx-13",
        "economic_event_id" => "ee-13-c"
      })

      # Reversal arrives after (or "out of order" as second event)
      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "reversed",
          "transaction_id" => "tx-13",
          "economic_event_id" => "ee-13-r",
          "commission_value" => 12.0
        })

      assert r["reversed"] == true
      assert r["qualification"]["status"] == "reversed"
      assert r["finality"] == "reversed"

      # Attribution history survives
      a =
        AttributionGraph.attribute_transaction(%{
          "id" => "tx-13",
          "status" => "completed",
          "force_attribute" => true,
          "causal_chain" => direct_chain()
        })

      assert a["status"] == "attributed"
      assert a["contributors"] != []
    end

    test "reversal then delayed completion still reversed" do
      ingest!(%{
        "mode" => "recorded_fixture",
        "scenario" => "reversed",
        "transaction_id" => "tx-13b",
        "economic_event_id" => "ee-13b-r"
      })

      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "completed_commission",
          "transaction_id" => "tx-13b",
          "economic_event_id" => "ee-13b-c"
        })

      # Provider reverse remains in history; projection keeps reverse terminal
      assert r["reversed"] == true
      assert r["qualification"]["status"] == "reversed"
    end
  end

  describe "ECON-14 contract version" do
    test "contract_version_is_preserved and not retroactive" do
      {:ok, v1} = ProviderEconomicContract.resolve("recorded_reservation_econ", ~U[2026-06-01 00:00:00Z])
      assert v1["contract_version"] == "rec-res-econ-0.1"

      {:ok, v2} = ProviderEconomicContract.resolve("recorded_reservation_econ", ~U[2027-06-01 00:00:00Z])
      assert v2["contract_version"] == "rec-res-econ-0.2"

      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "completed_commission",
          "transaction_id" => "tx-14",
          "observed_at" => "2026-06-15T12:00:00Z"
        })

      assert r["provider_contract_version"] == "rec-res-econ-0.1"
      assert r["fact"]["provider_contract_version"] == "rec-res-econ-0.1"
    end
  end

  describe "ECON-15 partial provider value" do
    test "partial commission uses actual amount" do
      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "partial",
          "transaction_id" => "tx-15",
          "commission_value" => 6.0
        })

      assert r["qualification"]["status"] == "qualified"
      assert r["pool"]["amount"] == 6.0
      assert r["fact"]["partial"] == true
    end
  end

  describe "ECON-16 creator privacy after qualification" do
    test "creator privacy after economic qualification" do
      r =
        ingest!(
          %{
            "mode" => "recorded_fixture",
            "scenario" => "completed_commission",
            "transaction_id" => "tx-16"
          },
          causal_chain: direct_chain()
        )

      assert r["privacy"]["creator_sees_who_booked"] == false
      assert r["privacy"]["creator_sees_conversation"] == false
      assert r["visibility_unaffected"] == true
    end
  end

  describe "property invariants" do
    test "completion_without_economic_fact_does_not_qualify_money" do
      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "experience_completed",
          "transaction_id" => "tx-p1"
        })

      assert r["qualification"]["status"] == "pending"
      assert r["qualification"]["reason"] == "completion_without_economic_value"
    end

    test "economic_fact_requires_provenance" do
      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "completed_commission",
          "transaction_id" => "tx-p2"
        })

      assert get_in(r, ["fact", "provenance", "source"])
      assert get_in(r, ["fact", "provenance", "observed_at"])
    end

    test "currency_is_preserved" do
      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "completed_commission",
          "transaction_id" => "tx-cur",
          "currency" => "USD"
        })

      assert r["currency"] == "USD"
      assert r["pool"]["currency"] == "USD"
    end

    test "economic_value_does_not_affect_social_rank" do
      refute AttributionGraph.social_rank_uses_commission?()
      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "completed_commission",
          "transaction_id" => "tx-rank"
        })

      assert r["social_rank_unaffected"] == true
    end

    test "provider_economic_event_does_not_expand_visibility" do
      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "completed_commission",
          "transaction_id" => "tx-vis"
        })

      assert r["visibility_unaffected"] == true
    end

    test "no_moment_transaction_can_still_have_economic_value" do
      r =
        ingest!(
          %{
            "mode" => "recorded_fixture",
            "scenario" => "completed_commission",
            "transaction_id" => "tx-opal"
          },
          opal_recommended: true,
          causal_chain: []
        )

      assert r["qualification"]["status"] == "qualified"
      assert r["entitlements"] == []
    end

    test "unauthenticated live webhook rejected" do
      assert {:error, :unauthenticated_webhook} =
               ProviderEconomicAdapter.verify_webhook(%{"mode" => "live"})
    end

    test "pool amount evolution keeps history" do
      ingest!(%{
        "mode" => "recorded_fixture",
        "scenario" => "partial",
        "transaction_id" => "tx-evol",
        "economic_event_id" => "ee-e1",
        "commission_value" => 15.0
      })

      r =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "partial",
          "transaction_id" => "tx-evol",
          "economic_event_id" => "ee-e2",
          "commission_value" => 12.0
        })

      assert length(ProviderEconomicEventStore.history("tx-evol")) == 2
      assert r["pool"]["amount"] == 12.0
      assert r["pool"]["pool_version"] == 2
    end
  end

  describe "structural loops" do
    test "social moment loop" do
      r =
        ingest!(
          %{
            "mode" => "recorded_fixture",
            "scenario" => "completed_commission",
            "transaction_id" => "tx-moment",
            "execution_id" => "ex-moment"
          },
          causal_chain: direct_chain()
        )

      assert r["qualification"]["status"] == "qualified"
      assert r["attribution"]["status"] == "attributed"
      assert Enum.any?(r["entitlements"], &(&1["status"] == "qualified"))
      assert r["is_payout"] == false
    end

    test "direct chat and personal loops" do
      chat =
        ingest!(
          %{
            "mode" => "recorded_fixture",
            "scenario" => "completed_commission",
            "transaction_id" => "tx-chat"
          },
          opal_recommended: true,
          causal_chain: []
        )

      solo =
        ingest!(%{
          "mode" => "recorded_fixture",
          "scenario" => "settled",
          "transaction_id" => "tx-solo"
        })

      assert chat["qualification"]["status"] == "qualified"
      assert chat["entitlements"] == []
      assert solo["finality"] == "settled"
      assert solo["qualification"]["status"] == "qualified"
    end

    test "multi-hop one pool" do
      chain = [
        %{
          "moment_id" => "m0",
          "author_user_id" => "a",
          "hop" => 0,
          "evidence" => %{
            "seeded_reality_from_moment" => true,
            "place_remained_to_transaction" => true
          }
        },
        %{
          "moment_id" => "m1",
          "author_user_id" => "b",
          "hop" => 1,
          "evidence" => %{"seeded_reality_from_moment" => true}
        }
      ]

      r =
        ingest!(
          %{
            "mode" => "recorded_fixture",
            "scenario" => "completed_commission",
            "transaction_id" => "tx-mh"
          },
          causal_chain: chain
        )

      assert r["pool"]["amount"] == 12.0
      assert length(r["attribution"]["contributors"]) >= 2
      assert r["pool"]["grows_with_lineage"] == false
    end
  end

  describe "finality recommendation" do
    test "documents earned vs settled vs payout later" do
      rec = ProviderEconomicIngest.finality_recommendation()
      assert rec["payout_finality"] == "NOT_IN_PASS_22"
      assert rec["recommendation"] =~ "commission_confirmed"
    end
  end

  describe "confirmed booking still pending without provider event" do
    test "no adapter event means no automatic money" do
      q =
        EconomicQualification.qualify(%{
          "execution_status" => "confirmed",
          "transaction_id" => "tx-only-book",
          "experience_completed" => false
        })

      assert q["status"] == "pending"
    end
  end
end
