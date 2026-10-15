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

  test "Find The Henry restaurant in Coronado is exact entity not discovery" do
    patch = PlanContextPatch.extract_from_text("Find The Henry restaurant in Coronado.")
    assert patch["search_mode"] == "exact_entity"
    assert patch["requested_venue_name"] == "The Henry"
    assert patch["requested_venue_locality"] =~ ~r/Coronado/i
    refute patch["discovery_request"] == true
    refute patch["requested_venue_name"] == "__clear__"
  end

  test "Coronado in San Diego is not a restaurant named Coronado" do
    assert PlanContextPatch.extract_exact_venue("Coronado in San Diego") == nil
  end

  test "conversation acts: switch topic, cancel search, message isolation cues" do
    assert PlanContextPatch.classify_conversation_act("Actually, let's talk about something else.") ==
             "switch_topic"

    assert PlanContextPatch.classify_conversation_act(
             "Cancel the Henry search, but keep Maya's birthday plan."
           ) == "cancel_search"

    assert PlanContextPatch.classify_conversation_act("What were we discussing before?") ==
             "recall_prior_task"

    assert PlanContextPatch.classify_conversation_act("Show me the previous messages.") ==
             "show_history"
  end

  test "discovery phrasing is not exact entity" do
    patch =
      PlanContextPatch.extract_from_text(
        "Find somewhere Mediterranean for us in San Diego Saturday."
      )

    refute patch["search_mode"] == "exact_entity"
    assert patch["search_mode"] == "discovery"
    assert patch["cuisine"] == "mediterranean"
    assert patch["destination"] =~ ~r/San Diego/i
    assert patch["discovery_request"] == true
    assert patch["requested_venue_name"] == "__clear__"
  end

  test "find three mediterranean restaurants isolates from prior exact entity" do
    prior = %{
      "who" => "Quinn",
      "search_mode" => "exact_entity",
      "requested_venue_name" => "Nighthawk",
      "destination" => "Coronado",
      "plan_id" => "old-plan",
      "when" => "Friday",
      "when_resolved" => "2026-10-16",
      "when_time" => "19:30"
    }

    patch =
      PlanContextPatch.extract_from_text(
        "Find three Mediterranean restaurants in Coronado.",
        prior
      )

    assert patch["search_mode"] == "discovery"
    assert patch["cuisine"] == "mediterranean"
    assert patch["destination"] == "Coronado"
    assert patch["discovery_request"] == true
    assert patch["requested_venue_name"] == "__clear__"
    assert patch["who"] == "__clear__"
    assert patch["plan_id"] == "__clear__"
    assert patch["when"] == "__clear__"
    assert patch["when_resolved"] == "__clear__"
    assert patch["when_time"] == "__clear__"

    next = PlanContextPatch.apply(prior, patch)
    assert next["search_mode"] == "discovery"
    assert next["cuisine"] == "mediterranean"
    refute Map.get(next, "requested_venue_name")
    refute Map.get(next, "who")
    refute Map.get(next, "plan_id")
    refute Map.get(next, "when")
    refute Map.get(next, "when_resolved")
    refute Map.get(next, "when_time")
  end

  test "Henry Sunday 10am preserves all explicit constraints" do
    prior = %{
      "when" => "Friday",
      "when_time" => "19:30",
      "destination" => "Coronado",
      "venue" => "Night Hawk",
      "search_mode" => "exact_entity"
    }

    patch =
      PlanContextPatch.extract_from_text(
        "Make a plan to The Henry in Coronado for Sunday, 10 a.m.",
        prior
      )

    assert patch["requested_venue_name"] == "The Henry"
    assert patch["requested_venue_locality"] == "Coronado"
    assert patch["when"] == "Sunday"
    assert patch["when_time"] == "10 AM"
    assert patch["when_time_explicit"] == true
    refute patch["requested_venue_locality"] =~ ~r/Sunday/i

    next = PlanContextPatch.apply(prior, patch)
    assert next["venue"] == "The Henry"
    assert next["destination"] == "Coronado"
    assert next["when"] == "Sunday"
    assert next["when_time"] == "10 AM"
  end

  test "Plan Night Hawk in Coronado in San Diego does not name venue Plan Night Hawk" do
    patch =
      PlanContextPatch.extract_from_text("Plan Night Hawk in Coronado in San Diego.", %{})

    assert patch["requested_venue_name"] == "Night Hawk"
    assert patch["requested_venue_locality"] == "Coronado"
  end

  test "why did you change the time is a challenge act not a venue search" do
    patch =
      PlanContextPatch.extract_from_text("Why did you change the time when I said 10 a.m.?", %{
        "venue" => "The Henry",
        "when_time" => "19:30"
      })

    assert patch["conversation_act"] == "challenge_prior_action"
    assert patch["when_time"] == "10 AM"
    refute patch["search_mode"] == "exact_entity"
  end

  test "birthday clears prior Coronado venue contamination" do
    prior = %{
      "destination" => "Coronado",
      "venue" => "Night Hawk",
      "when" => "Friday",
      "when_time" => "19:30",
      "search_mode" => "exact_entity",
      "intent_scope" => "exact_venue",
      "explicit_constraints" => %{"when" => "Sunday", "when_time" => "10 AM"},
      "conversation_act" => "challenge_prior_action"
    }

    patch = PlanContextPatch.extract_from_text("Maya's birthday is in three days.", prior)
    assert patch["intent_scope"] == "birthday"
    assert patch["who"] == "Maya"
    assert patch["destination"] == "__clear__"
    assert patch["venue"] == "__clear__"
    assert patch["explicit_constraints"] == "__clear__"
    assert patch["conversation_act"] == "__clear__"

    next = PlanContextPatch.apply(prior, patch)
    refute next["destination"]
    refute next["venue"]
    refute next["explicit_constraints"]
    refute next["conversation_act"]
    assert next["when"] == "in three days"
    assert next["who"] == "Maya"
  end

  test "exact venue after Henry does not inherit Sunday 10 AM constraints" do
    prior = %{
      "venue" => "The Henry",
      "destination" => "Coronado",
      "when" => "Sunday",
      "when_time" => "10 AM",
      "when_time_explicit" => true,
      "explicit_constraints" => %{"when" => "Sunday", "when_time" => "10 AM"},
      "intent_scope" => "exact_venue",
      "conversation_act" => "challenge_prior_action"
    }

    patch = PlanContextPatch.extract_from_text("Plan Night Hawk in Coronado in San Diego.", prior)
    assert patch["requested_venue_name"] == "Night Hawk"
    assert patch["when"] == "__clear__" or is_nil(Map.get(patch, "when"))
    assert patch["when_time"] == "__clear__"
    assert patch["explicit_constraints"] == "__clear__"
    assert patch["conversation_act"] == "__clear__"

    next = PlanContextPatch.apply(prior, patch)
    assert next["venue"] == "Night Hawk"
    refute next["when"]
    refute next["when_time"]
    refute next["explicit_constraints"]
    refute next["conversation_act"]
  end

  test "generic Friday dinner clears who inheritance cues" do
    assert PlanContextPatch.generic_open_window?("Friday dinner — still open")
    assert PlanContextPatch.generic_open_window?("Dinner Friday")
    assert PlanContextPatch.generic_open_window?("Let's arrange dinner Friday.")
    refute PlanContextPatch.generic_open_window?("Friday dinner with Maya")

    prior = %{"who" => "Maya", "destination" => "Mexico City", "plan_id" => "old"}
    patch = PlanContextPatch.extract_from_text("Let's arrange dinner Friday.", prior)
    assert patch["who"] == "__clear__"
    assert patch["intent_scope"] == "generic_open_window"
    assert patch["when"] == "Friday"
    assert patch["wants_restaurant"] == true
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
