defmodule OpalCore.Bookings.BookingExtractionTest do
  use ExUnit.Case, async: true

  alias OpalCore.Intelligence.Extractor

  describe "clear booking_request (5)" do
    test "book a flight to NYC → flight" do
      {intent, entities, _} = Extractor.classify_message("Can you book a flight to NYC for Saturday?")
      assert intent == "booking_request"
      assert entities["booking_type"] == "flight"
    end

    test "reserve a hotel in CDMX → hotel" do
      {intent, entities, _} = Extractor.classify_message("Please reserve a hotel in Mexico City")
      assert intent == "booking_request"
      assert entities["booking_type"] == "hotel"
    end

    test "book a table at Contramar → restaurant" do
      {intent, entities, _} = Extractor.classify_message("Book a table at Contramar for 7pm")
      assert intent == "booking_request"
      assert entities["booking_type"] == "restaurant"
    end

    test "get tickets for the Frida show → activity" do
      {intent, entities, _} = Extractor.classify_message("Can you get tickets for the Frida museum?")
      assert intent == "booking_request"
      assert entities["booking_type"] == "activity"
    end

    test "book our flights home → flight" do
      {intent, entities, _} = Extractor.classify_message("Let's book our flights home on Sunday")
      assert intent == "booking_request"
      assert entities["booking_type"] == "flight"
    end
  end

  describe "ambiguous → clarify, do not guess (3)" do
    test "book something" do
      {intent, entities, _} = Extractor.classify_message("Can you book something for us?")
      assert intent == "clarify"
      assert entities["booking_ambiguous"] == true
      refute entities["booking_type"]
    end

    test "can you book for me" do
      {intent, entities, _} = Extractor.classify_message("Can you book for me?")
      assert intent == "clarify"
      assert entities["booking_ambiguous"] == true
      refute entities["booking_type"]
    end

    test "book a thing without type" do
      {intent, entities, _} = Extractor.classify_message("Book a reservation please")
      assert intent == "clarify"
      assert entities["booking_ambiguous"] == true
      refute Map.get(entities, "booking_type") in ["flight", "hotel", "restaurant", "activity"]
    end
  end

  describe "non-bookings not flagged (2)" do
    test "book club" do
      {intent, entities, _} = Extractor.classify_message("Are you coming to book club tonight?")
      assert intent != "booking_request"
      refute entities["booking_type"]
      refute entities["booking_ambiguous"]
    end

    test "book report" do
      {intent, entities, _} = Extractor.classify_message("I still need to finish my book report")
      assert intent != "booking_request"
      refute entities["booking_type"]
      refute entities["booking_ambiguous"]
    end
  end
end
