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
    assert card["place_identity"]["area"] == "North Park"
    assert card["place_identity"]["place_id"] == nil
    assert card["place_identity"]["address"] == nil
    assert card["place_identity"]["coordinates"] == nil
    assert card["place_identity"]["provenance"] ==
             "curated_catalog_no_live_travel_availability_or_trend"
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
    assert card["place_identity"]["provenance"] == "named_place_without_catalog_entity"
    assert card["place_identity"]["coordinates"] == nil
  end
end
