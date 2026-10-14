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
end
