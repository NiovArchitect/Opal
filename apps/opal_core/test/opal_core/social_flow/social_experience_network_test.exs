defmodule OpalCore.SocialFlow.SocialExperienceNetworkTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.{
    AttributionGraph,
    CompoundIntelligenceLab,
    ExperienceField,
    ExperienceFork,
    ExperiencePropagation,
    FinancialFit,
    FollowGraph,
    PersonalLifeCuration,
    RelationshipGraph,
    SocialMoment
  }

  describe "friend graph != follower graph" do
    test "follow never grants friend/calendar/reality privileges" do
      {:ok, g, :created} = FollowGraph.follow(FollowGraph.new(), "follower", "creator")
      assert FollowGraph.following?(g, "follower", "creator")
      refute FollowGraph.grants_friend_visibility?()
      refute FollowGraph.grants_calendar?()
      refute FollowGraph.grants_reality_access?()
      refute FollowGraph.grants_private_memory?()
      refute FollowGraph.is_relationship_graph?()
      refute RelationshipGraph.friend_visibility_authorized?("creator", "follower")

      m = FollowGraph.permission_matrix()
      assert m["discover_creator_moments"] == true
      assert m["friend_visibility"] == false
      assert m["auto_invite_creator"] == false
    end

    test "relationship graph still owns friends default" do
      assert RelationshipGraph.default_visibility() == "friends"
      refute RelationshipGraph.inference_expands_audience?()
    end
  end

  describe "creator != friend; experience fork" do
    test "follower forks Moment into own Reality without inviting creator" do
      moment = %{
        "id" => "m-creator",
        "author_user_id" => "chanelle-creator",
        "caption" => "Little Italy nights",
        "social_context" => "dinner · walk · jazz",
        "place_ref" => %{
          "display_name" => "Juniper & Ivy",
          "provider_place_id" => "places/juniper",
          "provider" => "recorded_fixture"
        }
      }

      {:ok, g, _} = FollowGraph.follow(FollowGraph.new(), "jordan", "chanelle-creator")

      assert {:ok, fork} =
               ExperienceFork.fork_moment(moment, %{
                 "actor_user_id" => "jordan",
                 "participant_user_ids" => ["jordan", "maya"],
                 "what" => "Dinner + walk",
                 "when" => "saturday",
                 "follow_graph" => g,
                 "require_follow" => true
               })

      assert fork["not_creator_invitation"] == true
      assert fork["not_reservation_clone"] == true
      assert fork["reality_seed"]["creator_auto_invited"] == false
      refute "chanelle-creator" in fork["reality_seed"]["participant_user_ids"]
      assert fork["reality_seed"]["when"] == "saturday"
      assert fork["reality_seed"]["logistics_not_cloned"] == true
      assert fork["experience_pattern"]["not_product_template_ui"] == true
      assert fork["authorizes_booking"] == false
      assert fork["is_payout"] == false
    end

    test "require_follow blocks non-followers" do
      moment = SocialMoment.new(%{"author_user_id" => "creator", "caption" => "x"})

      assert {:error, :follow_or_author_required} =
               ExperienceFork.fork_moment(moment, %{
                 "actor_user_id" => "stranger",
                 "require_follow" => true,
                 "follow_graph" => FollowGraph.new()
               })
    end

    test "solo personal Reality — no fake friend" do
      moment =
        SocialMoment.new(%{
          "author_user_id" => "loner-creator",
          "caption" => "just me and the coast",
          "place_ref" => %{"display_name" => "Cliff Path"}
        })

      assert {:ok, fork} =
               ExperienceFork.fork_moment(moment, %{
                 "actor_user_id" => "loner-creator",
                 "participant_user_ids" => []
               })

      assert fork["reality_seed"]["solo"] == true
      assert fork["reality_seed"]["participant_user_ids"] == ["loner-creator"]
      refute PersonalLifeCuration.fake_friend_required?()
    end
  end

  describe "financial fit" do
    test "fit does not authorize payment; over budget suppresses" do
      refute FinancialFit.financial_fit_authorizes_payment?()
      refute FinancialFit.expose_balance_to_followers?()

      fits =
        FinancialFit.assess(%{
          "discretionary_budget" => 70,
          "estimated_cost" => 40
        })

      assert fits["fit"] == "fits"
      assert fits["authorizes_payment"] == false
      assert fits["expose_to_followers"] == false

      over =
        FinancialFit.assess(%{
          "discretionary_budget" => 70,
          "estimated_cost" => 300
        })

      assert over["fit"] == "over"
      assert over["suppress_suggestion"] == true
      assert over["authorizes_payment"] == false
    end

    test "unknown financial truth abstains" do
      a = FinancialFit.assess(%{})
      assert a["abstain"] == true
      assert a["do_not_invent_affordability"] == true
      assert a["authorizes_payment"] == false
    end
  end

  describe "personal life curation" do
    test "quiet solo suggestions respect budget" do
      s =
        PersonalLifeCuration.suggest(%{
          "area_label" => "Little Italy",
          "discretionary_budget" => 20,
          "candidates" => [
            %{"label" => "Cheap walk coffee", "estimated_cost" => 12},
            %{"label" => "Fancy tasting", "estimated_cost" => 200}
          ]
        })

      assert s["solo_ok"] == true
      assert s["fake_friend_required"] == false
      assert s["not_life_coach_monologue"] == true
      assert s["replaces_shared_reality"] == false
      texts = Enum.map(s["suggestions"], & &1["text"])
      assert "Cheap walk coffee" in texts
      refute "Fancy tasting" in texts
    end
  end

  describe "experience field" do
    test "not commission ranked; not doomscroll; portable framing" do
      refute ExperienceField.discovery_uses_commission?()
      refute ExperienceField.doomscroll_required?()
      refute AttributionGraph.social_rank_uses_commission?()

      moments = [
        SocialMoment.new(%{
          "id" => "m1",
          "author_user_id" => "creator",
          "caption" => "sunrise",
          "place_ref" => %{"display_name" => "Beach"}
        })
      ]

      {:ok, g, _} = FollowGraph.follow(FollowGraph.new(), "fan", "creator")
      field = ExperienceField.for_viewer("fan", moments, %{"follow_graph" => g})

      assert field["not_a_feed_engine"] == true
      assert field["discovery_uses_commission"] == false
      assert field["earned_attention"] == true
      assert field["dark_pattern_addiction"] == false
      assert hd(field["cards"])["from_followed_creator"] == true
      assert hd(field["cards"])["forkable"] == true
      assert hd(field["cards"])["commerce_led"] == false

      props = ExperienceField.portability_value_props()
      assert props["not_affiliate_link"] == true
      assert "TRUST" in props["contains"]
    end
  end

  describe "experience propagation" do
    test "generations not recruitment/MLM" do
      refute ExperiencePropagation.recruitment_rewarded?()
      refute ExperiencePropagation.is_mlm?()

      p =
        ExperiencePropagation.record_chain([
          %{"generation" => 0, "moment_id" => "m0", "reality_id" => "r0", "author_user_id" => "a"},
          %{"generation" => 1, "moment_id" => "m0", "reality_id" => "r1", "actor_user_id" => "b"},
          %{"generation" => 2, "moment_id" => "m1", "reality_id" => "r2", "actor_user_id" => "c"}
        ])

      assert p["generations"] == 3
      assert p["not_mlm"] == true
      assert p["not_recruitment"] == true
      assert p["metric"] == "experience_generations"

      m = ExperiencePropagation.network_metrics(p)
      assert m["north_star_candidate"] == "real_experiences_created_per_moment"
      assert m["not_views"] == true
    end
  end

  describe "compound intelligence lab organism" do
    test "creator life loop holds all invariants" do
      loop = CompoundIntelligenceLab.creator_life_loop()
      inv = loop["invariants"]

      assert inv["follow_is_not_friend"] == true
      assert inv["fork_does_not_auto_invite_creator"] == true
      assert inv["financial_fit_not_payment_auth"] == true
      assert inv["no_recruitment_reward"] == true
      assert inv["solo_no_fake_friend"] == true
      assert inv["compound_extends_not_replaces"] == true
      assert inv["is_payout"] == false

      assert loop["fork_b"]["not_creator_invitation"] == true
      assert loop["propagation"]["max_generation"] >= 2
      assert loop["metrics"]["experience_generations"] >= 2
      assert loop["experience_field"]["card_count"] >= 1
    end

    test "activation fuzz many dimensions one Reality model" do
      results = CompoundIntelligenceLab.activation_fuzz(24)
      assert length(results) == 24
      assert Enum.all?(results, &(&1["ok"] == true))
      assert Enum.all?(results, &(&1["creator_auto_invited"] == false))
      # Mix of solo and multi
      assert Enum.any?(results, &(&1["who_count"] == 1))
      assert Enum.any?(results, &(&1["who_count"] >= 2))
    end
  end

  describe "compounding law — capabilities not replaced" do
    test "new modules extend prior owners" do
      # RelationshipGraph still friend authority
      assert is_function(&RelationshipGraph.friend_visibility_authorized?/2)
      # Attribution still non-social-rank
      refute AttributionGraph.social_rank_uses_commission?()
      # SocialMoment still non-commerce
      m = SocialMoment.new(%{"author_user_id" => "x", "caption" => "y"})
      refute SocialMoment.commerce_led?(m)
      assert m["human_surface"]["cta"] == "Do this with your people"
    end
  end
end
