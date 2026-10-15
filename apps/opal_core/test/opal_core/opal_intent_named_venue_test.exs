defmodule OpalCore.OpalIntentNamedVenueTest do
  @moduledoc """
  Repair #11 — named-venue search intent: "Find <Name> in <Place>" classifies as
  :named_venue (exact-entity), never :chat or :recommend. Generic/cuisine
  phrasing must NOT become a named venue (discovery boundary).

  Pure unit tests (no DB).

  NOT RUN — no Elixir toolchain on this VM (mix test not available).
  Would run: `mix test apps/opal_core/test/opal_core/opal_intent_named_venue_test.exs`
  """

  use ExUnit.Case, async: true

  alias OpalCore.OpalIntent

  @empty_context %{
    user: %{id: "u1", display_name: "Alex", handle: "alex", timezone: "America/Los_Angeles"},
    taste: %{vibes: [], cuisines: [], price_comfort: nil},
    temporal: %{recent_plans: [], upcoming_celebrations: [], active_conversation_count: 0},
    social: %{
      frequent_contacts: [%{user_id: "c1", display_name: "Maya Chen"}],
      group_patterns: []
    },
    message: %{text: "", length: 0, sent_at: "2026-01-01T00:00:00Z"}
  }

  defp classify!(text, ctx \\ @empty_context) do
    assert {:ok, intent_map} = OpalIntent.classify(text, ctx)
    intent_map
  end

  defp assert_intent(text, expected, opts \\ []) do
    result = classify!(text)

    assert result.intent == expected,
           "expected #{expected} for #{inspect(text)}, got #{result.intent}"

    assert result.confidence in [:high, :medium, :low]
    assert is_map(result.entities)
    assert result.raw_text == String.trim(text)

    if Keyword.has_key?(opts, :confidence) do
      assert result.confidence == opts[:confidence]
    end

    if Keyword.has_key?(opts, :entities) do
      for {k, v} <- opts[:entities] do
        assert Map.get(result.entities, k) == v,
               "entity #{k}: expected #{inspect(v)}, got #{inspect(Map.get(result.entities, k))}"
      end
    end

    result
  end

  test "Find Nighthawk in Coronado is a named venue, not chat" do
    assert_intent("Find Nighthawk in Coronado", :named_venue,
      confidence: :high,
      entities: %{venue_name: "Nighthawk", locality: "Coronado", search_mode: "exact_entity"}
    )
  end

  test "Find The Henry restaurant in Coronado is exact entity, not discovery" do
    assert_intent("Find The Henry restaurant in Coronado", :named_venue,
      confidence: :high,
      entities: %{search_mode: "exact_entity"}
    )
  end

  test "look up Night Hawk in Coronado is a named venue" do
    assert_intent("look up Night Hawk in Coronado", :named_venue,
      confidence: :high,
      entities: %{venue_name: "Night Hawk", locality: "Coronado", search_mode: "exact_entity"}
    )
  end

  test "Find Nighthawk without locality is still a named venue (medium confidence)" do
    result = assert_intent("Find Nighthawk", :named_venue, confidence: :medium)

    assert result.entities[:venue_name] == "Nighthawk"
    assert result.entities[:search_mode] == "exact_entity"
    refute Map.has_key?(result.entities, :locality)
  end

  test "Find something for dinner stays recommend, not named venue" do
    result = classify!("Find something for dinner")

    assert result.intent == :recommend
    refute result.intent == :named_venue
  end

  test "cuisine discovery never becomes a named venue" do
    result = classify!("Find Italian restaurants in San Diego")

    refute result.intent == :named_venue
  end

  test "counted discovery never becomes a named venue" do
    result = classify!("Find three Mediterranean restaurants in Coronado")

    refute result.intent == :named_venue
  end

  test "suggest phrasing stays recommend" do
    result = classify!("Suggest a restaurant in Coronado")

    assert result.intent == :recommend
  end

  test ":named_venue is in the published taxonomy" do
    assert :named_venue in OpalIntent.intents()
  end
end
