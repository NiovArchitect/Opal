defmodule OpalCore.Intelligence.PressureHarnessTest do
  @moduledoc """
  Paste H Phase 2 — single-user pressure scenarios P1–P10.

  Tagged `:pressure`. Extends Paste F scenario_harness patterns
  (DataCase async:false, established AssistancePreference, ProductSurface,
  Extractor, TemporalResolver, SharedPlan, EventOutbox, Reminders, Pipeline).
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query
  import ExUnit.CaptureLog

  alias OpalCore.Accounts.User
  alias OpalCore.Events.{EventOutbox, Publisher}
  alias OpalCore.Events.Workers.PublishOutboxWorker
  alias OpalCore.Intelligence.{EventIngestor, Extractor, Pipeline, ProductSurface, TemporalResolver}
  alias OpalCore.Memory
  alias OpalCore.Messages
  alias OpalCore.OpalIntent
  alias OpalCore.OpalResponse
  alias OpalCore.Relationships
  alias OpalCore.Reminders
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialMemory.{PersonMemory, PlanMemory}

  setup do
    owner_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: owner_id,
        handle: "pr_owner_" <> String.slice(owner_id, 0, 6),
        display_name: "Pressure Owner"
      })
      |> Repo.insert()

    {:ok, _} =
      %OpalCore.SocialFlow.AssistancePreference{}
      |> OpalCore.SocialFlow.AssistancePreference.changeset(%{
        user_id: owner_id,
        timezone: "America/Los_Angeles",
        intelligence_maturity: "established"
      })
      |> Repo.insert()

    {:ok, owner_id: owner_id}
  end

  defp insert_person(display_name) do
    id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: id,
        handle: String.downcase(String.replace(display_name, ~r/\s+/, "")) <> "_" <> String.slice(id, 0, 4),
        display_name: display_name
      })
      |> Repo.insert()

    id
  end

  defp ensure_direct!(owner_id, peer_id) do
    assert {:ok, result} = Messages.ensure_direct_conversation(owner_id, peer_id)
    result.conversation_id || result[:conversation_id]
  end

  defp create_plan!(owner_id, peer_id, attrs) do
    cid = ensure_direct!(owner_id, peer_id)

    assert {:ok, plan, _} =
             SocialFlow.create_tentative_plan_from_conversation(cid, owner_id, attrs)

    {cid, plan}
  end

  defp list_owner_plans(owner_id, opts) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)

    from(p in SharedPlan,
      where: p.created_by_user_id == ^owner_id,
      order_by: [desc: p.inserted_at],
      limit: ^limit,
      offset: ^offset
    )
    |> Repo.all()
  end

  defp center_ctx(owner_id, opts) do
    taste = Keyword.get(opts, :taste, %{vibes: [], cuisines: [], price_comfort: nil})
    contacts = Keyword.get(opts, :contacts, [])
    history = Keyword.get(opts, :history, [])
    plans = Keyword.get(opts, :plans, [])

    %{
      user: %{id: owner_id, display_name: "Pressure Owner", handle: "owner", timezone: "America/Los_Angeles"},
      account_id: owner_id,
      taste: taste,
      temporal: %{recent_plans: plans, upcoming_celebrations: [], active_conversation_count: 0},
      social: %{frequent_contacts: contacts, group_patterns: []},
      trust_tier: "established",
      conversation_history: history,
      message: %{text: "", length: 0, sent_at: DateTime.utc_now() |> DateTime.to_iso8601()}
    }
  end

  # ── P1 Rapid fire ──────────────────────────────────────────────────────────

  @tag :pressure
  test "P1 — Rapid fire: 20 mixed intents none dropped", %{owner_id: owner_id} do
    messages = [
      {"yes", "plan.confirm"},
      {"lol", "chitchat"},
      {"Let's do dinner Saturday", "plan.propose"},
      {"Remind me to call mom in 5 minutes", "set_reminder"},
      {"after 10 works better", "plan.counter"},
      # Paste H: "cancel that" is a retract/negation guard → clarify (not plan.cancel)
      {"cancel that", "clarify"},
      {"👍", "chitchat"},
      {"What time is dinner?", "plan.question"},
      {"book a flight to NYC", "booking_request"},
      {"patio lights are on", "info.share"},
      {"maybe", "clarify"},
      {"Let's hike Sunday", "plan.propose"},
      {"Remind me every Tuesday to stretch", "set_reminder"},
      {"sounds good", "plan.confirm"},
      {"best restaurant in North Park", "world.lookup"},
      {"I'm out", "plan.cancel"},
      {"coffee tomorrow", "plan.propose"},
      {"don't book a table", "clarify"},
      {"yes locked in", "plan.confirm"},
      {"😂", "chitchat"}
    ]

    classified =
      Enum.map(messages, fn {body, expected} ->
        {intent, entities, vibe} = Extractor.classify_message(body)
        assert is_binary(intent)
        assert is_map(entities)
        assert is_map(vibe)
        assert intent == expected, "body=#{inspect(body)} expected=#{expected} got=#{intent}"
        {body, intent}
      end)

    assert length(classified) == 20
    assert length(Enum.uniq(Enum.map(classified, &elem(&1, 0)))) == 20

    # Short succession through pipeline — no crash / race corruption
    conv = Ecto.UUID.generate()

    results =
      Enum.with_index(messages, 1)
      |> Enum.map(fn {{body, _}, seq} ->
        Pipeline.on_message_created(
          %{
            id: Ecto.UUID.generate(),
            sender_user_id: owner_id,
            conversation_id: conv,
            body: body,
            server_seq: seq
          },
          %{conversation_id: conv}
        )
      end)

    assert Enum.all?(results, &match?({:ok, _}, &1))
    extractions = Enum.map(results, fn {:ok, r} -> r.extraction.intent end)
    assert length(extractions) == 20
    refute Enum.any?(extractions, &is_nil/1)
  end

  # ── P2 Flip-flopper ────────────────────────────────────────────────────────

  @tag :pressure
  test "P2 — Flip-flopper: day/venue changes, cancel, re-plan — latest wins", %{
    owner_id: owner_id
  } do
    peer = insert_person("Maya")

    {_cid, p1} =
      create_plan!(owner_id, peer, %{
        "title" => "Dinner Friday",
        "place" => "Juniper",
        "time_label" => "Friday"
      })

    # Day change 1 → Saturday
    assert {:ok, p2} =
             p1
             |> SharedPlan.changeset(%{status: "changed", time_label: "Saturday", location: "Juniper"})
             |> Repo.update()

    # Day change 2 → Sunday
    assert {:ok, p3} =
             p2
             |> SharedPlan.changeset(%{status: "changed", time_label: "Sunday", location: "Juniper"})
             |> Repo.update()

    # Venue change
    assert {:ok, p4} =
             p3
             |> SharedPlan.changeset(%{status: "changed", location: "Contramar", title: "Dinner Sunday"})
             |> Repo.update()

    # Cancel
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    assert {:ok, cancelled} =
             p4
             |> SharedPlan.changeset(%{status: "cancelled", cancelled_at: now})
             |> Repo.update()

    assert cancelled.status == "cancelled"
    refute is_nil(Repo.get(SharedPlan, cancelled.id))

    # Re-plan
    {_cid2, fresh} =
      create_plan!(owner_id, peer, %{
        "title" => "Dinner Monday",
        "place" => "Pujol",
        "time_label" => "Monday"
      })

    plans = list_owner_plans(owner_id, limit: 20)
    assert length(plans) == 2

    by_id = Map.new(plans, &{&1.id, &1})
    assert by_id[cancelled.id].status == "cancelled"
    assert by_id[fresh.id].status == "tentative"
    assert by_id[fresh.id].location == "Pujol"
    assert by_id[fresh.id].time_label == "Monday"

    # No ghost active duplicates of the cancelled lineage
    active =
      Enum.filter(plans, &(&1.status in ["tentative", "agreed", "changed"]))

    assert length(active) == 1
    assert hd(active).id == fresh.id
  end

  # ── P3 Deliberately vague ──────────────────────────────────────────────────

  @tag :pressure
  test "P3 — Deliberately vague: ≤2 clarifiers, memory propose, no invented prefs", %{
    owner_id: owner_id
  } do
    maya = insert_person("Maya")

    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: owner_id,
        person_id: maya,
        relationship_type: "close_friend",
        known_facts: %{
          "cuisine" => %{
            "value" => "quiet Italian",
            "provenance" => "stated",
            "confidence" => 0.9,
            "source_note" => "you said quiet Italian"
          }
        }
      })
      |> Repo.insert()

    assert {:ok, _} = Memory.store(owner_id, "I like quiet Italian places", source: "opal_center")

    ctx =
      center_ctx(owner_id,
        taste: %{vibes: ["quiet"], cuisines: ["Italian"], price_comfort: nil},
        contacts: [%{user_id: maya, display_name: "Maya"}]
      )

    vague1 = "do something fun this weekend"
    vague2 = "you know what I like"

    assert {:ok, intent1} = OpalIntent.classify(vague1, Map.put(ctx, :message, %{text: vague1, length: String.length(vague1)}))
    assert {:ok, intent2} = OpalIntent.classify(vague2, Map.put(ctx, :message, %{text: vague2, length: String.length(vague2)}))

    {ex1, _, _} = Extractor.classify_message(vague1)
    assert ex1 in ["plan.propose", "plan.question", "chitchat", "clarify"]

    assert {:ok, reply1} =
             OpalResponse.generate(
               Map.merge(intent1, %{raw_text: vague1}),
               Map.put(ctx, :message, %{text: vague1})
             )

    assert {:ok, reply2} =
             OpalResponse.generate(
               Map.merge(intent2, %{raw_text: vague2, intent: :recommend}),
               Map.put(ctx, :message, %{text: vague2})
             )

    clarifiers =
      [reply1, reply2]
      |> Enum.count(fn t ->
        Regex.match?(~r/\?|want me|who should|what kind|which|still deciding/i, t)
      end)

    assert clarifiers <= 2

    combined = String.downcase(reply1 <> " " <> reply2)
    # Uses known memory signals — never invents sushi/tacos/etc.
    refute Regex.match?(~r/\b(sushi|tacos|ramen|steakhouse|invented)\b/i, combined)

    # Memory-backed recommend should mention quiet/Italian or honest unknown — not fabricate
    assert Regex.match?(~r/quiet|italian|don'?t know|prefer|ideas|spot/i, String.downcase(reply2))

    recalled = Memory.recall(owner_id, "Italian")
    assert Enum.any?(recalled, &String.contains?(&1.summary || "", "Italian"))
  end

  # ── P4 Marathon ────────────────────────────────────────────────────────────

  @tag :pressure
  test "P4 — Marathon: 100+ messages; early facts still recall", %{owner_id: owner_id} do
    peer = insert_person("Jordan")
    cid = ensure_direct!(owner_id, peer)

    early_facts = [
      "Jordan is vegetarian",
      "Jordan loves hiking",
      "Jordan birthday is March 3",
      "Jordan hates loud bars",
      "Jordan free after 7pm"
    ]

    for fact <- early_facts do
      assert {:ok, _} = Memory.store(owner_id, fact, source: "opal_center")
    end

    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: owner_id,
        person_id: peer,
        relationship_type: "friend",
        known_facts: %{
          "diet" => %{"value" => "vegetarian", "provenance" => "stated", "confidence" => 0.9},
          "hobby" => %{"value" => "hiking", "provenance" => "stated", "confidence" => 0.85}
        }
      })
      |> Repo.insert()

    for i <- 1..105 do
      body =
        cond do
          i <= 5 -> Enum.at(early_facts, i - 1)
          rem(i, 17) == 0 -> "Remind me to check in with Jordan in 2 hours"
          rem(i, 11) == 0 -> "Let's do coffee next week"
          rem(i, 7) == 0 -> "yes"
          true -> "day-#{i} note about weekend plans"
        end

      assert {:ok, _} =
               EventIngestor.ingest(%{
                 type: "message.sent",
                 actor_id: owner_id,
                 conversation_id: cid,
                 idempotency_key: "p4-#{owner_id}-#{i}",
                 payload: %{"body" => body, "message_id" => Ecto.UUID.generate()}
               })
    end

    listed = EventIngestor.list_for_actor(owner_id)
    assert length(listed) >= 105

    for fact <- early_facts do
      topic =
        fact
        |> String.split()
        |> Enum.find(&(String.length(&1) > 4 and &1 not in ["Jordan", "about"]))

      hits = Memory.recall(owner_id, topic || "Jordan")
      assert hits != [], "expected recall for #{inspect(fact)} topic=#{inspect(topic)}"
    end

    assert {:ok, view} = ProductSurface.get_person_memory(owner_id, peer)
    assert Enum.any?(view["known_facts"], &(&1["key"] == "diet" and &1["value"] == "vegetarian"))
    assert Enum.any?(view["known_facts"], &(&1["key"] == "hobby"))
  end

  # ── P5 Temporal extremes ───────────────────────────────────────────────────

  @tag :pressure
  test "P5 — Temporal extremes resolve (vague clarifies)", %{owner_id: owner_id} do
    assert {:ok, r5} =
             Reminders.create(owner_id, %{"task" => "stretch", "when" => "in 5 minutes"})

    diff = DateTime.diff(r5.remind_at, DateTime.utc_now(), :second)
    assert diff in 240..360

    assert {:ok, rx} =
             Reminders.create(owner_id, %{"task" => "call family", "when" => "next Christmas"})

    assert rx.remind_at.month == 12
    assert rx.remind_at.day == 25

    assert {:ok, rt} =
             Reminders.create(owner_id, %{
               "task" => "water plants",
               "when" => "Tuesday",
               "recurrence" => "tuesday"
             })

    assert rt.recurrence["frequency"] == "weekly"
    assert rt.recurrence["day_of_week"] == 2

    assert {:error, :needs_clarification} =
             Reminders.create(owner_id, %{"task" => "catch up", "when" => "whenever Maya's free"})

    # Extractor + TemporalResolver rules path
    {i5, e5, _} = Extractor.classify_message("Remind me to stretch in 5 minutes")
    assert i5 == "set_reminder"
    assert e5["when"] =~ "5 minutes"

    {ix, ex, _} = Extractor.classify_message("Remind me next Christmas to call family")
    assert ix == "set_reminder"
    assert ex["when"] =~ "Christmas"

    {it, et, _} = Extractor.classify_message("Remind me every Tuesday to water plants")
    assert it == "set_reminder"
    assert et["recurrence"] == "tuesday"

    {iv, ev, _} = Extractor.classify_message("Remind me whenever Maya is free")
    assert iv == "set_reminder"
    assert ev["when"] =~ "whenever"

    ref = Date.utc_today()

    assert {:ok, [a5 | _]} =
             TemporalResolver.resolve("in 5 minutes", ["in 5 minutes"], ref, owner_id)

    assert a5.anchor_type == "one_time"

    assert {:ok, [ax | _]} =
             TemporalResolver.resolve("next Christmas", ["next Christmas"], ref, owner_id)

    assert ax.date.month == 12 and ax.date.day == 25

    assert {:ok, tue_anchors} =
             TemporalResolver.resolve("every Tuesday", ["every Tuesday"], ref, owner_id)

    assert tue_anchors != []

    at = hd(tue_anchors)

    assert at.anchor_type == "recurring_event" or
             (is_map(at.recurrence) and at.recurrence["frequency"] == "weekly")

    # Vague availability must not invent a concrete date (rules → []; LLM may empty too)
    assert {:ok, vague_anchors} =
             TemporalResolver.resolve(
               "whenever Maya is free",
               ["whenever Maya is free"],
               ref,
               owner_id
             )

    assert vague_anchors == [] or
             Enum.all?(vague_anchors, fn a ->
               a[:needs_confirmation] == true or a.needs_confirmation == true or
                 (is_number(a.confidence) and a.confidence < 0.6)
             end)
  end

  # ── P6 Garbage in ──────────────────────────────────────────────────────────

  @tag :pressure
  test "P6 — Garbage in: typos, emoji-only, voice garble — graceful", %{owner_id: owner_id} do
    garbage = [
      "Chnael dinner?",
      "😂🔥",
      "uhh so like um dinner at the uh place yeah?",
      "",
      "   ",
      "asdfasdf",
      "🎤 garbled audio [inaudible] maybe Juniper?",
      "!@#$%"
    ]

    for body <- garbage do
      {intent, entities, vibe} = Extractor.classify_message(body)
      assert is_binary(intent)
      assert is_map(entities)
      assert is_map(vibe)
      # Never hallucinate a hard confirmation from garbage
      refute intent == "plan.confirm" and String.length(String.trim(body)) < 3
    end

    log =
      capture_log(fn ->
        for {body, i} <- Enum.with_index(garbage, 1) do
          assert {:ok, result} =
                   Pipeline.on_message_created(
                     %{
                       id: Ecto.UUID.generate(),
                       sender_user_id: owner_id,
                       conversation_id: Ecto.UUID.generate(),
                       body: body,
                       server_seq: i
                     },
                     %{}
                   )

          assert result.extraction.intent
          # No fabricated booking/reminder confirmation on empty/emoji
          if String.trim(body) in ["", "😂🔥"] do
            refute result.decision.action in ["plan.confirm"]
          end
        end
      end)

    assert is_binary(log)

    # Typo "Chnael" should not invent a confirmed Chanelle booking
    {intent, _, _} = Extractor.classify_message("Chnael dinner?")
    assert intent in ["plan.question", "plan.propose", "chitchat"]
  end

  # ── P7 Interrupter ─────────────────────────────────────────────────────────

  @tag :pressure
  test "P7 — Interrupter: trip plan → remind mom → resume trip", %{owner_id: owner_id} do
    peer = insert_person("Alex")
    cid = ensure_direct!(owner_id, peer)

    {_cid, trip} =
      create_plan!(owner_id, peer, %{
        "title" => "Weekend trip",
        "place" => "Big Sur",
        "time_label" => "Saturday"
      })

    assert {:ok, _} =
             %PlanMemory{}
             |> PlanMemory.changeset(%{
               account_id: owner_id,
               plan_id: trip.id,
               plan_label: "Weekend trip",
               place_label: "Big Sur",
               time_label: "Saturday",
               status: "active",
               related_conversation_ids: [cid]
             })
             |> Repo.insert()

    # Interrupt: remind call mom
    assert {:ok, reminder} =
             Reminders.create(owner_id, %{
               "task" => "call mom",
               "when" => "in 5 minutes",
               "conversation_id" => cid
             })

    assert reminder.status == "pending"
    assert reminder.task =~ "mom"

    # Resume trip — update venue/day without touching reminder
    assert {:ok, resumed} =
             trip
             |> SharedPlan.changeset(%{
               status: "changed",
               location: "Carmel",
               time_label: "Sunday",
               title: "Weekend trip Carmel"
             })
             |> Repo.update()

    assert resumed.location == "Carmel"
    assert resumed.time_label == "Sunday"

    still = Repo.get!(OpalCore.Reminders.Reminder, reminder.id)
    assert still.status == "pending"
    assert still.task =~ "mom"

    pm = Repo.get_by!(PlanMemory, account_id: owner_id, plan_id: trip.id)
    assert pm.status == "active"
    assert pm.place_label == "Big Sur"

    # Pipeline interrupt messages also stay isolated
    assert {:ok, _} =
             Pipeline.on_message_created(
               %{
                 id: Ecto.UUID.generate(),
                 sender_user_id: owner_id,
                 conversation_id: cid,
                 body: "Let's extend the trip one more day",
                 server_seq: 1
               },
               %{conversation_id: cid, plan_label: "Weekend trip"}
             )

    assert {:ok, _} =
             Pipeline.on_message_created(
               %{
                 id: Ecto.UUID.generate(),
                 sender_user_id: owner_id,
                 conversation_id: cid,
                 body: "Remind me to call mom in 5 minutes",
                 server_seq: 2
               },
               %{conversation_id: cid}
             )

    assert {:ok, _} =
             Pipeline.on_message_created(
               %{
                 id: Ecto.UUID.generate(),
                 sender_user_id: owner_id,
                 conversation_id: cid,
                 body: "ok back to Carmel Sunday",
                 server_seq: 3
               },
               %{conversation_id: cid, plan_label: "Weekend trip"}
             )

    assert Repo.get!(SharedPlan, resumed.id).location == "Carmel"
    assert Repo.get!(OpalCore.Reminders.Reminder, reminder.id).status == "pending"
  end

  # ── P8 Offline then on ─────────────────────────────────────────────────────

  @tag :pressure
  test "P8 — Offline then on: outbox order preserved, no duplicates", %{owner_id: owner_id} do
    # Queue while "degraded" — insert pending rows without publishing
    events =
      for i <- 1..5 do
        event_id = "pressure_offline:#{owner_id}:#{i}"

        {:ok, envelope} =
          OpalCore.Events.DomainEvent.build(%{
            event_type: "plan.created",
            event_id: event_id,
            partition_key: owner_id,
            aggregate_type: "shared_plan",
            aggregate_id: Ecto.UUID.generate(),
            privacy_class: "private_authorized",
            purpose: "plan_create",
            actor_user_id: owner_id,
            payload: %{"seq" => i, "plan_id" => Ecto.UUID.generate()}
          })

        # Stagger available_at in the past so pending/1 picks them up in order
        available =
          DateTime.utc_now()
          |> DateTime.add(-(6 - i), :second)
          |> DateTime.truncate(:microsecond)

        {:ok, row} =
          %EventOutbox{}
          |> EventOutbox.changeset(%{
            event_id: envelope["event_id"],
            event_type: envelope["event_type"],
            event_version: envelope["event_version"],
            aggregate_type: envelope["aggregate_type"],
            aggregate_id: envelope["aggregate_id"],
            partition_key: envelope["partition_key"],
            topic_family: envelope["topic_family"],
            privacy_class: envelope["privacy_class"],
            purpose: envelope["purpose"],
            envelope: envelope,
            status: "pending",
            available_at: available
          })
          |> Repo.insert()

        row
      end

    pending =
      Publisher.pending(50)
      |> Enum.filter(&(&1.partition_key == owner_id and String.starts_with?(&1.event_id, "pressure_offline:")))

    assert length(pending) == 5

    ordered_ids = Enum.map(Enum.sort_by(events, & &1.available_at, DateTime), & &1.id)
    pending_ids = Enum.map(pending, & &1.id)
    assert pending_ids == ordered_ids

    # Reconnect — publish in pending order
    for row <- pending do
      assert :ok = PublishOutboxWorker.perform(%Oban.Job{args: %{"outbox_id" => row.id}})
    end

    reloaded = Enum.map(events, &Repo.get!(EventOutbox, &1.id))
    assert Enum.all?(reloaded, &(&1.status == "published"))

    # Idempotent re-publish does not duplicate
    for row <- events do
      assert :ok = PublishOutboxWorker.perform(%Oban.Job{args: %{"outbox_id" => row.id}})
    end

    counts =
      from(o in EventOutbox, where: o.event_id in ^Enum.map(events, & &1.event_id))
      |> Repo.aggregate(:count, :id)

    assert counts == 5
  end

  # ── P9 Corrector ───────────────────────────────────────────────────────────

  @tag :pressure
  test "P9 — Corrector: 3 corrections + 2 deletions propagate with audit", %{
    owner_id: owner_id
  } do
    maya = insert_person("Maya")

    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: owner_id,
        person_id: maya,
        relationship_type: "close_friend",
        known_facts: %{
          "birthday" => %{"value" => "June 14", "provenance" => "stated", "confidence" => 0.9},
          "cuisine" => %{"value" => "quiet Italian", "provenance" => "observed", "confidence" => 0.7},
          "city" => %{"value" => "San Diego", "provenance" => "stated", "confidence" => 0.8},
          "hobby" => %{"value" => "surfing", "provenance" => "inferred", "confidence" => 0.4},
          "pet" => %{"value" => "cat", "provenance" => "stated", "confidence" => 0.6}
        }
      })
      |> Repo.insert()

    assert {:ok, f1} = ProductSurface.patch_fact(owner_id, maya, "birthday", "June 15")
    assert f1["value"] == "June 15"

    assert {:ok, f2} = ProductSurface.patch_fact(owner_id, maya, "cuisine", "omakase")
    assert f2["value"] == "omakase"

    assert {:ok, f3} = ProductSurface.patch_fact(owner_id, maya, "city", "North Park")
    assert f3["value"] == "North Park"

    assert {:ok, _} = ProductSurface.delete_fact(owner_id, maya, "hobby", true)
    assert {:ok, _} = ProductSurface.delete_fact(owner_id, maya, "pet", true)

    assert {:ok, view} = ProductSurface.get_person_memory(owner_id, maya)
    keys = Enum.map(view["known_facts"], & &1["key"])
    assert "birthday" in keys
    assert "cuisine" in keys
    assert "city" in keys
    refute "hobby" in keys
    refute "pet" in keys

    birthday = Enum.find(view["known_facts"], &(&1["key"] == "birthday"))
    assert birthday["value"] == "June 15"

    # Audit trail via outbox
    audit =
      from(o in EventOutbox,
        where:
          o.partition_key == ^owner_id and
            o.event_type in [
              "memory.fact_corrected",
              "memory.fact_archived",
              "memory.fact_deleted"
            ]
      )
      |> Repo.all()

    assert length(audit) >= 5
    actions = Enum.map(audit, &get_in(&1.envelope, ["payload", "action"]))
    assert "corrected" in actions
    assert "archived" in actions or "deleted" in actions
  end

  # ── P10 Power user ─────────────────────────────────────────────────────────

  @tag :pressure
  test "P10 — Power user: 200 contacts, 50 plans, 30 reminders; search + page", %{
    owner_id: owner_id
  } do
    # 200 contacts with relationship types (searchable)
    contact_ids =
      for i <- 1..200 do
        name = if i == 42, do: "Zelda Target", else: "Contact #{String.pad_leading("#{i}", 3, "0")}"
        id = insert_person(name)
        assert {:ok, _} = Relationships.set_type(owner_id, id, "friend")
        id
      end

    assert length(contact_ids) == 200

    peer_a = Enum.at(contact_ids, 0)
    peer_b = Enum.at(contact_ids, 1)

    for i <- 1..50 do
      peer = if rem(i, 2) == 0, do: peer_a, else: peer_b

      {_cid, _plan} =
        create_plan!(owner_id, peer, %{
          "title" => "Plan #{i}",
          "place" => "Place #{i}",
          "time_label" => "Day #{i}"
        })
    end

    for i <- 1..30 do
      assert {:ok, _} =
               Reminders.create(owner_id, %{
                 "task" => "Reminder #{i}",
                 "remind_at" =>
                   DateTime.utc_now()
                   |> DateTime.add(i * 3600, :second)
                   |> DateTime.truncate(:microsecond)
                   |> DateTime.to_iso8601()
               })
    end

    page1 = list_owner_plans(owner_id, limit: 10, offset: 0)
    page2 = list_owner_plans(owner_id, limit: 10, offset: 10)
    assert length(page1) == 10
    assert length(page2) == 10
    assert MapSet.disjoint?(MapSet.new(Enum.map(page1, & &1.id)), MapSet.new(Enum.map(page2, & &1.id)))

    total = from(p in SharedPlan, where: p.created_by_user_id == ^owner_id) |> Repo.aggregate(:count, :id)
    assert total == 50

    assert {:ok, reminders} = Reminders.list(owner_id, limit: 100)
    assert length(reminders) >= 30

    t0 = System.monotonic_time(:millisecond)
    hits = Relationships.search_contacts(owner_id, "Zelda")
    elapsed = System.monotonic_time(:millisecond) - t0

    assert elapsed < 500
    assert Enum.any?(hits, fn c -> String.contains?(c[:display_name] || "", "Zelda") end)

    # Memory recall stays relevant under load
    assert {:ok, _} = Memory.store(owner_id, "Zelda loves ceramics", source: "opal_center")
    recalled = Memory.recall(owner_id, "ceramics")
    assert Enum.any?(recalled, &String.contains?(&1.summary || "", "ceramics"))
  end
end
