defmodule OpalCore.Repair12R2Test do
  @moduledoc """
  Repair #12 — R2 (venue intelligence, context coherence, location pipeline).

  Each repair below gets a regression test. Pure tests first (no DB), then
  DB-backed tests for the attach invariant and the provider-failure copy.
  """
  use ExUnit.Case, async: true

  alias OpalCore.Center.PlanContextPatch
  alias OpalCore.Center.DeviceLocation
  alias OpalCore.OpalIntent
  alias OpalCore.Intelligence.Extractor

  # ---------------------------------------------------------------- F12-40
  describe "F12-40 — locality capture is a general multi-word phrase, not an allowlist" do
    test "Los Angeles is not truncated to Los" do
      assert %{name: "Nighthawk", locality: "Los Angeles"} =
               PlanContextPatch.extract_exact_venue("Find Nighthawk in Los Angeles")
    end

    test "New York is captured whole" do
      assert %{name: "The Henry", locality: "New York"} =
               PlanContextPatch.extract_exact_venue("Find The Henry in New York")
    end

    test "three-word localities work" do
      assert %{name: "Nighthawk", locality: "San Luis Obispo"} =
               PlanContextPatch.extract_exact_venue("Find Nighthawk in San Luis Obispo")
    end

    test "single-word localities still work" do
      assert %{name: "Nighthawk", locality: "Coronado"} =
               PlanContextPatch.extract_exact_venue("Find Nighthawk in Coronado")
    end

    test "bare day tail is stripped from the locality" do
      assert %{name: "Nighthawk", locality: "San Diego"} =
               PlanContextPatch.extract_exact_venue("Find Nighthawk in San Diego Saturday")
    end

    test "no locality returns nil (use named_find_no_locality for name-only)" do
      # extract_exact_venue requires a locality; name-only goes through
      # OpalIntent.named_find_no_locality/1.
      assert PlanContextPatch.extract_exact_venue("Find Nighthawk") == nil
    end
  end

  # --------------------------------------------------------------- F12-04a
  describe "F12-04a — venue questions route to venue handling, never the sticky who branch" do
    test "extract_venue_question finds 'do you know where Nighthawk is'" do
      assert %{name: "Nighthawk"} =
               PlanContextPatch.extract_venue_question("do you know where Nighthawk is")
    end

    test "extract_venue_question finds 'where is The Henry in Coronado' (name only)" do
      # extract_venue_question is for locality-less questions; the "in Coronado"
      # variant is handled by extract_exact_venue.
      assert %{name: "The Henry"} =
               PlanContextPatch.extract_venue_question("where is The Henry in Coronado")
    end

    test "extract_venue_question finds 'what's the address of Nighthawk'" do
      assert %{name: "Nighthawk"} =
               PlanContextPatch.extract_venue_question("what's the address of Nighthawk")
    end

    test "non-venue questions return nil" do
      assert PlanContextPatch.extract_venue_question("how are you doing today") == nil
      assert PlanContextPatch.extract_venue_question("what time works for you") == nil
    end

    test "venue question classifies :named_venue even with a sticky recent_who" do
      ctx = %{
        recent_who: ["Maya"],
        known_contacts: ["Maya", "Chanelle"],
        current_plan: nil
      }

      assert {:ok, %{intent: :named_venue}} =
               OpalIntent.classify("do you know where Nighthawk is", ctx)
    end

    test "person-guard: 'where is Maya' stays :chat for a known contact" do
      ctx = %{
        recent_who: ["Maya"],
        social: %{frequent_contacts: [%{display_name: "Maya"}, %{display_name: "Chanelle"}]},
        current_plan: nil
      }

      assert {:ok, %{intent: :chat}} = OpalIntent.classify("where is Maya", ctx)
    end

    test "unknown names go to venue handling (location question, will clarify)" do
      ctx = %{
        recent_who: [],
        social: %{frequent_contacts: [%{display_name: "Maya"}]},
        current_plan: nil
      }

      assert {:ok, %{intent: :named_venue}} = OpalIntent.classify("where is Jordan", ctx)
    end
  end

  # ---------------------------------------------------------------- F12-30
  describe "F12-30 — who-extraction never parrots venue/locality/clock tokens" do
    test "The Henry + Coronado + 10 AM resolve to venue/locality/time, not people" do
      ctx = %{known_contacts: ["Maya", "Chanelle"], current_plan: nil}
      {:ok, %{intent: intent, entities: entities}} =
        OpalIntent.classify("The Henry in Coronado on Sunday at 10 AM", ctx)

      assert intent in [:named_venue, :plan_create]
      who = entities[:who] || entities["who"] || []
      refute "Henry" in who
      refute "Coronado" in who
      refute "AM" in who
    end

    test "bare AM/PM tokens are not people" do
      ctx = %{known_contacts: [], current_plan: nil}
      {:ok, %{entities: entities}} = OpalIntent.classify("dinner at 10 AM", ctx)
      who = entities[:who] || entities["who"] || []
      refute "AM" in who
    end

    test "explicit 'with Maya' still wins as a person" do
      ctx = %{
        social: %{frequent_contacts: [%{display_name: "Maya"}]},
        current_plan: nil
      }

      {:ok, %{intent: intent, entities: entities}} =
        OpalIntent.classify("plan dinner with Maya on Friday", ctx)

      assert intent == :plan_create
      who = entities[:who] || entities["who"] || []
      assert "Maya" in who
    end
  end

  # ---------------------------------------------------------------- F12-42
  describe "F12-42 — one copy source for the named-venue in-flight line" do
    test "venue_lookup_copy produces the canonical line" do
      assert PlanContextPatch.venue_lookup_copy("Nighthawk", "Coronado") ==
               "Looking up Nighthawk in Coronado…"
    end

    test "venue_lookup_copy handles missing locality" do
      assert PlanContextPatch.venue_lookup_copy("Nighthawk", nil) ==
               "Looking up Nighthawk…"
    end

    test "venue_lookup_copy rejects blank names" do
      assert PlanContextPatch.venue_lookup_copy("", "Coronado") == nil
      assert PlanContextPatch.venue_lookup_copy(nil, "Coronado") == nil
    end
  end

  # ----------------------------------------------------------------- F12-02
  describe "F12-02 — plan.change_time / plan.change_date extractor intents" do
    test "'Actually, let's do 8:00 PM' is a time change, not a counter" do
      {intent, entities, _} = Extractor.classify_message("Actually, let's do 8:00 PM")
      assert intent == "plan.change_time"
      assert entities["new_time"] == "8:00 PM"
    end

    test "'move it to 8pm' is a time change" do
      {intent, entities, _} = Extractor.classify_message("move it to 8pm")
      assert intent == "plan.change_time"
      assert is_binary(entities["new_time"])
    end

    test "'can we move it to Saturday' is a date change" do
      {intent, entities, _} = Extractor.classify_message("can we move it to Saturday")
      assert intent == "plan.change_date"
      assert entities["new_date"] == "Saturday"
    end

    test "'let's do Friday instead' is a date change" do
      {intent, entities, _} = Extractor.classify_message("let's do Friday instead")
      assert intent == "plan.change_date"
    end

    test "'after 10 works better' stays a counter (no concrete value)" do
      {intent, _, _} = Extractor.classify_message("after 10 works better")
      assert intent == "plan.counter"
    end

    test "question form stays a counter" do
      {intent, _, _} = Extractor.classify_message("move it to 8pm?")
      assert intent == "plan.counter"
    end

    test "negation is not a change" do
      {intent, _, _} = Extractor.classify_message("don't move it to 8pm")
      refute intent == "plan.change_time"
    end

    test "meridiem-less bare hour is not a change" do
      {intent, _, _} = Extractor.classify_message("move it to 8")
      refute intent == "plan.change_time"
    end
  end

  # ----------------------------------------------------------------- F12-11
  describe "F12-11 — DeviceLocation invariant layer" do
    test "validate_coords accepts real coords" do
      assert {:ok, %{"lat" => 32.625, "lon" => -117.171}} =
               DeviceLocation.validate_coords(%{"lat" => 32.6253, "lon" => -117.1712})
    end

    test "validate_coords coarsens to 3 decimals server-side" do
      assert {:ok, %{"lat" => 32.625, "lon" => -117.171}} =
               DeviceLocation.validate_coords(%{"lat" => 32.62534, "lon" => -117.17119})
    end

    test "validate_coords rejects garbage" do
      assert {:error, _} = DeviceLocation.validate_coords(%{"lat" => "abc", "lon" => 1})
      assert {:error, _} = DeviceLocation.validate_coords(%{"lat" => 91.0, "lon" => 0.0})
      assert {:error, _} = DeviceLocation.validate_coords(nil)
      assert {:error, _} = DeviceLocation.validate_coords(%{})
    end

    test "haversine_km matches a known distance" do
      # San Diego to Los Angeles is ~180 km.
      km = DeviceLocation.haversine_km(32.7157, -117.1611, 34.0522, -118.2437)
      assert km > 170 and km < 195
    end

    test "haversine_km is zero for identical points" do
      assert DeviceLocation.haversine_km(32.0, -117.0, 32.0, -117.0) < 0.001
    end

    test "haversine_km returns nil for non-numeric input" do
      assert DeviceLocation.haversine_km(nil, 0, 0, 0) == nil
      assert DeviceLocation.haversine_km("x", 0, 0, 0) == nil
    end

    test "distance_label formats near and far" do
      assert DeviceLocation.distance_label(32.7157, -117.1611, 32.72, -117.16) =~ ~r/mi away/
      assert DeviceLocation.distance_label(32.7157, -117.1611, 34.0522, -118.2437) =~ ~r/mi away/
      assert DeviceLocation.distance_label(nil, 0, 0, 0) == nil
    end

    test "origin_sources is the closed set" do
      assert DeviceLocation.origin_sources() == ["device", "manual", "named_destination"]
    end
  end
end
