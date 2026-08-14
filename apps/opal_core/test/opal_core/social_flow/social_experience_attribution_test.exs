defmodule OpalCore.SocialFlow.SocialExperienceAttributionTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.{
    AttributionGraph,
    ExperienceGraph,
    MomentRealityBridge,
    SocialMoment
  }

  describe "SocialMoment" do
    test "media-primary object without commerce CTAs" do
      m =
        SocialMoment.new(%{
          "author_user_id" => "you",
          "caption" => "Perfect place for a date where you actually want to talk.",
          "place_ref" => %{
            "display_name" => "Juniper & Ivy",
            "area_label" => "Little Italy",
            "provider_place_id" => "places/ChIJ_recorded_juniper",
            "provider" => "recorded_fixture"
          },
          "social_context" => "date night"
        })

      refute SocialMoment.commerce_led?(m)
      assert m["human_surface"]["cta"] == "Do this with your people"
      assert m["place_ref"]["provider_place_id"]
      assert m["place_ref"]["bookability"] == "unknown"
      assert m["place_ref"]["execution"] == "none"
    end

    test "do with people seeds independent reality" do
      m =
        SocialMoment.new(%{
          "id" => "moment-you",
          "author_user_id" => "you",
          "caption" => "Incredible.",
          "place_ref" => %{"display_name" => "Juniper & Ivy", "provider_place_id" => "p1"}
        })

      assert {:ok, seed} =
               SocialMoment.do_with_people(m, %{
                 "actor_user_id" => "maya",
                 "participant_user_ids" => ["chanelle"],
                 "what" => "Dinner"
               })

      assert seed["independent_circle"] == true
      assert seed["not_original_circle_entitlement"] == true
      assert seed["authorizes_set"] == false
      assert seed["authorizes_booking"] == false
      assert seed["bookability"] == "unknown"
      assert seed["execution"] == "none"
      assert seed["social_moment_id"] == "moment-you"
      assert seed["place_identity"]["provider_place_id"] == "p1"
      assert "chanelle" in seed["participant_user_ids"]
    end

    test "do with people requires people" do
      m = SocialMoment.new(%{"author_user_id" => "a", "caption" => "x"})
      assert {:error, :people_required} = SocialMoment.do_with_people(m, %{})
    end
  end

  describe "ExperienceGraph" do
    test "multi-hop lineage you → maya → jess" do
      g = ExperienceGraph.new()

      {:ok, g} = ExperienceGraph.link_moment_to_reality(g, "m-you", "r-maya", %{})
      {:ok, g} = ExperienceGraph.link_reality_to_experience(g, "r-maya", "e-maya", %{})
      {:ok, g} = ExperienceGraph.link_experience_to_moment(g, "e-maya", "m-maya", %{})
      {:ok, g} = ExperienceGraph.link_moment_to_reality(g, "m-maya", "r-jess", %{})

      down = ExperienceGraph.downstream_realities(g, "m-you")
      assert Enum.any?(down, fn r -> r["id"] == "r-maya" end)

      up = ExperienceGraph.upstream_moments(g, "m-maya", 4)
      assert is_list(up)
    end
  end

  describe "AttributionGraph" do
    test "no transaction → abstain" do
      a =
        AttributionGraph.attribute_transaction(%{
          "id" => "t0",
          "status" => "none",
          "causal_chain" => [
            %{
              "moment_id" => "m1",
              "author_user_id" => "you",
              "hop" => 0,
              "evidence" => %{"viewed_only" => true}
            }
          ]
        })

      assert a["status"] == "abstain"
      assert a["is_payout"] == false
      assert a["live_economic"] == false
    end

    test "views/likes alone are non-causal" do
      assert AttributionGraph.classify_strength(%{"viewed_only" => true}) == "non_causal_exposure"
      assert AttributionGraph.classify_strength(%{"liked_only" => true}) == "non_causal_exposure"
    end

    test "direct seed + place retained is direct causal" do
      assert AttributionGraph.classify_strength(%{
               "seeded_reality_from_moment" => true,
               "place_remained_to_transaction" => true
             }) == "direct_causal"
    end

    test "recruitment is never attributable" do
      refute AttributionGraph.recruitment_attributable?()

      a =
        AttributionGraph.attribute_transaction(%{
          "id" => "t-rec",
          "status" => "completed",
          "recruitment_event" => true,
          "causal_chain" => []
        })

      assert a["status"] == "abstain"
      assert a["reason"] == "recruitment_not_attributable"
    end

    test "finite multi-hop and bounded pool simulation" do
      a =
        AttributionGraph.attribute_transaction(
          %{
            "id" => "t1",
            "status" => "completed",
            "simulation" => true,
            "amount_pool" => 15.0,
            "reality_id" => "r-alex",
            "place_identity" => %{"provider_place_id" => "p1", "display_name" => "Juniper & Ivy"},
            "causal_chain" => [
              %{
                "moment_id" => "m-jess",
                "author_user_id" => "jess",
                "hop" => 0,
                "evidence" => %{
                  "seeded_reality_from_moment" => true,
                  "place_remained_to_transaction" => true
                }
              },
              %{
                "moment_id" => "m-maya",
                "author_user_id" => "maya",
                "hop" => 1,
                "evidence" => %{"seeded_reality_from_moment" => true}
              },
              %{
                "moment_id" => "m-you",
                "author_user_id" => "you",
                "hop" => 2,
                "evidence" => %{"seeded_reality_from_moment" => true}
              },
              %{
                "moment_id" => "m-ancient",
                "author_user_id" => "ancient",
                "hop" => 5,
                "evidence" => %{"seeded_reality_from_moment" => true}
              }
            ]
          },
          max_hops: 3
        )

      assert a["status"] == "attributed"
      assert a["is_payout"] == false
      assert a["live_economic"] == false
      assert a["pool_does_not_grow_with_lineage"] == true
      # hop 5 filtered out
      refute Enum.any?(a["contributors"], &(&1["author_user_id"] == "ancient"))
      assert Enum.any?(a["contributors"], &(&1["author_user_id"] == "jess"))
      assert Enum.any?(a["contributors"], &(&1["author_user_id"] == "you"))

      sim = AttributionGraph.simulate_pool_split(a, 15.0)
      assert sim["simulation"] == true
      assert sim["live_payout"] == false
      assert sim["label"] == "SIMULATION"
      assert sim["exceeds_pool"] == false
      assert sim["lineage_does_not_increase_pool"] == true
      assert_in_delta sim["total"], 15.0, 0.05
    end

    test "opal-as-source has no creator attribution" do
      a =
        AttributionGraph.attribute_transaction(%{
          "id" => "t-opal",
          "status" => "completed",
          "opal_recommended" => true,
          "causal_chain" => []
        })

      assert a["creator_attribution"] == "none"
      assert a["opal_source"] == true
    end

    test "multiple sources prefer seeded reality over last click" do
      r =
        AttributionGraph.resolve_multiple_sources([
          %{
            "moment_id" => "last",
            "evidence" => %{"last_viewed" => true, "viewed_only" => true}
          },
          %{
            "moment_id" => "seed",
            "evidence" => %{
              "seeded_reality_from_moment" => true,
              "place_remained_to_transaction" => true
            }
          }
        ])

      assert r["primary"]["moment_id"] == "seed"
      refute r["last_click_only"]
    end

    test "social rank must not use commission" do
      refute AttributionGraph.social_rank_uses_commission?()
    end
  end

  describe "MomentRealityBridge" do
    test "path uses ProviderVertical without claiming live product complete" do
      path =
        MomentRealityBridge.moment_to_reality_path(
          %{
            "id" => "moment-you",
            "author_user_id" => "you",
            "caption" => "Perfect place for a date where you actually want to talk.",
            "place_ref" => %{
              "display_name" => "Juniper & Ivy",
              "area_label" => "Little Italy",
              "provider_place_id" => "places/ChIJ_recorded_juniper",
              "provider" => "recorded_fixture"
            },
            "social_context" => "date night"
          },
          %{
            "participant_user_ids" => ["chanelle"],
            "actor_user_id" => "maya",
            "prefer_recorded" => true,
            "simulate_transaction" => true,
            "pool" => 15.0,
            "upstream_chain" => []
          }
        )

      assert path["laws"]["pass15_not_replaced"]
      assert path["laws"]["recorded_not_live"]
      assert path["laws"]["haversine_not_traffic_eta"]
      assert path["laws"]["bookability_unknown"]
      assert path["laws"]["execution_none"]
      assert path["laws"]["attribution_not_payout"]
      assert path["laws"]["live_economic_not_claimed"]
      assert path["laws"]["spa_curate_fixture_gap_preserved"]
      assert path["commerce_on_moment"] == false
      assert path["curate_projection"]["not_new_curate"]
      assert path["curate_projection"]["provider_is_not_authority"]
      assert path["curate_projection"]["bookability"] == "unknown"
      assert path["provider_vertical"]["live"] != true
      assert path["reality_seed"]["social_moment_id"] == "moment-you"
      assert path["attribution"]["is_payout"] == false
      assert path["pool_simulation"]["simulation"] == true
      assert path["pool_simulation"]["live_payout"] == false

      if path["travel"] do
        assert path["travel"]["not_live_traffic_eta"] == true
      end
    end

    test "without transaction simulation attribution abstains" do
      path =
        MomentRealityBridge.moment_to_reality_path(
          %{
            "author_user_id" => "you",
            "caption" => "Nice.",
            "place_ref" => %{"display_name" => "Juniper & Ivy"}
          },
          %{"participant_user_ids" => ["peer"], "prefer_recorded" => true}
        )

      assert path["attribution"]["status"] == "abstain"
      assert path["pool_simulation"] == nil
    end
  end
end
