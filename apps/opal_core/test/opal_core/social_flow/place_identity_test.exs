defmodule OpalCore.SocialFlow.PlaceIdentityTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.PlaceIdentity

  test "unambiguous Fort Oak resolves via recorded fixture — Mission Hills + address + coords" do
    id = PlaceIdentity.resolve("Fort Oak")

    assert id["canonical_name"] == "Fort Oak"
    assert id["resolution"] == "resolved"
    assert id["confidence"] >= 0.85
    assert id["address"] =~ "1011 Fort Stockton"
    assert id["address"] =~ "92103"
    assert id["area"] == "Mission Hills"
    assert id["neighborhood"] == "Mission Hills"
    assert id["locality"] == "San Diego"
    assert is_binary(id["provider_place_id"])
    assert is_map(id["coordinates"])
    assert is_number(id["coordinates"]["lat"])
    assert is_number(id["coordinates"]["lng"])
    assert id["unresolved"]["address"] == false
    assert id["unresolved"]["coordinates"] == false
    assert PlaceIdentity.precise?(id)
    assert PlaceIdentity.high_confidence?(id)
    assert get_in(id, ["provenance", "source"]) in ["recorded_fixture", "recorded_google_places"]
    assert get_in(id, ["provenance", "attempted"]) in [true, nil]
    # Catalog must not invent North Park as authority after resolution
    refute id["area"] == "North Park"
    url = PlaceIdentity.maps_handoff_url(id)
    assert is_binary(url)
    assert String.contains?(url, "1011") or String.contains?(url, "Fort")
  end

  test "ambiguous short query returns ambiguous resolution without inventing a single identity" do
    id = PlaceIdentity.resolve("Oak")

    assert id["resolution"] == "ambiguous"
    assert id["confidence"] < 0.85
    refute PlaceIdentity.high_confidence?(id)
    assert is_list(id["candidates"])
    assert length(id["candidates"]) >= 2
    assert id["unresolved"]["address"] == true or id["address"] == nil
    # Must not silently pick North Park / invent coords as authority
    refute id["area"] == "North Park"
    refute get_in(id, ["provenance", "source"]) == "invented"
  end

  test "unknown place stays unresolved after attempt — no invented coords" do
    id = PlaceIdentity.resolve("ZZZ Nonexistent Place 99999")

    assert id["canonical_name"] == "ZZZ Nonexistent Place 99999"
    assert id["resolution"] == "unknown"
    assert id["address"] == nil
    assert id["coordinates"] == nil
    assert id["provider_place_id"] == nil
    assert id["unresolved"]["address"] == true
    assert id["unresolved"]["coordinates"] == true
    assert id["unresolved"]["provider_place_id"] == true
    refute PlaceIdentity.precise?(id)
    refute PlaceIdentity.high_confidence?(id)
    assert get_in(id, ["provenance", "attempted"]) == true
  end

  test "for_surface exposes client-compatible provenance string" do
    id = PlaceIdentity.resolve("Fort Oak")
    surface = PlaceIdentity.for_surface(id)

    assert surface["name"] == "Fort Oak"
    assert surface["area"] == "Mission Hills"
    assert is_binary(surface["provenance"])
    assert surface["address"] =~ "1011 Fort Stockton"
    assert is_map(surface["coordinates"])
  end

  test "attach_resolved is idempotent for high-confidence Fort Oak" do
    state = %{
      "place" => %{"state" => "locked", "value" => "Fort Oak"}
    }

    once = PlaceIdentity.attach_resolved(state, nil)
    assert PlaceIdentity.high_confidence?(once["place_identity"])
    assert get_in(once, ["place", "identity", "address"]) =~ "1011 Fort Stockton"

    twice = PlaceIdentity.attach_resolved(state, once)
    assert get_in(twice, ["place", "identity", "provider_place_id"]) ==
             get_in(once, ["place", "identity", "provider_place_id"])
  end

  test "KNOWN_REAL_PLACE_STAYS_UNRESOLVED_WITHOUT_ATTEMPT is zero — resolve always attempts" do
    id = PlaceIdentity.resolve("Fort Oak")
    assert id["resolution"] in ["resolved", "ambiguous", "unknown"]
    assert id["resolved_at"]
  end
end
