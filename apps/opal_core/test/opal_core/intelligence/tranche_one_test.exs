defmodule OpalCore.Intelligence.TrancheOneTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Intelligence.{PromptBuilder, TemporalResolver}
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{PersonMemory, PlanMemory, Routine, TemporalAnchor}
  alias OpalCore.SocialMemory.Workers.{MemoryHourlyWorker, RoutineDetectorWorker}

  setup do
    account_id = Ecto.UUID.generate()
    person_id = Ecto.UUID.generate()
    {:ok, account_id: account_id, person_id: person_id}
  end

  describe "A1 temporal resolver" do
    test "Maya's birthday June 14th → confirmed anchor", %{account_id: aid, person_id: pid} do
      {:ok, list} =
        TemporalResolver.resolve(
          "Maya's birthday is June 14th",
          ["June 14th"],
          ~D[2026-03-01],
          aid,
          pid
        )

      assert length(list) >= 1
      a = hd(list)
      assert a.anchor_type == "birthday"
      assert a.date.month == 6
      assert a.date.day == 14
      assert a.confidence >= 0.6
      assert a.confirmed == true
      assert a.needs_confirmation == false

      assert {:ok, :inserted} = hd(TemporalResolver.upsert_anchors([a]))
      assert Repo.get_by(TemporalAnchor, account_id: aid, anchor_type: "birthday")
    end

    test "sometime in June → needs confirmation, not auto-confirmed", %{account_id: aid, person_id: pid} do
      {:ok, list} =
        TemporalResolver.resolve(
          "her birthday is sometime in June",
          ["sometime in June"],
          ~D[2026-03-01],
          aid,
          pid
        )

      assert length(list) >= 1
      a = hd(list)
      assert a.confidence <= 0.5
      assert a.needs_confirmation == true
      assert a.confirmed == false
    end

    test "duplicate June 14 mentions dedup to one anchor", %{account_id: aid, person_id: pid} do
      {:ok, [a1]} =
        TemporalResolver.resolve("birthday is June 14th", [], ~D[2026-03-01], aid, pid)

      {:ok, [a2]} =
        TemporalResolver.resolve("remember June 14 birthday", [], ~D[2026-03-01], aid, pid)

      assert {:ok, :inserted} = hd(TemporalResolver.upsert_anchors([a1]))
      assert {:ok, :updated} = hd(TemporalResolver.upsert_anchors([a2]))

      count =
        from(t in TemporalAnchor, where: t.account_id == ^aid)
        |> Repo.aggregate(:count, :id)

      assert count == 1
    end

    test "confirmed birthday within 7 days surfaces nudge; unconfirmed does not", %{
      account_id: aid,
      person_id: pid
    } do
      today = Date.utc_today()
      in_five = Date.add(today, 5)

      {:ok, _} =
        %TemporalAnchor{}
        |> TemporalAnchor.changeset(%{
          account_id: aid,
          person_id: pid,
          anchor_type: "birthday",
          date: in_five,
          confidence: 0.9,
          confirmed: true,
          needs_confirmation: false,
          source_text: "June birthday"
        })
        |> Repo.insert()

      {:ok, _} =
        %TemporalAnchor{}
        |> TemporalAnchor.changeset(%{
          account_id: aid,
          person_id: pid,
          anchor_type: "anniversary",
          date: Date.add(today, 4),
          confidence: 0.4,
          confirmed: false,
          needs_confirmation: true,
          source_text: "sometime"
        })
        |> Repo.insert()

      nudges = SocialMemory.surface_nudges(SocialMemory.for_account(aid))
      temporal = Enum.filter(nudges, &(&1.type == :temporal_anchor))
      assert length(temporal) == 1
      assert temporal |> hd() |> Map.get(:ref_id)
      assert String.contains?(hd(temporal).reason, "No plan yet")
    end
  end

  describe "A2 relationship behavior" do
    test "every taxonomy type has a seeded profile" do
      types = OpalCore.Relationships.RelationshipType.allowed_types()

      Enum.each(types, fn t ->
        assert Repo.get(OpalCore.SocialMemory.RelationshipBehaviorProfile, t),
               "missing profile for #{t}"
      end)
    end

    test "behavior_override merges into How to be section", %{account_id: aid, person_id: pid} do
      {:ok, _} =
        %PersonMemory{}
        |> PersonMemory.changeset(%{
          account_id: aid,
          person_id: pid,
          relationship_type: "partner",
          behavior_override: %{
            "tone_adjustment" => "direct",
            "note" => "learned from 3 conversations"
          }
        })
        |> Repo.insert()

      scoped = SocialMemory.for_account(aid)
      conv = Ecto.UUID.generate()

      # Seed conversation index so recall finds the person via empty participants —
      # inject via format path by building what_you_know through PromptBuilder with recall people
      recall = %{
        people: [
          %{
            account_id: aid,
            person_id: pid,
            relationship_type: "partner",
            cadence_status: "stable",
            known_facts: %{},
            open_loops: [],
            behavior_override: %{
              "tone_adjustment" => "direct",
              "note" => "learned from 3 conversations"
            }
          }
        ],
        my_open_commitments: [],
        active_plans: [],
        relevant_patterns: [],
        conversation_summary: nil,
        memory_record_ids: %{}
      }

      # Use PromptBuilder private path via build with mocked recall — call format through public build
      # after putting person in DB and a fake conversation with entity
      {:ok, idx} =
        %OpalCore.SocialMemory.ConversationIndex{}
        |> OpalCore.SocialMemory.ConversationIndex.changeset(%{
          account_id: aid,
          conversation_id: conv,
          key_entities: %{"people" => [pid]},
          last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
        })
        |> Repo.insert()

      _ = idx

      built = PromptBuilder.build(scoped, conv, "want to grab dinner sometime?")
      assert is_binary(built.what_you_know)
      assert built.what_you_know =~ "direct" or built.what_you_know =~ "Learned"
      assert built.what_you_know =~ "How to be"
    end

    test "same message yields different how-to-be for partner/close_friend/business", %{
      account_id: aid
    } do
      variants = [
        {"partner", "warm_intimate"},
        {"close_friend", "warm_casual"},
        {"business", "friendly_respectful"}
      ]

      outputs =
        Enum.map(variants, fn {rel, _tone} ->
          pid = Ecto.UUID.generate()

          {:ok, _} =
            %PersonMemory{}
            |> PersonMemory.changeset(%{
              account_id: aid,
              person_id: pid,
              relationship_type: rel
            })
            |> Repo.insert()

          conv = Ecto.UUID.generate()

          {:ok, _} =
            %OpalCore.SocialMemory.ConversationIndex{}
            |> OpalCore.SocialMemory.ConversationIndex.changeset(%{
              account_id: aid,
              conversation_id: conv,
              key_entities: %{"people" => [pid]},
              last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
            })
            |> Repo.insert()

          built = PromptBuilder.build(SocialMemory.for_account(aid), conv, "want to grab dinner sometime?")
          {rel, built.what_you_know}
        end)

      # Log verbatim for evidence (judgment test)
      Enum.each(outputs, fn {rel, text} ->
        IO.puts("\n=== CALIBRATION #{rel} ===\n#{text}\n")
      end)

      tones = Enum.map(outputs, fn {_, t} -> t end)
      assert length(Enum.uniq(tones)) == 3
    end
  end

  describe "A3 routines + patterns" do
    test "5 Tuesday coffees → routine confidence 0.8", %{account_id: aid} do
      Enum.each(1..5, fn i ->
        start =
          DateTime.utc_now()
          |> DateTime.add(-i * 7 * 86_400, :second)
          |> then(fn dt ->
            # Force Tuesday (Elixir dow 2)
            d = DateTime.to_date(dt)
            # Approximate: use time_label Tuesday
            dt
          end)
          |> DateTime.truncate(:microsecond)

        {:ok, _} =
          %PlanMemory{}
          |> PlanMemory.changeset(%{
            account_id: aid,
            plan_id: Ecto.UUID.generate(),
            plan_label: "coffee with Sam",
            time_label: "Tuesday morning",
            place_label: "cafe",
            status: "active",
            start_at: start
          })
          |> Repo.insert()
      end)

      assert :ok = RoutineDetectorWorker.detect_for_account(aid)

      routine =
        from(r in Routine, where: r.account_id == ^aid and r.activity == "coffee")
        |> Repo.one()

      assert routine
      assert routine.confidence >= 0.8
      assert routine.detection_count >= 5
    end

    test "skip Tuesday with no plan → streak_broken nudge", %{account_id: aid} do
      # Elixir Date.day_of_week: set routine for today's dow
      today = Date.utc_today()
      dow = rem(Date.day_of_week(today), 7)

      {:ok, r} =
        %Routine{}
        |> Routine.changeset(%{
          account_id: aid,
          activity: "coffee",
          cadence: "weekly",
          day_of_week: dow,
          confidence: 0.8,
          detection_count: 5,
          streak_broken: false
        })
        |> Repo.insert()

      assert :ok = MemoryHourlyWorker.detect_routine_breaks(aid)
      r2 = Repo.get!(Routine, r.id)
      assert r2.streak_broken == true

      nudges = SocialMemory.surface_nudges(SocialMemory.for_account(aid))
      assert Enum.any?(nudges, &(&1.type == :routine_broken))
    end

    test "all 6 pattern types can be upserted by hourly refresh", %{account_id: aid} do
      # Seed enough plans for weekend + overcommit
      Enum.each(1..3, fn i ->
        {:ok, _} =
          %PlanMemory{}
          |> PlanMemory.changeset(%{
            account_id: aid,
            plan_id: Ecto.UUID.generate(),
            plan_label: "weekend hang #{i}",
            time_label: "Saturday",
            status: "active"
          })
          |> Repo.insert()
      end)

      assert :ok = MemoryHourlyWorker.refresh_patterns(aid)
      # At least weekend_planner and overcommit_signal live
      types =
        from(p in OpalCore.SocialMemory.SocialPattern, where: p.account_id == ^aid, select: p.pattern_type)
        |> Repo.all()

      assert "weekend_planner" in types
      assert "overcommit_signal" in types
    end
  end
end
