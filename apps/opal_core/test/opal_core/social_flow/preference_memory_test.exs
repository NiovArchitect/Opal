defmodule OpalCore.SocialFlow.PreferenceMemoryTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.RealWorld.Place.{Catalog, PreferenceMemory}

  test "relationship-scoped preference does not leak to other relationship" do
    {:ok, quiet_pref} =
      PreferenceMemory.remember(%{
        owner_user_id: "jordan",
        preference: "quiet restaurants",
        polarity: "prefer",
        scope: "relationship",
        relationship_id: "rel-jordan-sadeil",
        source_message_id: "m1",
        confidence: 0.8
      })

    assert PreferenceMemory.applicable_to_context?(quiet_pref, %{
             "relationship_id" => "rel-jordan-sadeil"
           })

    refute PreferenceMemory.applicable_to_context?(quiet_pref, %{
             "relationship_id" => "rel-maya-sadeil"
           })

    refute PreferenceMemory.applicable_to_context?(quiet_pref, %{
             "relationship_id" => "friends-group"
           })
  end

  test "old quiet evidence ranks quiet places higher until current lively intent overrides" do
    candidates = Catalog.list_candidates(category: "dinner")

    {:ok, quiet_pref} =
      PreferenceMemory.remember(%{
        owner_user_id: "jordan",
        preference: "quiet so we can talk",
        polarity: "prefer",
        scope: "personal",
        provenance: "conversation",
        weight_class: "old_statement",
        source_message_id: "m1"
      })

    ranked_quiet =
      PreferenceMemory.rank_candidates(candidates, [quiet_pref], %{
        "relationship_id" => "rel-j"
      })

    top_quiet = hd(ranked_quiet)
    assert top_quiet["quiet"] == true

    ranked_lively =
      PreferenceMemory.rank_candidates(candidates, [quiet_pref], %{
        "relationship_id" => "rel-j",
        "current_intent" => "lively"
      })

    # Current intent overrides imprisonment by old quiet memory
    top_lively = hd(ranked_lively)
    assert top_lively["quiet"] == false
    assert top_lively["score"] > top_quiet["score"] or top_lively["id"] != top_quiet["id"]
  end
end
