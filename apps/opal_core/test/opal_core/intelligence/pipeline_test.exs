defmodule OpalCore.Intelligence.PipelineTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Intelligence.{
    EventIngestor,
    Extractor,
    FeedbackLoop,
    Pipeline,
    Reasoner
  }

  alias OpalCore.Intelligence.Event

  describe "1.1 EventIngestor" do
    test "persists message.sent and queries by actor + time" do
      actor = Ecto.UUID.generate()

      assert {:ok, %Event{} = e} =
               EventIngestor.ingest(%{
                 type: "message.sent",
                 actor_id: actor,
                 conversation_id: Ecto.UUID.generate(),
                 idempotency_key: "msg-#{System.unique_integer([:positive])}",
                 payload: %{"body" => "hello", "message_id" => Ecto.UUID.generate()}
               })

      assert e.type == "message.sent"
      listed = EventIngestor.list_for_actor(actor)
      assert Enum.any?(listed, &(&1.id == e.id))
    end

    test "idempotent on idempotency_key" do
      actor = Ecto.UUID.generate()
      key = "idem-#{System.unique_integer([:positive])}"

      assert {:ok, a} =
               EventIngestor.ingest(%{
                 type: "message.sent",
                 actor_id: actor,
                 idempotency_key: key,
                 payload: %{"body" => "a"}
               })

      assert {:ok, b} =
               EventIngestor.ingest(%{
                 type: "message.sent",
                 actor_id: actor,
                 idempotency_key: key,
                 payload: %{"body" => "b"}
               })

      assert a.id == b.id
    end
  end

  describe "1.2 Extractor" do
    test "yes → plan.confirm" do
      {intent, _, _} = Extractor.classify_message("yes")
      assert intent == "plan.confirm"
    end

    test "after 10 works better → plan.counter + time" do
      {intent, entities, vibe} =
        Extractor.classify_message("after 10 feels better for me, I'm free after 10")

      assert intent == "plan.counter"
      assert entities["time"]["after"]
      assert entities["time"]["fuzzy"] == true
      assert vibe["sentiment"] in ["hesitant", "positive", "neutral"]
    end

    test "patio lights are on → info.share" do
      {intent, _, _} = Extractor.classify_message("patio lights are on")
      assert intent == "info.share"
    end

    test "extraction stores source event_id" do
      actor = Ecto.UUID.generate()

      {:ok, event} =
        EventIngestor.ingest(%{
          type: "message.sent",
          actor_id: actor,
          payload: %{"body" => "yes"},
          idempotency_key: "ext-#{System.unique_integer([:positive])}"
        })

      assert {:ok, x} = Extractor.extract(event)
      assert x.event_id == event.id
      assert x.intent == "plan.confirm"
      assert is_integer(x.latency_ms)
    end
  end

  describe "1.3 Reasoner" do
    test "Maya after 10 → respond.thread with adjusted plan reason" do
      actor = Ecto.UUID.generate()

      {:ok, event} =
        EventIngestor.ingest(%{
          type: "message.sent",
          actor_id: actor,
          conversation_id: Ecto.UUID.generate(),
          payload: %{"body" => "after 10 works better"},
          idempotency_key: "maya-#{System.unique_integer([:positive])}"
        })

      {:ok, x} = Extractor.extract(event)

      assert {:ok, d} =
               Reasoner.reason(event, x, %{
                 plan_label: "market",
                 current_time_label: "9:30 market",
                 conversation_id: event.conversation_id
               })

      assert d.action in ["respond.thread", "escalate.user"]
      assert d.confidence >= 0.0
      assert d.reason =~ "plan.counter" or d.reason =~ "after"
    end

    test "yes → plan.confirm" do
      actor = Ecto.UUID.generate()

      {:ok, event} =
        EventIngestor.ingest(%{
          type: "message.sent",
          actor_id: actor,
          payload: %{"body" => "yes"},
          idempotency_key: "yes-#{System.unique_integer([:positive])}"
        })

      {:ok, x} = Extractor.extract(event)
      assert {:ok, d} = Reasoner.reason(event, x, %{})
      assert d.action == "plan.confirm"
      assert d.payload["message"] =~ "Locked in"
    end

    test "lol → silent" do
      actor = Ecto.UUID.generate()

      {:ok, event} =
        EventIngestor.ingest(%{
          type: "message.sent",
          actor_id: actor,
          payload: %{"body" => "lol"},
          idempotency_key: "lol-#{System.unique_integer([:positive])}"
        })

      {:ok, x} = Extractor.extract(event)
      assert {:ok, d} = Reasoner.reason(event, x, %{})
      assert d.action == "silent"
    end
  end

  describe "1.4–1.5 pipeline + feedback" do
    test "full message pipeline returns event→extraction→decision→action" do
      actor = Ecto.UUID.generate()
      conv = Ecto.UUID.generate()

      assert {:ok, result} =
               Pipeline.on_message_created(
                 %{
                   id: Ecto.UUID.generate(),
                   sender_user_id: actor,
                   conversation_id: conv,
                   body: "yes",
                   server_seq: 1
                 },
                 %{conversation_id: conv}
               )

      assert result.event.type == "message.sent"
      assert result.extraction.intent == "plan.confirm"
      assert result.decision.action == "plan.confirm"
      assert result.action.status in ["ok", "failed", "pending", "skipped"]
    end

    test "accept strengthens; dismiss weakens; Maya morning counters block mornings" do
      actor = Ecto.UUID.generate()

      assert {:ok, _} =
               FeedbackLoop.record(%{
                 actor_id: actor,
                 signal: "accepted",
                 detail: %{"slot" => "evening"}
               })

      assert {:ok, _} =
               FeedbackLoop.record(%{
                 actor_id: actor,
                 signal: "dismissed",
                 detail: %{"slot" => "morning", "why" => "too early"}
               })

      listed = FeedbackLoop.list_for_actor(actor)
      assert length(listed) >= 2

      result = FeedbackLoop.maya_morning_counter_scenario(actor, 5)
      assert result.morning_blocked? == true
      assert result.evidence_count >= 3
      assert result.sleep_bias == "late"
    end
  end
end
