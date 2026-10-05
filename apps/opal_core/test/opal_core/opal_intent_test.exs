defmodule OpalCore.OpalIntentTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.OpalIntent

  @empty_context %{
    user: %{id: "u1", display_name: "Alex", handle: "alex", timezone: "America/Los_Angeles"},
    taste: %{vibes: [], cuisines: [], price_comfort: nil},
    temporal: %{recent_plans: [], upcoming_celebrations: [], active_conversation_count: 0},
    social: %{
      frequent_contacts: [
        %{user_id: "c1", display_name: "Maya Chen"},
        %{user_id: "c2", display_name: "John Smith"}
      ],
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
    assert result.intent == expected, "expected #{expected} for #{inspect(text)}, got #{result.intent}"
    assert result.confidence in [:high, :medium, :low]
    assert is_map(result.entities)
    assert result.raw_text == String.trim(text)

    if Keyword.has_key?(opts, :confidence) do
      assert result.confidence == opts[:confidence]
    end

    if Keyword.has_key?(opts, :entities) do
      for {k, v} <- opts[:entities] do
        assert Map.get(result.entities, k) == v,
               "entity #{k}: expected #{inspect(v)}, got #{inspect(Map.get(result.entities, k))} in #{inspect(result.entities)}"
      end
    end

    result
  end

  defp refute_intent(text, not_expected) do
    result = classify!(text)
    assert result.intent != not_expected,
           "expected NOT #{not_expected} for #{inspect(text)}, got #{result.intent}"
    result
  end

  # ---------------------------------------------------------------------------
  # plan_create — 3 positive
  # ---------------------------------------------------------------------------

  test "plan_create positive: Plan dinner with Maya Friday" do
    r =
      assert_intent("Plan dinner with Maya Friday", :plan_create,
        confidence: :high,
        entities: %{what: "dinner", when: "Friday", who: ["Maya"]}
      )

    assert r.entities.what == "dinner"
  end

  test "plan_create positive: Organize brunch with John tomorrow" do
    assert_intent("Organize brunch with John tomorrow", :plan_create,
      entities: %{what: "brunch", when: "tomorrow", who: ["John"]}
    )
  end

  test "plan_create positive: Set up coffee next week" do
    r = assert_intent("Set up coffee next week", :plan_create)
    assert r.entities.what == "coffee"
    assert r.entities.when == "next week"
  end

  test "plan_create negative: Suggest a restaurant" do
    refute_intent("Suggest a restaurant", :plan_create)
  end

  test "plan_create negative: Move dinner to Saturday" do
    refute_intent("Move dinner to Saturday", :plan_create)
  end

  # ---------------------------------------------------------------------------
  # plan_modify — 3 positive
  # ---------------------------------------------------------------------------

  test "plan_modify positive: Move dinner to Saturday" do
    assert_intent("Move dinner to Saturday", :plan_modify,
      confidence: :high,
      entities: %{action: "move", plan_ref: "dinner", new_when: "Saturday"}
    )
  end

  test "plan_modify positive: Cancel brunch" do
    assert_intent("Cancel brunch", :plan_modify, entities: %{action: "cancel", plan_ref: "brunch"})
  end

  test "plan_modify positive: Reschedule dinner for Friday" do
    r = assert_intent("Reschedule dinner for Friday", :plan_modify)
    assert r.entities.action == "reschedule"
    assert r.entities.plan_ref == "dinner"
    assert r.entities.new_when == "Friday"
  end

  test "plan_modify negative: Plan dinner Friday" do
    refute_intent("Plan dinner Friday", :plan_modify)
  end

  test "plan_modify negative: Remember Maya is vegetarian" do
    refute_intent("Remember Maya is vegetarian", :plan_modify)
  end

  # ---------------------------------------------------------------------------
  # remember — 3 positive
  # ---------------------------------------------------------------------------

  test "remember positive: Remember Maya is vegetarian" do
    assert_intent("Remember Maya is vegetarian", :remember,
      confidence: :high,
      entities: %{fact: "Maya is vegetarian"}
    )
  end

  test "remember positive: Don't forget John hates cilantro" do
    r = assert_intent("Don't forget John hates cilantro", :remember)
    assert r.entities.fact =~ "John hates cilantro"
  end

  test "remember positive: Note that we prefer outdoor seating" do
    r = assert_intent("Note that we prefer outdoor seating", :remember)
    assert r.entities.fact =~ "prefer outdoor seating"
  end

  test "remember negative: What did we do last birthday?" do
    refute_intent("What did we do last birthday?", :remember)
  end

  test "remember negative: Suggest a restaurant for Maya" do
    refute_intent("Suggest a restaurant for Maya", :remember)
  end

  # ---------------------------------------------------------------------------
  # recall — 3 positive
  # ---------------------------------------------------------------------------

  test "recall positive: What did we do last birthday?" do
    assert_intent("What did we do last birthday?", :recall,
      confidence: :high,
      entities: %{question: "What did we do last birthday?", topic: "birthday"}
    )
  end

  test "recall positive: When was our last dinner?" do
    r = assert_intent("When was our last dinner?", :recall)
    assert r.entities.topic == "dinner"
  end

  test "recall positive: Where did we go last trip?" do
    r = assert_intent("Where did we go last trip?", :recall)
    assert r.entities.topic == "trip"
  end

  test "recall negative: What's coming up?" do
    refute_intent("What's coming up?", :recall)
  end

  test "recall negative: Suggest a restaurant" do
    refute_intent("Suggest a restaurant", :recall)
  end

  # ---------------------------------------------------------------------------
  # recommend — 3 positive
  # ---------------------------------------------------------------------------

  test "recommend positive: Suggest a restaurant for Maya" do
    assert_intent("Suggest a restaurant for Maya", :recommend,
      confidence: :high,
      entities: %{category: "restaurant", for_who: ["Maya"]}
    )
  end

  test "recommend positive: Recommend something for Friday" do
    r = assert_intent("Recommend something for Friday", :recommend)
    assert r.entities.when == "Friday"
  end

  test "recommend positive: What should we do tonight?" do
    r = assert_intent("What should we do tonight?", :recommend)
    assert r.intent == :recommend
    assert r.entities.when == "tonight"
  end

  test "recommend negative: Plan dinner with Maya" do
    refute_intent("Plan dinner with Maya", :recommend)
  end

  test "recommend negative: Invite John to dinner Friday" do
    refute_intent("Invite John to dinner Friday", :recommend)
  end

  # ---------------------------------------------------------------------------
  # coordinate — 3 positive
  # ---------------------------------------------------------------------------

  test "coordinate positive: Invite John to dinner Friday" do
    assert_intent("Invite John to dinner Friday", :coordinate,
      confidence: :high,
      entities: %{person: "John", action: "invite", content: "dinner Friday"}
    )
  end

  test "coordinate positive: Tell Maya we are running late" do
    r = assert_intent("Tell Maya we are running late", :coordinate)
    assert r.entities.person == "Maya"
    assert r.entities.action == "tell"
    assert r.entities.content =~ "running late"
  end

  test "coordinate positive: Ask John about Saturday" do
    r = assert_intent("Ask John about Saturday", :coordinate)
    assert r.entities.person == "John"
    assert r.entities.action == "ask"
  end

  test "coordinate negative: Plan dinner with Maya" do
    refute_intent("Plan dinner with Maya", :coordinate)
  end

  test "coordinate negative: Remember Maya is vegetarian" do
    refute_intent("Remember Maya is vegetarian", :coordinate)
  end

  # ---------------------------------------------------------------------------
  # check_status — 3 positive
  # ---------------------------------------------------------------------------

  test "check_status positive: What's coming up?" do
    assert_intent("What's coming up?", :check_status,
      confidence: :high,
      entities: %{scope: "celebrations"}
    )
  end

  test "check_status positive: How's my week looking?" do
    r = assert_intent("How's my week looking?", :check_status)
    assert r.entities.scope == "week"
  end

  test "check_status positive: Any upcoming plans?" do
    r = assert_intent("Any upcoming plans?", :check_status)
    assert r.intent == :check_status
    assert r.entities.scope in ["plans", "celebrations"]
  end

  test "check_status negative: What did we do last birthday?" do
    refute_intent("What did we do last birthday?", :check_status)
  end

  test "check_status negative: Plan dinner Friday" do
    refute_intent("Plan dinner Friday", :check_status)
  end

  # ---------------------------------------------------------------------------
  # chat — fallback + negatives of other intents covered above
  # ---------------------------------------------------------------------------

  test "chat fallback: Hello there" do
    assert_intent("Hello there", :chat, entities: %{})
  end

  test "chat positive: Hey how are you" do
    assert_intent("Hey how are you", :chat)
  end

  test "chat positive: Thanks!" do
    assert_intent("Thanks!", :chat)
  end

  test "chat negative: Plan dinner with Maya Friday" do
    refute_intent("Plan dinner with Maya Friday", :chat)
  end

  test "chat negative: What's coming up?" do
    refute_intent("What's coming up?", :chat)
  end

  # ---------------------------------------------------------------------------
  # Ambiguous + contract shape
  # ---------------------------------------------------------------------------

  test "ambiguous: Plan something → plan_create with :medium and empty entities" do
    r = assert_intent("Plan something", :plan_create, confidence: :medium)
    assert r.entities.what == nil
    assert r.entities.when == nil
    assert r.entities.who == nil
  end

  test "classify returns exact keys only" do
    r = classify!("Hello there")
    assert Map.keys(r) |> Enum.sort() == [:confidence, :entities, :intent, :raw_text]
  end

  test "classify empty text → error" do
    assert {:error, :empty_text} = OpalIntent.classify("   ", @empty_context)
  end

  test "classify invalid args → error" do
    assert {:error, :invalid} = OpalIntent.classify(nil, @empty_context)
  end

  test "never invents entities not in the text" do
    r = classify!("Plan coffee tomorrow")
    assert r.intent == :plan_create
    assert r.entities.who == nil
    refute Map.has_key?(r.entities, :for_who)
  end
end
