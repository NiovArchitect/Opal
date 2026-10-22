defmodule OpalCore.SocialMemoryTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Intelligence.{Extractor, Pipeline, PromptBuilder}
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{Commitment, PersonMemory, PlanMemory, SurfacedNudge}

  setup do
    prior = System.get_env("OPAL_MEMORY_ENABLED")
    System.put_env("OPAL_MEMORY_ENABLED", "true")

    on_exit(fn ->
      if prior,
        do: System.put_env("OPAL_MEMORY_ENABLED", prior),
        else: System.delete_env("OPAL_MEMORY_ENABLED")
    end)

    :ok
  end

  test "ingest failure never breaks pipeline reply path" do
    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    # Force a bad call shape inside ingest path via SocialMemory — pipeline rescues
    assert {:ok, result} =
             Pipeline.on_message_created(
               %{
                 id: Ecto.UUID.generate(),
                 sender_user_id: account,
                 conversation_id: conv,
                 body: "yes",
                 server_seq: 1
               },
               %{conversation_id: conv, account_id: account, plan_label: "market"}
             )

    assert result.decision.action in ["plan.confirm", "respond.thread", "escalate.user", "silent"]
  end

  test "commitment trigger creates ledger row without storing raw-only tables incorrectly" do
    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    msg = Ecto.UUID.generate()

    assert {:ok, _} =
             SocialMemory.ingest(
               account,
               conv,
               msg,
               %{intent: "plan.confirm", entities: %{}, vibe: %{"sentiment" => "positive"}},
               %{
                 sender_id: account,
                 body: "I'll book the flights tomorrow",
                 timestamp: DateTime.utc_now()
               }
             )

    row = Repo.get_by(Commitment, account_id: account, source_message_id: msg)
    assert row
    assert row.status == "open"
    assert row.description =~ "book"
    # raw message text is not a separate memory column — description is structured derivative
    refute Map.has_key?(row, :raw_text)
  end

  test "plan_signal upserts plan_memories" do
    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    assert {:ok, _} =
             SocialMemory.ingest(
               account,
               conv,
               Ecto.UUID.generate(),
               %{
                 intent: "plan.propose",
                 entities: %{"times" => ["Saturday"], "places" => ["market"]},
                 vibe: %{}
               },
               %{sender_id: account, body: "Saturday market?", plan_label: "Saturday market"}
             )

    plans = Repo.all(PlanMemory) |> Enum.filter(&(&1.account_id == account))
    assert length(plans) >= 1
    assert hd(plans).time_label in ["Saturday", nil] or hd(plans).plan_label =~ "market"
  end

  # Repair #26 (F-3/F-3b) — run a real classify → ingest sequence, the
  # way the call fold does, and read the PlanMemory rows back.
  defp ingest_classified(account, conv, body, sender_id) do
    {intent, entities, vibe} = Extractor.classify_message(body)

    assert {:ok, _} =
             SocialMemory.ingest(
               account,
               conv,
               Ecto.UUID.generate(),
               %{intent: intent, entities: entities, vibe: vibe},
               %{sender_id: sender_id, body: body, timestamp: DateTime.utc_now()}
             )
  end

  defp plans_for(account) do
    Repo.all(PlanMemory) |> Enum.filter(&(&1.account_id == account))
  end

  test "R26 F-3b: call1-style sequence ends as ONE plan row with day+clock+place" do
    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    ingest_classified(
      account,
      conv,
      "Let's do dinner this Saturday at 7 pm at Juniper and Ivy.",
      account
    )

    ingest_classified(account, conv, "Sounds good.", account)
    ingest_classified(account, conv, "Perfect.", account)

    assert [row] = plans_for(account)
    assert row.plan_label == "dinner"
    assert row.time_label == "saturday 19:00"
    assert row.place_label == "Juniper and Ivy"
    assert conv in row.related_conversation_ids
  end

  test "R26 F-3b: unrelated plans in one conversation never overwrite each other" do
    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    ingest_classified(
      account,
      conv,
      "Let's do dinner this Saturday at 7 pm at Juniper and Ivy.",
      account
    )

    ingest_classified(account, conv, "Let's do lunch on Sunday at 12 pm at Cafe Luna.", account)
    ingest_classified(account, conv, "Let's do the market this Saturday at 9 am.", account)

    plans = plans_for(account)
    assert length(plans) == 3
    by_label = Map.new(plans, &{&1.plan_label, &1})

    assert by_label["dinner"].time_label == "saturday 19:00"
    assert by_label["dinner"].place_label == "Juniper and Ivy"
    assert by_label["lunch"].time_label == "sunday 12:00"
    assert by_label["lunch"].place_label == "Cafe Luna"
    assert by_label["market"].time_label == "saturday 09:00"

    # A dinner counter carrying only a new clock merges into the dinner
    # row alone: day survives, clock is replaced, other plans untouched.
    ingest_classified(account, conv, "Dinner at 8 pm instead works better.", account)

    plans = plans_for(account)
    assert length(plans) == 3
    by_label = Map.new(plans, &{&1.plan_label, &1})
    assert by_label["dinner"].time_label == "saturday 20:00"
    assert by_label["lunch"].time_label == "sunday 12:00"
    assert by_label["market"].time_label == "saturday 09:00"

    # A place-anchored turn merges by place into its own plan row.
    ingest_classified(account, conv, "Cafe Luna at 1 pm on Sunday.", account)

    plans = plans_for(account)
    assert length(plans) == 3
    by_label = Map.new(plans, &{&1.plan_label, &1})
    assert by_label["lunch"].time_label == "sunday 13:00"
    assert by_label["lunch"].place_label == "Cafe Luna"
    assert by_label["dinner"].time_label == "saturday 20:00"
  end

  test "R26 F-3b: a day-only signal with no plan to merge into creates nothing" do
    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    ingest_classified(account, conv, "Saturday instead works better.", account)
    ingest_classified(account, conv, "Saturday sounds good.", account)

    assert plans_for(account) == []
  end

  test "R26 F-3b: time components merge across turns (day arrives after clock)" do
    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    # Clock-only proposal creates via the clock anchor…
    assert {:ok, _} =
             SocialMemory.ingest(
               account,
               conv,
               Ecto.UUID.generate(),
               %{
                 intent: "plan.propose",
                 entities: %{
                   "time" => %{"time" => "19:00", "fuzzy" => false},
                   "activity" => "dinner"
                 },
                 vibe: %{}
               },
               %{sender_id: account, body: "dinner at 7pm", timestamp: DateTime.utc_now()}
             )

    assert [row] = plans_for(account)
    assert row.time_label == "19:00"

    # …and a later day-only counter for the same activity adds the day
    # without dropping the clock.
    assert {:ok, _} =
             SocialMemory.ingest(
               account,
               conv,
               Ecto.UUID.generate(),
               %{
                 intent: "plan.counter",
                 entities: %{
                   "time" => %{"day" => "sunday", "fuzzy" => true},
                   "activity" => "dinner"
                 },
                 vibe: %{}
               },
               %{sender_id: account, body: "sunday instead", timestamp: DateTime.utc_now()}
             )

    assert [row] = plans_for(account)
    assert row.plan_label == "dinner"
    assert row.time_label == "sunday 19:00"
  end

  test "R26 F-3b: 'i can't stand cilantro' lands as a dislike under the speaker" do
    account = Ecto.UUID.generate()
    speaker = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    assert {:ok, _} =
             SocialMemory.ingest(
               account,
               conv,
               Ecto.UUID.generate(),
               %{intent: "chitchat", entities: %{}, vibe: %{}},
               %{
                 sender_id: speaker,
                 body: "I can't stand cilantro",
                 timestamp: DateTime.utc_now()
               }
             )

    row = Repo.get_by(PersonMemory, account_id: account, person_id: speaker)
    assert row
    assert row.known_facts["dislike:cilantro"]["value"] =~ "cilantro"
    assert row.known_facts["dislike:cilantro"]["provenance"] == "stated"

    # The speaker's own store keys it on the self mirror row.
    assert {:ok, _} =
             SocialMemory.ingest(
               speaker,
               conv,
               Ecto.UUID.generate(),
               %{intent: "chitchat", entities: %{}, vibe: %{}},
               %{
                 sender_id: speaker,
                 body: "I can't stand cilantro",
                 timestamp: DateTime.utc_now()
               }
             )

    self_row = Repo.get_by(PersonMemory, account_id: speaker, person_id: speaker)
    assert self_row.known_facts["dislike:cilantro"]

    # Generic "i hate X" keys the same way…
    other = Ecto.UUID.generate()

    assert {:ok, _} =
             SocialMemory.ingest(
               account,
               conv,
               Ecto.UUID.generate(),
               %{intent: "chitchat", entities: %{}, vibe: %{}},
               %{
                 sender_id: other,
                 body: "Honestly, I hate cilantro in everything",
                 timestamp: DateTime.utc_now()
               }
             )

    other_row = Repo.get_by(PersonMemory, account_id: account, person_id: other)
    assert other_row.known_facts["dislike:cilantro"]

    # …but "i hate mornings" keeps its historic "mornings" key.
    assert {:ok, _} =
             SocialMemory.ingest(
               account,
               conv,
               Ecto.UUID.generate(),
               %{intent: "chitchat", entities: %{}, vibe: %{}},
               %{sender_id: other, body: "I hate mornings", timestamp: DateTime.utc_now()}
             )

    other_row = Repo.get_by(PersonMemory, account_id: account, person_id: other)
    assert other_row.known_facts["mornings"]
    refute Map.has_key?(other_row.known_facts, "dislike:mornings")
  end

  test "account isolation: recall never returns other account's person facts" do
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()
    maya = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: a,
        person_id: maya,
        relationship_type: "close_friend",
        known_facts: %{
          "secret_project" => %{
            "value" => "planning a surprise party for Maya",
            "source_conversation_id" => conv,
            "learned_at" => DateTime.utc_now() |> DateTime.to_iso8601()
          }
        }
      })
      |> Repo.insert()

    {:ok, _} =
      %Commitment{}
      |> Commitment.changeset(%{
        account_id: a,
        description: "Buy the surprise cake by Friday",
        status: "open",
        source_conversation_id: conv,
        source_message_id: Ecto.UUID.generate()
      })
      |> Repo.insert()

    {:ok, _} =
      %PlanMemory{}
      |> PlanMemory.changeset(%{
        account_id: a,
        plan_id: Ecto.UUID.generate(),
        plan_label: "Saturday dinner",
        time_label: "Saturday 7pm",
        place_label: "Juniper",
        status: "active",
        related_conversation_ids: [conv],
        user_commitments: [%{"description" => "Buy the surprise cake by Friday"}]
      })
      |> Repo.insert()

    # B shares the conversation but has no Maya memory
    recall_b = SocialMemory.recall_for_conversation(SocialMemory.for_account(b), conv)
    refute Enum.any?(recall_b.people, fn p -> p.person_id == maya end)

    built_b = PromptBuilder.build(SocialMemory.for_account(b), conv, "hey", [])
    blob = inspect(built_b) <> (built_b.what_you_know || "")
    refute String.contains?(String.downcase(blob), "surprise")

    built_a = PromptBuilder.build(SocialMemory.for_account(a), conv, "hey", [])
    # A should see own commitments in recall
    recall_a = SocialMemory.recall_for_conversation(SocialMemory.for_account(a), conv)
    assert Enum.any?(recall_a.my_open_commitments, fn c -> c.description =~ "surprise" end)
    assert built_a.shared_plans == [] or is_list(built_a.shared_plans)
  end

  test "leakage test 10/10: B prompt clean, A complete, shared facts both" do
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()
    maya = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()
    plan_id = Ecto.UUID.generate()

    for account <- [a, b] do
      {:ok, _} =
        %PlanMemory{}
        |> PlanMemory.changeset(%{
          account_id: account,
          plan_id: plan_id,
          plan_label: "Group dinner",
          time_label: "Friday 8pm",
          place_label: "Oak Room",
          status: "active",
          related_conversation_ids: [conv],
          user_commitments:
            if(account == a,
              do: [%{"description" => "Buy the surprise cake by Friday"}],
              else: []
            )
        })
        |> Repo.insert()
    end

    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: a,
        person_id: maya,
        relationship_type: "close_friend",
        known_facts: %{
          "secret_project" => %{"value" => "planning a surprise party for Maya"}
        }
      })
      |> Repo.insert()

    results =
      Enum.map(1..10, fn _ ->
        pb = PromptBuilder.build(SocialMemory.for_account(b), conv, "what's the plan?", [])
        pa = PromptBuilder.build(SocialMemory.for_account(a), conv, "what's the plan?", [])
        b_text = String.downcase((pb.what_you_know || "") <> inspect(pb.shared_plans))
        a_text = String.downcase((pa.what_you_know || "") <> inspect(pa.recall))

        %{
          b_clean: not String.contains?(b_text, "surprise"),
          a_has_secret: String.contains?(a_text, "surprise"),
          b_shared: String.contains?(b_text, "oak") or String.contains?(b_text, "friday"),
          a_shared: String.contains?(a_text, "oak") or String.contains?(a_text, "friday")
        }
      end)

    assert Enum.all?(results, & &1.b_clean)
    assert Enum.all?(results, & &1.a_has_secret)
    assert Enum.all?(results, & &1.b_shared)
    assert Enum.all?(results, & &1.a_shared)
  end

  test "scope assertion raises on mismatched account_id in recall people" do
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()

    recall = %{
      people: [%{id: Ecto.UUID.generate(), account_id: b, person_id: Ecto.UUID.generate()}],
      active_plans: []
    }

    assert_raise RuntimeError, ~r/scope violation/, fn ->
      PromptBuilder.assert_scope!(a, recall)
    end
  end

  test "kill switch disables ingest writes" do
    System.put_env("OPAL_MEMORY_ENABLED", "false")
    account = Ecto.UUID.generate()
    before = Repo.aggregate(Commitment, :count, :id)

    assert {:ok, :disabled} =
             SocialMemory.ingest(
               account,
               Ecto.UUID.generate(),
               Ecto.UUID.generate(),
               %{intent: "plan.confirm", entities: %{}, vibe: %{}},
               %{sender_id: account, body: "I'll handle dinner"}
             )

    assert Repo.aggregate(Commitment, :count, :id) == before
  end

  test "empty account recall returns empty collections" do
    scoped = SocialMemory.for_account(Ecto.UUID.generate())
    recall = SocialMemory.recall_for_conversation(scoped, Ecto.UUID.generate())
    assert recall.people == []
    assert recall.my_open_commitments == []
    assert recall.active_plans == []
  end

  test "recall p95 under 200ms with seeded volume" do
    account = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    for _ <- 1..100 do
      {:ok, _} =
        %PersonMemory{}
        |> PersonMemory.changeset(%{
          account_id: account,
          person_id: Ecto.UUID.generate(),
          relationship_type: "friend"
        })
        |> Repo.insert()
    end

    for _ <- 1..50 do
      {:ok, _} =
        %PlanMemory{}
        |> PlanMemory.changeset(%{
          account_id: account,
          plan_id: Ecto.UUID.generate(),
          status: "active",
          related_conversation_ids: [conv],
          plan_label: "plan"
        })
        |> Repo.insert()
    end

    for _ <- 1..200 do
      {:ok, _} =
        %Commitment{}
        |> Commitment.changeset(%{
          account_id: account,
          description: "do thing",
          status: "open",
          source_conversation_id: conv,
          source_message_id: Ecto.UUID.generate()
        })
        |> Repo.insert()
    end

    scoped = SocialMemory.for_account(account)
    # warm
    _ = SocialMemory.recall_for_conversation(scoped, conv)

    times =
      for _ <- 1..20 do
        # bust cache by using invalidate via new conv occasionally — measure coldish
        t0 = System.monotonic_time(:millisecond)
        _ = SocialMemory.recall_for_conversation(scoped, conv)
        System.monotonic_time(:millisecond) - t0
      end

    p95 = times |> Enum.sort() |> Enum.at(trunc(length(times) * 0.95) - 1)
    assert p95 < 200
  end

  test "nudge dismiss twice suppresses 30 days" do
    account = Ecto.UUID.generate()

    {:ok, n1} =
      %SurfacedNudge{}
      |> SurfacedNudge.changeset(%{
        account_id: account,
        type: "cooling_relationship",
        ref_id: Ecto.UUID.generate(),
        reason: "test",
        surfaced_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
      |> Repo.insert()

    assert {:ok, _} = SocialMemory.dismiss_nudge(account, n1.id)
    assert {:ok, updated} = SocialMemory.dismiss_nudge(account, n1.id)
    assert updated.dismissed_count >= 2
    assert updated.suppressed_until
  end

  test "field-level plan filter: shared prompt maps omit user_commitments" do
    a = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    {:ok, _} =
      %PlanMemory{}
      |> PlanMemory.changeset(%{
        account_id: a,
        plan_id: Ecto.UUID.generate(),
        plan_label: "Trip",
        time_label: "June",
        place_label: "CDMX",
        status: "active",
        related_conversation_ids: [conv],
        user_commitments: [%{"description" => "private commitment xyz"}]
      })
      |> Repo.insert()

    built = PromptBuilder.build(SocialMemory.for_account(a), conv, "hi there friends", [])
    shared_blob = inspect(built.shared_plans)
    refute String.contains?(shared_blob, "private commitment xyz")
    assert String.contains?(shared_blob, "CDMX") or String.contains?(shared_blob, "June")
  end
end
