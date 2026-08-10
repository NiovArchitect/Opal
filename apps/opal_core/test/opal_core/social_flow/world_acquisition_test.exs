defmodule OpalCore.SocialFlow.WorldAcquisitionTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Ambient.{
    ProviderResultGate,
    WorldOpportunity
  }

  alias OpalCore.SocialFlow.Physical.{
    HardCandidateFilter,
    OpportunitySource,
    WorldFact
  }

  test "source contract: what exists not what users should do" do
    assert {:ok, r} =
             OpportunitySource.acquire(%{
               area_label: "Carlsbad",
               category: "dinner",
               actionability_probability: 0.6
             })

    assert r["answers"] == "what_exists"
    assert r["does_not_answer"] == "what_should_users_do"
    refute r["authorizes_set"]
    refute r["feed"]
  end

  test "provenance mandatory on normalized candidates" do
    c =
      OpportunitySource.normalize_candidate(
        %{
          "id" => "p1",
          "name" => "Harbor Table",
          "categories" => ["dinner"],
          "area_label" => "Carlsbad",
          "open_now" => true
        },
        %{"area_label" => "Carlsbad"},
        :catalog
      )

    assert c["provenance"]["source"]
    assert c["provenance"]["source_item_id"]
    assert c["provenance"]["observed_at"]
    assert c["provenance"]["social_exposure"] == false
    assert is_list(c["facts"])
  end

  test "stars and reviews are not live heat" do
    assert WorldFact.popularity_is_not_live_heat?(%{
             rating: 4.9,
             review_count: 10_000
           })

    refute WorldFact.popularity_is_not_live_heat?(%{
             rating: 4.9,
             live_demand: true
           })
  end

  test "hard filter removes closed and unreachable; no majority override" do
    r =
      HardCandidateFilter.filter(
        [
          %{"provider_place_id" => "a", "open_now" => false, "open_at_plan_time" => false},
          %{
            "provider_place_id" => "b",
            "open_now" => true,
            "open_at_plan_time" => true,
            "travel_minutes" => 90
          },
          %{"provider_place_id" => "c", "open_now" => true, "open_at_plan_time" => true}
        ],
        %{
          coordination_mode: "tonight",
          max_travel_minutes: 40
        }
      )

    assert r["majority_cannot_override"]
    ids = Enum.map(r["candidates"], & &1["provider_place_id"])
    assert ids == ["c"]
  end

  test "weak hang sometime does not acquire world" do
    assert {:ok, w} =
             WorldOpportunity.acquire(%{
               weak_intent: true,
               quality_band: "thin",
               area_label: "Carlsbad",
               category: "dinner"
             })

    assert w["skipped"] == true or w["candidate_count"] == 0
    assert w["provider_queries_avoided"] == true or w["skipped"]
  end

  test "world acquire with zone returns provenance-bearing candidates" do
    assert {:ok, w} =
             WorldOpportunity.acquire(%{
               area_label: "Carlsbad",
               category: "dinner",
               quality_band: "solid",
               coordination_mode: "tonight",
               available_minutes: 180
             })

    refute w["feed"]
    refute w["authorizes_set"]
    assert w["answers"] == "what_exists" or w["acquisition_only"]
    assert w["popularity_is_not_heat"]
    assert is_binary(w["query_fingerprint"]) or w["skipped"]
  end

  test "execution availability claim requires live truth" do
    refute ProviderResultGate.claim_allowed?(:availability, %{live: false})["allowed"]
    assert ProviderResultGate.claim_allowed?(:fit, %{live: false})["allowed"]
    assert ProviderResultGate.claim_allowed?(:booked, %{provider_confirmed: true})["allowed"]
  end

  test "late result with old plan version suppressed" do
    g =
      ProviderResultGate.admit?(%{
        result_plan_version: 3,
        active_plan_version: 7,
        claim_type: "fit"
      })

    refute g["admit"]
    assert g["reason"] == "plan_version_mismatch"
  end

  test "unbounded query without zone is skipped" do
    assert {:skip, "unbounded_query"} =
             OpportunitySource.query_worth_running?(%{category: "dinner"})
  end
end
