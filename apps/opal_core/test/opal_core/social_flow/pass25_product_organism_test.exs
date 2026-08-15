defmodule OpalCore.SocialFlow.Pass25ProductOrganismTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}

  alias OpalCore.SocialFlow.{
    ExperienceContinuation,
    ExperienceFork,
    FollowGraph,
    MultiDayPersonalCuration,
    PrivatePreparation,
    RelationshipGraph,
    SocialMoment
  }

  setup do
    FixturesHelper.seed!()
    :ok
  end

  describe "FollowGraph durability (closes NOT_POSTGRES for product path)" do
    test "survives re-read; never grants friend" do
      a = Fixtures.user_alex_id()
      # Use jordan as creator; alex as follower
      c = Fixtures.user_jordan_id()

      assert {:ok, _row, :created} = FollowGraph.follow_durable(a, c)
      assert FollowGraph.following_durable?(a, c)
      assert {:ok, _, :idempotent} = FollowGraph.follow_durable(a, c)
      assert a in FollowGraph.durable_following_ids(a) == false
      assert c in FollowGraph.durable_following_ids(a)

      refute FollowGraph.grants_friend_visibility?()
      # Follow does not create friend visibility in RelationshipGraph unless already friends
      # (alex-jordan may already be dyad friends in fixtures — that is separate)
      assert FollowGraph.permission_matrix()["friend_visibility"] == false

      assert {:ok, :revoked} = FollowGraph.unfollow_durable(a, c)
      refute FollowGraph.following_durable?(a, c)
    end
  end

  describe "multi-day personal curation" do
    test "7 days with ≥2 silence and budget safety" do
      r = MultiDayPersonalCuration.simulate(%{"area_label" => "Little Italy"})
      assert r["day_count"] == 7
      assert r["silent_days"] >= 2
      assert r["pass"] == true
      assert r["engagement_not_mandatory"] == true

      low = Enum.find(r["days"], &(&1["class"] == "low_budget"))
      refute low["expensive_leaked"]
    end
  end

  describe "cross-layer product laws still hold" do
    test "private prep + continuation daypart + different-city fork intent" do
      refute PrivatePreparation.auto_sends_to_peers?(:prepare_surprise)
      morning = ExperienceContinuation.present(%{"hour" => 9, "participant_count" => 2})
      refute morning["label"] =~ ~r/extend the night/i

      # Tokyo creator → San Diego follower: place identity may carry as inspiration only
      moment =
        SocialMoment.new(%{
          "author_user_id" => "tokyo-creator",
          "caption" => "coffee in Kyoto",
          "place_ref" => %{
            "display_name" => "Kyoto Cafe",
            "provider_place_id" => "places/kyoto-1",
            "provider" => "recorded_fixture"
          }
        })

      {:ok, g, _} = FollowGraph.follow(FollowGraph.new(), "sd-follower", "tokyo-creator")

      assert {:ok, fork} =
               ExperienceFork.fork_moment(moment, %{
                 "actor_user_id" => "sd-follower",
                 "participant_user_ids" => ["sd-follower"],
                 "what" => "Coffee",
                 "when" => "saturday morning",
                 "follow_graph" => g,
                 "require_follow" => true
               })

      # Logistics not cloned as execution claim
      assert fork["not_reservation_clone"] == true
      assert fork["authorizes_booking"] == false
      assert fork["reality_seed"]["when"] == "saturday morning"
      # Pattern may retain place_hint as inspiration — execution still unknown
      assert fork["execution"] == "none"
    end

    test "relationship graph still owns friends" do
      assert RelationshipGraph.default_visibility() == "friends"
      refute RelationshipGraph.inference_expands_audience?()
    end
  end
end
