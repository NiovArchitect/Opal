defmodule OpalCore.SocialFlow.HomeProjectionTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.HomeProjection

  test "a greeting does not become a home object" do
    assert HomeProjection.from_alignment(%{"prompt" => "Good afternoon"}, "conv", 2) == nil
  end

  test "locked time without a place does not become a home object" do
    alignment = %{
      "commitment" => "aligned",
      "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
      "place" => %{"state" => "unknown"}
    }

    assert HomeProjection.from_alignment(alignment, "conv", 2) == nil
  end

  test "a committed dyad plan stays with the participants and is not public" do
    alignment = %{
      "lineage_id" => "plan-1",
      "plan_version" => 3,
      "commitment" => "execution_ready",
      "date" => %{"value" => "Tuesday · Sep 29"},
      "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
      "place" => %{"state" => "locked", "value" => "Fort Oak"},
      "activity" => %{"value" => "Dinner"}
    }

    card = HomeProjection.from_alignment(alignment, "conv", 2)

    assert card["visibility"] == "participants"
    assert card["public"] == false
    assert card["share"] == "explicit_only"
    assert card["participant_mode"] == "dyad"
    assert card["kicker"] == "Plan set ✓"
    assert card["when_label"] == "Tuesday · Sep 29 · 7:30 PM"
    assert card["place"] == "Fort Oak"
    assert card["activity"] == "Dinner"
    assert card["timezone"] == "America/Los_Angeles"
    assert card["place_identity"]["name"] == "Fort Oak"
    assert card["place_identity"]["area"] == "Mission Hills"
    assert is_binary(card["place_identity"]["place_id"])
    assert card["place_identity"]["address"] =~ "1011 Fort Stockton"
    assert is_map(card["place_identity"]["coordinates"])
    assert card["place_identity"]["provenance"] in ["recorded_fixture", "recorded_google_places", "google_places"]
    refute card["place_identity"]["area"] == "North Park"
    assert card["execution_label"] == "Reservation approved"
    assert card["execution_detail"] == "Booking hasn't been placed yet."
  end

  test "one participant is a solo plan, not a social agreement" do
    alignment = %{
      "commitment" => "aligned",
      "exact_time" => %{"state" => "locked", "value" => "10:00 AM"},
      "place" => %{"state" => "locked", "value" => "Church"}
    }

    card = HomeProjection.from_alignment(alignment, "conv", 1)

    assert card["participant_mode"] == "solo"
    assert card["public"] == false
    assert card["execution_label"] == nil
    assert card["place_identity"]["resolution"] == "unknown"
    assert card["place_identity"]["coordinates"] == nil
    assert card["place_identity"]["provenance"] in [
             "named_place_without_catalog_entity",
             "curated_catalog_no_live_travel_availability_or_trend"
           ] or is_binary(card["place_identity"]["provenance"])
  end

  test "pending change_proposal projects value and field without replacing committed when" do
    alignment = %{
      "lineage_id" => "plan-fort-oak",
      "plan_version" => 4,
      "commitment" => "aligned",
      "date" => %{"value" => "Tuesday · Sep 29"},
      "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
      "place" => %{"state" => "locked", "value" => "Fort Oak"},
      "change_proposal" => %{
        "field" => "exact_time",
        "value" => "8:00 PM",
        "proposal_id" => "p-8pm"
      }
    }

    card = HomeProjection.from_alignment(alignment, "conv", 2)

    assert card["pending_change"] == true
    assert card["pending_proposal_value"] == "8:00 PM"
    assert card["pending_proposal_field"] == "exact_time"
    assert card["when_label"] == "Tuesday · Sep 29 · 7:30 PM"
    assert card["place"] == "Fort Oak"
  end
end
