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
end
