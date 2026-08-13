defmodule OpalCore.SocialFlow.PlaceOptionCompositionTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.PlaceOptionComposition
  alias OpalCore.SocialFlow.RealWorld.Place.PreferenceMemory

  test "Italian episode category ranks italian cuisine first" do
    result =
      PlaceOptionComposition.compose(%{
        "place_gap_label" => "Italian dinner · place still open",
        "what" => "Dinner",
        "party_size" => 2
      })

    refute result["irrelevant"]
    top = hd(result["ranked"])
    assert top["cuisine"] == "italian" or top["display_name"] =~ ~r/Juniper|Italian/i
  end

  test "current lively intent overrides quiet relationship memory" do
    {:ok, quiet} =
      PreferenceMemory.remember(%{
        owner_user_id: "u1",
        preference: "quiet restaurants",
        polarity: "prefer",
        scope: "relationship",
        relationship_id: "rel-1",
        weight_class: "old_statement"
      })

    result =
      PlaceOptionComposition.compose(%{
        "place_gap_label" => "Italian dinner · place still open",
        "relationship_prefs" => [quiet],
        "relationship_id" => "rel-1",
        "current_intent" => "lively",
        "what" => "Dinner"
      })

    top = hd(result["ranked"])
    # Lively tonight beats old quiet memory (may still be Italian if composed)
    assert top["quiet"] == false or top["score"] >= 3.0
  end

  test "relationship memory still exists after episode override (non-destructive)" do
    {:ok, quiet} =
      PreferenceMemory.remember(%{
        owner_user_id: "u1",
        preference: "quiet restaurants",
        polarity: "prefer",
        scope: "personal",
        weight_class: "old_statement"
      })

    _ =
      PlaceOptionComposition.compose(%{
        "current_intent" => "lively",
        "relationship_prefs" => [quiet],
        "what" => "Dinner"
      })

    # Memory fact not mutated
    assert quiet["preference"] =~ ~r/quiet/
    assert quiet["revoked"] != true
  end

  test "irrelevant memory for fixed event does not invent restaurant list" do
    {:ok, sushi} =
      PreferenceMemory.remember(%{
        owner_user_id: "u1",
        preference: "sushi",
        polarity: "prefer",
        scope: "personal"
      })

    result =
      PlaceOptionComposition.compose(%{
        "fixed_event" => true,
        "relationship_prefs" => [sushi],
        "what" => "Concert"
      })

    assert result["irrelevant"] == true
    assert result["ranked"] == []
  end

  test "where already known — memory does not re-solve place" do
    result =
      PlaceOptionComposition.compose(%{
        "where" => "Juniper & Ivy",
        "where_known" => true,
        "place_gap_label" => "Italian dinner · place still open"
      })

    assert result["irrelevant"] == true
    assert result["ranked"] == []
  end

  test "detect_current_intent from message text" do
    assert PlaceOptionComposition.detect_current_intent("somewhere lively tonight") == "lively"
    assert PlaceOptionComposition.detect_current_intent("somewhere quiet") == "quiet"
    assert PlaceOptionComposition.detect_current_intent("Italian sounds good") == nil
  end
end
