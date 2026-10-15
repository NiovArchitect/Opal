defmodule OpalCore.Center.PlanContextPatchTest do
  use ExUnit.Case, async: true

  alias OpalCore.Center.PlanContextPatch

  test "missing patch fields mean unchanged" do
    prior = %{"who" => ["Pat"], "destination" => "Mexico City", "when" => "Saturday"}
    next = PlanContextPatch.apply(prior, %{"when" => "Sunday"})

    assert next["who"] == ["Pat"]
    assert next["destination"] == "Mexico City"
    assert next["when"] == "Sunday"
  end

  test "destination patch does not wipe who" do
    prior = %{"who" => "Pat"}
    next = PlanContextPatch.apply(prior, %{"destination" => "Lisbon"})
    assert next["who"] == "Pat"
    assert next["destination"] == "Lisbon"
  end

  test "extract correction from text" do
    patch = PlanContextPatch.extract_from_text("Actually Sunday.", %{"when" => "Saturday"})
    assert patch["when"] == "Sunday"
  end

  test "extract cancel restaurant keep plan" do
    patch =
      PlanContextPatch.extract_from_text(
        "Never mind, cancel the restaurant but keep the Mexico City plan.",
        %{"destination" => "Mexico City", "venue" => "Somewhere"}
      )

    assert patch["cancel_venue_keep_plan"] == true
    assert patch["venue"] == "__clear__"
  end

  test "surprise detect" do
    patch = PlanContextPatch.extract_from_text("I want to surprise them with Mexico City Saturday.")
    assert patch["visibility_mode"] == "surprise"
    assert patch["surprise"] == true
  end

  test "solo intent clears who without wiping destination" do
    prior = %{"who" => ["Maya"], "destination" => "San Diego", "when" => "tonight"}
    patch = PlanContextPatch.extract_from_text("Just for me — find a restaurant in San Diego tonight.", prior)
    assert patch["solo"] == true
    assert patch["who"] == "__clear__"

    next = PlanContextPatch.apply(prior, patch)
    assert next["solo"] == true
    assert Map.get(next, "who") == nil
    assert next["destination"] == "San Diego"
    assert next["when"] == "tonight"
  end

  test "slots_changed_by_patch reports explicit when" do
    patch = PlanContextPatch.extract_from_text("Actually Sunday.", %{"when" => "Saturday"})
    assert "when" in PlanContextPatch.slots_changed_by_patch(patch)
  end

  test "temporal phrase never duplicates daypart" do
    alias OpalCore.Center.TemporalPhrase

    assert TemporalPhrase.when_phrase("tonight") == "tonight"
    assert TemporalPhrase.when_phrase("Saturday") == "Saturday night"
    assert TemporalPhrase.when_phrase("Sunday evening") == "Sunday evening"
    refute TemporalPhrase.duplicate_daypart?(TemporalPhrase.when_phrase("tonight"))
  end

  test "exact named venue extract is person-agnostic" do
    patch = PlanContextPatch.extract_from_text("Take us to Night Hawk in Coronado Friday.")
    assert patch["search_mode"] == "exact_entity"
    assert patch["requested_venue_name"] =~ ~r/Night Hawk/i
    assert patch["requested_venue_locality"] =~ ~r/Coronado/i
    assert patch["destination"] =~ ~r/Coronado/i
    assert patch["wants_restaurant"] == true
  end

  test "discovery phrasing is not exact entity" do
    patch =
      PlanContextPatch.extract_from_text(
        "Find somewhere Mediterranean for us in San Diego Saturday."
      )

    refute patch["search_mode"] == "exact_entity"
    refute Map.has_key?(patch, "requested_venue_name")
  end

  test "generic Friday dinner clears who inheritance cues" do
    assert PlanContextPatch.generic_open_window?("Friday dinner — still open")
    assert PlanContextPatch.generic_open_window?("Dinner Friday")
    refute PlanContextPatch.generic_open_window?("Friday dinner with Maya")

    prior = %{"who" => "Maya", "destination" => "Mexico City", "plan_id" => "old"}
    patch = PlanContextPatch.extract_from_text("Friday dinner — still open", prior)
    assert patch["who"] == "__clear__"
    assert patch["intent_scope"] == "generic_open_window"
  end

  test "change time to 8 PM extracts when_time" do
    patch =
      PlanContextPatch.extract_from_text("Change the time to 8 PM", %{
        "when" => "Saturday",
        "plan_id" => "p1"
      })

    assert patch["when_time"] =~ ~r/8\s*PM/i
  end

  test "opportunity fingerprint is stable for same intent" do
    a =
      PlanContextPatch.opportunity_fingerprint(%{
        "intent_scope" => "generic_open_window",
        "when" => "Friday",
        "destination" => "",
        "who" => nil
      })

    b =
      PlanContextPatch.opportunity_fingerprint(%{
        "intent_scope" => "generic_open_window",
        "when" => "Friday",
        "destination" => "",
        "who" => nil
      })

    assert a == b
    assert is_binary(a)
  end
end
