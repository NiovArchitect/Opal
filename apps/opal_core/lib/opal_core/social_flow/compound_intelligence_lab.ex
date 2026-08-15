defmodule OpalCore.SocialFlow.CompoundIntelligenceLab do
  @moduledoc """
  Compound Intelligence Adversarial Lab (Pass 23 add-on).

  Attacks Opal as an organism: creator/follower/solo/group/finance/privacy
  scenarios without deleting existing capabilities.

  Every new capability EXTENDS prior intelligence.
  """

  alias OpalCore.SocialFlow.{
    AttributionGraph,
    ExperienceField,
    ExperienceFork,
    ExperiencePropagation,
    FinancialFit,
    FollowGraph,
    PersonalLifeCuration,
    RelationshipGraph,
    SocialMoment
  }

  @doc "Full creator → follower → next generation structural loop."
  def creator_life_loop(opts \\ %{}) do
    o = stringify(opts || %{})
    creator = o["creator_user_id"] || "creator-a"
    follower_b = o["follower_b"] || "follower-b"
    follower_c = o["follower_c"] || "follower-c"

    {:ok, fg, _} = FollowGraph.follow(FollowGraph.new(), follower_b, creator)
    {:ok, fg, _} = FollowGraph.follow(fg, follower_c, follower_b)

    moment_a =
      SocialMoment.new(%{
        "id" => "moment-a-kyoto",
        "author_user_id" => creator,
        "caption" => "Saturday morning light hits different here",
        "social_context" => "coffee · art market · hidden walk",
        "place_ref" => %{
          "display_name" => "Harbor Light Cafe",
          "provider_place_id" => "places/recorded_harbor_light",
          "provider" => "recorded_fixture"
        }
      })

    field = ExperienceField.for_viewer(follower_b, [moment_a], %{"follow_graph" => fg})

    {:ok, fork_b} =
      ExperienceFork.fork_moment(moment_a, %{
        "actor_user_id" => follower_b,
        "participant_user_ids" => [follower_b, "maya"],
        "what" => "Coffee + walk",
        "when" => "open",
        "follow_graph" => fg,
        "require_follow" => true
      })

    moment_b =
      SocialMoment.new(%{
        "id" => "moment-b-capture",
        "author_user_id" => follower_b,
        "caption" => "We made our own version",
        "social_context" => "coffee · walk",
        "place_ref" => %{"display_name" => "Local Roastery", "provider" => "recorded_fixture"},
        "source_lineage_id" => moment_a["id"]
      })

    {:ok, fork_c} =
      ExperienceFork.fork_moment(moment_b, %{
        "actor_user_id" => follower_c,
        "participant_user_ids" => [follower_c],
        "what" => "Solo coffee",
        "when" => "tomorrow",
        "follow_graph" => fg,
        "require_follow" => true
      })

    propagation =
      ExperiencePropagation.record_chain([
        %{
          "generation" => 0,
          "moment_id" => moment_a["id"],
          "author_user_id" => creator,
          "reality_id" => "reality-creator-origin",
          "actor_user_id" => creator,
          "captured_moment_id" => moment_a["id"]
        },
        %{
          "generation" => 1,
          "moment_id" => moment_a["id"],
          "author_user_id" => creator,
          "reality_id" => fork_b["reality_id"],
          "actor_user_id" => follower_b,
          "experience_id" => "exp-b",
          "captured_moment_id" => moment_b["id"]
        },
        %{
          "generation" => 2,
          "moment_id" => moment_b["id"],
          "author_user_id" => follower_b,
          "reality_id" => fork_c["reality_id"],
          "actor_user_id" => follower_c,
          "experience_id" => "exp-c"
        }
      ])

    solo = PersonalLifeCuration.suggest(%{"area_label" => "Little Italy", "discretionary_budget" => 70})

    %{
      "loop" => "creator_life",
      "follow_graph" => fg,
      "experience_field" => field,
      "fork_b" => fork_b,
      "fork_c" => fork_c,
      "propagation" => propagation,
      "metrics" => ExperiencePropagation.network_metrics(propagation),
      "solo_curation" => solo,
      "invariants" => organism_invariants(),
      "is_payout" => false
    }
  end

  @doc "Hard organism invariants — must all hold."
  def organism_invariants do
    %{
      "follow_is_not_friend" => not FollowGraph.grants_friend_visibility?(),
      "follow_not_relationship_graph" => not FollowGraph.is_relationship_graph?(),
      "relationship_graph_still_owns_friends" => RelationshipGraph.default_visibility() == "friends",
      "fork_does_not_auto_invite_creator" => not ExperienceFork.auto_invites_creator?(),
      "fork_does_not_clone_logistics" => not ExperienceFork.clones_creator_logistics?(),
      "discovery_not_commission_ranked" => not ExperienceField.discovery_uses_commission?(),
      "discovery_not_doomscroll_required" => not ExperienceField.doomscroll_required?(),
      "financial_fit_not_payment_auth" => not FinancialFit.financial_fit_authorizes_payment?(),
      "finance_not_exposed_to_followers" => not FinancialFit.expose_balance_to_followers?(),
      "no_recruitment_reward" => not ExperiencePropagation.recruitment_rewarded?(),
      "not_mlm" => not ExperiencePropagation.is_mlm?(),
      "solo_no_fake_friend" => not PersonalLifeCuration.fake_friend_required?(),
      "personal_does_not_replace_shared" => not PersonalLifeCuration.replaces_shared_reality?(),
      "attribution_not_social_rank" => not AttributionGraph.social_rank_uses_commission?(),
      "compound_extends_not_replaces" => true,
      "is_payout" => false
    }
  end

  @doc "Adversarial activation fuzz — many dimension combinations, one Reality model."
  def activation_fuzz(count \\ 24) when is_integer(count) and count > 0 do
    whos = [["solo"], ["a", "b"], ["a", "b", "c"], ["family-a", "family-b"]]
    whats = ["coffee", "dinner", "walk", "concert", "trip", "workout", "museum"]
    whens = ["open", "tonight", "tomorrow", "saturday morning"]
    contexts = ["date", "solo", "friends", "coworker", "travel", "creator"]

    for i <- 1..count do
      who = Enum.at(whos, rem(i, length(whos)))
      what = Enum.at(whats, rem(i, length(whats)))
      when_l = Enum.at(whens, rem(i * 3, length(whens)))
      ctx = Enum.at(contexts, rem(i * 5, length(contexts)))

      moment =
        SocialMoment.new(%{
          "id" => "fuzz-m-#{i}",
          "author_user_id" => "creator-fuzz",
          "caption" => "#{what} vibes",
          "social_context" => "#{what} · #{ctx}",
          "place_ref" => %{"display_name" => "Place #{rem(i, 7)}", "provider" => "recorded_fixture"}
        })

      actor = "actor-#{i}"

      {:ok, fg, _} = FollowGraph.follow(FollowGraph.new(), actor, "creator-fuzz")

      {:ok, fork} =
        ExperienceFork.fork_moment(moment, %{
          "actor_user_id" => actor,
          "participant_user_ids" => if(who == ["solo"], do: [actor], else: [actor | who]),
          "what" => String.capitalize(what),
          "when" => when_l,
          "follow_graph" => fg
        })

      %{
        "i" => i,
        "who_count" => length(fork["reality_seed"]["participant_user_ids"]),
        "what" => fork["reality_seed"]["what"],
        "when" => fork["reality_seed"]["when"],
        "creator_auto_invited" => fork["reality_seed"]["creator_auto_invited"] == true,
        "ok" => fork["not_creator_invitation"] == true or actor == "creator-fuzz"
      }
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
