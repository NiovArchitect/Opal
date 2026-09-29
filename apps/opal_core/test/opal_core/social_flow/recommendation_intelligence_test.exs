defmodule OpalCore.SocialFlow.RecommendationIntelligenceTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.RecommendationIntelligence, as: Rec
  alias OpalCore.SocialFlow.RealWorld.Place.PreferenceMemory

  # --- Laws ---

  test "laws: preference soft, boundary hard, no plan commit, no self-reinforce" do
    assert Rec.preference_is_soft?()
    refute Rec.preference_becomes_hard_exclusion?()
    refute Rec.boundary_ignored_as_soft_signal?()
    refute Rec.stale_memory_overrides_current_intent?()
    refute Rec.private_memory_exposed_in_shared_reason?()
    refute Rec.private_signal_explanation_leak?()
    refute Rec.recommendation_engine_commits_shared_plan?()
    refute Rec.non_selection_auto_dislike?()
    refute Rec.location_context_to_memory?()
    refute Rec.recommendation_self_confirmation_to_durable_memory?()
    refute Rec.personalization_filter_bubble?()
    refute Rec.recommendation_reason_unsupported?()
  end

  # --- 1 CURRENT_INTENT_BEATS_SOFT_MEMORY ---

  test "CURRENT_INTENT_BEATS_SOFT_MEMORY — lively tonight beats quiet memory" do
    {:ok, quiet} =
      PreferenceMemory.remember(%{
        owner_user_id: "walk-b",
        preference: "quiet restaurants",
        polarity: "prefer",
        weight_class: "old_statement",
        confidence: 0.8
      })

    assert {:ok, result} =
             Rec.recommend(%{
               "candidates" => dinner_pool(),
               "soft_prefs" => [quiet],
               "current_intent" => "lively",
               "current_request" => "Let's go somewhere lively tonight.",
               "activity" => "dinner",
               "limit" => 3
             })

    top = hd(result["ranked"])
    assert top["quiet"] == false
    assert Rec.stale_memory_overrides_current_intent?() == false
    assert result["commits_shared_plan"] == false
  end

  # --- 2 BOUNDARY ---

  test "BOUNDARY_PROTECTED — inaccessible excluded; unknown stays unknown" do
    pool = [
      place("stairs_only", quiet: true, accessible: false, cuisine: "american"),
      place("ramp_cafe", quiet: true, accessible: true, cuisine: "american"),
      place("mystery_spot", quiet: false, accessible: nil, cuisine: "american")
    ]

    assert {:ok, result} =
             Rec.recommend(%{
               "candidates" => pool,
               "boundaries" => [%{"kind" => "accessibility", "summary" => "wheelchair accessibility"}],
               "hard_constraints" => %{"accessibility_required" => true},
               "activity" => "dinner",
               "limit" => 5
             })

    ids = Enum.map(result["ranked"], & &1["id"])
    refute "stairs_only" in ids
    assert "ramp_cafe" in ids

    mystery = Enum.find(result["ranked"], &(&1["id"] == "mystery_spot"))

    if mystery do
      assert mystery["constraint_status"]["accessibility"] == "unknown"
      assert mystery["accessible"] == nil
    end

    assert Enum.any?(result["hard_rejected"], fn r ->
             r["candidate_id"] == "stairs_only" or r["reason"] == "accessibility_incompatible"
           end)

    refute Rec.boundary_ignored_as_soft_signal?()
  end

  # --- 3 RELATIONSHIP CONTEXT ---

  test "RELATIONSHIP_CONTEXT_CHANGES_RANKING — partner vs friends" do
    pool = dinner_pool()

    {:ok, partner} =
      Rec.recommend(%{
        "candidates" => pool,
        "relationship_context" => "partner",
        "activity" => "dinner",
        "limit" => 3
      })

    {:ok, friends} =
      Rec.recommend(%{
        "candidates" => pool,
        "relationship_context" => "friends",
        "activity" => "dinner",
        "limit" => 3
      })

    partner_top = hd(partner["ranked"])
    friends_top = hd(friends["ranked"])

    # Same user, different relationship context → different ranking emphasis
    assert partner_top["quiet"] == true or partner_top["id"] != friends_top["id"]
    assert friends_top["quiet"] == false or partner_top["id"] != friends_top["id"]
  end

  # --- 4 WEAK ONE-OFF ---

  test "WEAK_ONE_OFF_MEMORY does not dominate ranking" do
    weak = %{
      "preference" => "outdoor seating",
      "polarity" => "prefer",
      "weight_class" => "inferred",
      "confidence" => 0.3,
      "observation_count" => 1,
      "evidence_kind" => "accepted_plan_pattern",
      "permission_class" => "owner_private"
    }

    pool = [
      place("indoor_a", quiet: true, outdoor: false, cuisine: "american", score: 4.8),
      place("outdoor_b", quiet: true, outdoor: true, cuisine: "american", score: 4.0)
    ]

    assert {:ok, result} =
             Rec.recommend(%{
               "candidates" => pool,
               "soft_prefs" => [weak],
               "activity" => "dinner",
               "limit" => 2
             })

    top = hd(result["ranked"])
    # Weak one-off must not flip a clearly stronger indoor candidate
    assert top["id"] == "indoor_a"
  end

  # --- 5 EXPLICIT PREFERENCE ---

  test "EXPLICIT_PREF_INFLUENCES_RANKING and current indoor overrides outdoor pref" do
    {:ok, outdoor_pref} =
      PreferenceMemory.remember(%{
        owner_user_id: "u1",
        preference: "outdoor seating",
        polarity: "prefer",
        weight_class: "explicit_current",
        confidence: 0.9
      })

    pool = [
      place("patio", quiet: true, outdoor: true, cuisine: "american", score: 4.0),
      place("inside", quiet: true, outdoor: false, cuisine: "american", score: 4.0)
    ]

    assert {:ok, boosted} =
             Rec.recommend(%{
               "candidates" => pool,
               "soft_prefs" => [outdoor_pref],
               "activity" => "dinner"
             })

    assert hd(boosted["ranked"])["id"] == "patio"

    assert {:ok, overridden} =
             Rec.recommend(%{
               "candidates" => pool,
               "soft_prefs" => [outdoor_pref],
               "current_intent" => "indoor",
               "current_request" => "Let's sit inside tonight.",
               "activity" => "dinner"
             })

    assert hd(overridden["ranked"])["id"] == "inside"
  end

  # --- 6 NOVELTY ---

  test "NOVELTY_AVAILABLE — recent winner does not monopolize top set" do
    pool =
      Enum.map(1..5, fn i ->
        place("venue_#{i}", quiet: i <= 2, outdoor: false, cuisine: "american", score: 4.5 - i * 0.05)
      end)

    assert {:ok, result} =
             Rec.recommend(%{
               "candidates" => pool,
               "recent_visits" => ["venue_1"],
               "activity" => "dinner",
               "limit" => 3
             })

    ids = Enum.map(result["ranked"], & &1["id"])
    assert length(ids) == 3
    # Filter bubble broken: at least one non-recent venue in top set
    assert Enum.any?(ids, &(&1 != "venue_1"))
    refute Rec.personalization_filter_bubble?()
  end

  # --- 7 GROUP ---

  test "GROUP_OVERLAP_RANKED — shared board identity + overlap preference" do
    pool = [
      place("only_italian", cuisine: "italian", quiet: true, score: 4.2, outdoor: false),
      place("only_seafood", cuisine: "seafood", quiet: true, score: 4.2, outdoor: false),
      place("overlap_bistro",
        cuisine: "american",
        quiet: true,
        score: 4.1,
        outdoor: false,
        overlap: true,
        shared_fit: true
      )
    ]

    participants = [
      %{
        "user_id" => "walk-a",
        "prefs" => [%{"preference" => "italian", "polarity" => "prefer", "weight_class" => "explicit_current"}],
        "permission_class" => "owner_private"
      },
      %{
        "user_id" => "walk-b",
        "prefs" => [%{"preference" => "seafood", "polarity" => "prefer", "weight_class" => "explicit_current"}],
        "permission_class" => "owner_private"
      }
    ]

    assert {:ok, for_a} =
             Rec.recommend(%{
               "candidates" => pool,
               "participants" => participants,
               "viewer_user_id" => "walk-a",
               "activity" => "dinner",
               "shared_board" => true,
               "limit" => 3
             })

    assert {:ok, for_b} =
             Rec.recommend(%{
               "candidates" => pool,
               "participants" => participants,
               "viewer_user_id" => "walk-b",
               "activity" => "dinner",
               "shared_board" => true,
               "limit" => 3
             })

    assert for_a["shared_board_ids"] == for_b["shared_board_ids"]
    assert for_a["group_fit_model"] == "overlap_not_average"

    ids = for_a["shared_board_ids"]
    assert "overlap_bistro" in ids
    # Overlap should rank at or near top when no hard conflict
    assert hd(for_a["ranked"])["id"] == "overlap_bistro" or
             Enum.find_index(ids, &(&1 == "overlap_bistro")) <= 1
  end

  # --- 8 PRIVATE MEMORY ---

  test "PRIVATE_SIGNAL_PROTECTED — shared reasons never expose private source" do
    private_pref = %{
      "preference" => "quiet restaurants",
      "polarity" => "prefer",
      "weight_class" => "explicit_current",
      "confidence" => 0.9,
      "permission_class" => "owner_private",
      "owner_user_id" => "walk-a"
    }

    assert {:ok, result} =
             Rec.recommend(%{
               "candidates" => dinner_pool(),
               "soft_prefs" => [private_pref],
               "participants" => [
                 %{"user_id" => "walk-a", "prefs" => [private_pref]},
                 %{"user_id" => "walk-b", "prefs" => []}
               ],
               "viewer_user_id" => "walk-b",
               "activity" => "dinner",
               "include_private_reasons" => false
             })

    for cand <- result["ranked"] do
      for reason <- cand["shared_reasons"] do
        refute reason =~ ~r/private/i
        refute reason =~ ~r/Walk A/i
        refute reason =~ ~r/because .+ likes/i
        refute reason =~ ~r/analyzed your/i
      end

      assert cand["private_reasons"] == []

      safe = Rec.explain_safe(cand)
      refute safe["private_leak"]
    end

    refute Rec.private_signal_explanation_leak?()
    refute Rec.private_memory_exposed_in_shared_reason?()
  end

  # --- 9 CORRECTION ---

  test "CORRECTION_SCOPED — not tonight adjusts session, not durable dislike" do
    assert {:ok, first} =
             Rec.recommend(%{
               "candidates" => dinner_pool(),
               "activity" => "dinner",
               "limit" => 3
             })

    top_id = hd(first["ranked"])["id"]

    first =
      first
      |> Map.put("request", %{
        "candidates" => dinner_pool(),
        "activity" => "dinner",
        "limit" => 3
      })
      |> Map.put("all_candidates", dinner_pool())

    assert {:ok, corrected} =
             Rec.apply_correction(first, %{
               "kind" => "not_tonight",
               "candidate_id" => top_id
             })

    assert corrected["durable_memory_written"] == false
    assert corrected["correction_applied"]["scope"] == "session_context"
    assert corrected["session_corrections"] != []
    # Demoted from top of the session ranking
    refute hd(corrected["ranked"])["id"] == top_id
  end

  # --- 10 PROVIDER ---

  test "PROVIDER_TRUTHFUL — fit separate from booking capability" do
    pool = [
      place("great_unbookable",
        quiet: false,
        cuisine: "american",
        score: 4.9,
        bookable: false,
        availability_known: false
      ),
      place("ok_bookable", quiet: false, cuisine: "american", score: 3.5, bookable: true, availability_known: true)
    ]

    assert {:ok, result} =
             Rec.recommend(%{
               "candidates" => pool,
               "current_intent" => "lively",
               "activity" => "dinner"
             })

    top = Enum.find(result["ranked"], &(&1["id"] == "great_unbookable")) || hd(result["ranked"])
    assert top["id"] == "great_unbookable"
    assert top["capabilities"]["bookable"] == false
    refute top["capabilities"]["unsupported_booking_claim"]
    refute top["capabilities"]["unsupported_availability_claim"]
    refute top["capabilities"]["unsupported_travel_claim"]
    # No fake "Available at 8" / "Close by" in reasons
    for r <- top["shared_reasons"] do
      refute r =~ ~r/available at/i
      refute r =~ ~r/close by/i
      refute r =~ ~r/\btrending\b/i
    end
  end

  # --- 11 NO SELF REINFORCEMENT ---

  test "NO_SELF_REINFORCEMENT — accept does not write durable memory" do
    assert {:ok, result} =
             Rec.recommend(%{"candidates" => dinner_pool(), "activity" => "dinner"})

    receipt = Rec.record_acceptance(hd(result["ranked"]), %{"user_id" => "walk-a"})
    assert receipt["durable_memory_written"] == false
    assert receipt["self_reinforcing_bias"] == false
    refute Rec.recommendation_self_confirmation_to_durable_memory?()
    assert result["writes_durable_memory"] == false
  end

  test "where already known — no recommendation invents a new place list" do
    assert {:reject, :where_already_known} =
             Rec.recommend(%{
               "where" => "Juniper & Ivy",
               "where_known" => true,
               "candidates" => dinner_pool()
             })
  end

  test "NON_SELECTION_AUTO_DISLIKE remains zero" do
    refute Rec.non_selection_auto_dislike?()
  end

  # --- fixtures ---

  defp dinner_pool do
    [
      place("quiet_garden", quiet: true, outdoor: true, cuisine: "american", score: 4.4),
      place("neon_hall", quiet: false, outdoor: false, cuisine: "bar", score: 4.0),
      place("harbor_fish", quiet: true, outdoor: false, cuisine: "seafood", score: 4.3),
      place("little_italy", quiet: true, outdoor: false, cuisine: "italian", score: 4.5),
      place("lively_patio", quiet: false, outdoor: true, cuisine: "american", score: 4.1)
    ]
  end

  defp place(id, opts) do
    %{
      "id" => id,
      "display_name" => Keyword.get(opts, :name, id),
      "cuisine" => Keyword.get(opts, :cuisine, "american"),
      "quiet" => Keyword.get(opts, :quiet, true),
      "outdoor" => Keyword.get(opts, :outdoor, false),
      "accessible" => Keyword.get(opts, :accessible, true),
      "score" => Keyword.get(opts, :score, 4.0),
      "open_now" => true,
      "max_party" => 8,
      "bookable" => Keyword.get(opts, :bookable, false),
      "availability_known" => Keyword.get(opts, :availability_known, false),
      "overlap" => Keyword.get(opts, :overlap, false),
      "shared_fit" => Keyword.get(opts, :shared_fit, false),
      "provenance" => "test_fixture"
    }
  end
end
