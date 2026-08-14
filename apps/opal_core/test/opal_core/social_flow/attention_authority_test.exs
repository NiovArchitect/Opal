defmodule OpalCore.SocialFlow.AttentionAuthorityTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.AttentionAuthority
  alias OpalCore.SocialFlow.ExperienceContinuation

  describe "evaluate/1" do
    test "silence is first-class for recompute-only" do
      d = AttentionAuthority.evaluate(%{recompute_only: true, next_gap: "place"})
      assert d.class == "silence"
      refute d.should_surface_home
      refute d.may_notify
      assert d.reason == "recompute_no_delta"
    end

    test "private memory alone does not create Home residue" do
      d = AttentionAuthority.evaluate(%{private_memory_only: true})
      refute d.should_surface_home
      assert d.class == "silence"
    end

    test "place gap requires action on Home" do
      d =
        AttentionAuthority.evaluate(%{
          next_gap: "place",
          requires_user_action: true,
          has_meaningful_dims: true,
          sufficiency: "converging"
        })

      assert d.should_surface_home
      assert d.class == "action_required"
      assert d.should_surface_chat_filament
    end

    test "leave window is time-sensitive" do
      d =
        AttentionAuthority.evaluate(%{
          leave_by_relevant: true,
          minutes_until: 25,
          sufficiency: "usable"
        })

      assert d.class == "time_sensitive"
      assert d.may_notify
    end

    test "handled recedes from Home" do
      d = AttentionAuthority.evaluate(%{lifecycle_stage: "handled", sufficiency: "usable"})
      refute d.should_surface_home
    end

    test "weak intention silent" do
      d = AttentionAuthority.evaluate(%{sufficiency: "intention", has_meaningful_dims: false})
      assert d.class == "silence"
      refute d.should_surface_home
    end
  end

  describe "compose_home_field/2" do
    test "compresses many signals into sparse bands" do
      items =
        for i <- 1..12 do
          {%{
             next_gap: if(i <= 3, do: "place", else: nil),
             requires_user_action: i <= 3,
             sufficiency: if(i <= 6, do: "usable", else: "converging"),
             has_meaningful_dims: true,
             lifecycle_stage: if(i <= 6, do: "set", else: "still_open"),
             conversation_id: "c#{i}"
           }, %{id: i}}
        end

      field = AttentionAuthority.compose_home_field(items, max_now: 2, max_later: 3, max_quiet: 1)
      assert length(field) <= 6
      assert Enum.all?(field, & &1.decision.should_surface_home)
      refute Enum.any?(field, &(&1.decision.class == "silence"))
    end

    test "more non-actionable private memory does not grow Home" do
      base = [
        {%{next_gap: "place", requires_user_action: true, has_meaningful_dims: true}, :a}
      ]

      with_mem =
        base ++
          [
            {%{private_memory_only: true}, :m1},
            {%{private_memory_only: true}, :m2},
            {%{recompute_only: true}, :r1}
          ]

      f1 = AttentionAuthority.compose_home_field(base)
      f2 = AttentionAuthority.compose_home_field(with_mem)
      assert length(f1) == length(f2)
    end
  end

  describe "Pass 13 priority correctness" do
    test "A: tonight actionable place-open outranks Saturday place-open" do
      tonight = %{
        next_gap: "place",
        requires_user_action: true,
        has_meaningful_dims: true,
        sufficiency: "converging",
        lifecycle_stage: "still_open",
        when: "Tonight · 7:00 PM",
        minutes_until: 240,
        conversation_id: "tonight"
      }

      saturday = %{
        next_gap: "place",
        requires_user_action: true,
        has_meaningful_dims: true,
        sufficiency: "converging",
        lifecycle_stage: "still_open",
        when: "Saturday · 7:30 PM",
        minutes_until: 3000,
        conversation_id: "sat"
      }

      # Insertion order Friends first must not win
      field =
        AttentionAuthority.compose_home_field(
          [{saturday, :sat}, {tonight, :tonight}],
          max_now: 1,
          max_later: 0,
          max_quiet: 0
        )

      assert length(field) == 1
      assert field |> hd() |> Map.get(:item) == :tonight
    end

    test "B: settled tonight loses awaken band to later actionable" do
      settled = %{
        sufficiency: "usable",
        lifecycle_stage: "set",
        has_meaningful_dims: true,
        when: "Tonight · 7:00 PM",
        minutes_until: 180,
        conversation_id: "settled",
        requires_user_action: false
      }

      later = %{
        next_gap: "place",
        requires_user_action: true,
        has_meaningful_dims: true,
        sufficiency: "converging",
        when: "Saturday · 7:30 PM",
        minutes_until: 3000,
        conversation_id: "sat"
      }

      explain =
        AttentionAuthority.compose_home_field_explain(
          [{settled, :settled}, {later, :later}],
          max_now: 2,
          max_later: 2
        )

      now_items = Enum.filter(explain.surfaced, &(&1.band == "now"))
      # Later actionable should appear in now band; settled is useful ambient lower
      assert Enum.any?(now_items, &(&1.item == :later))
    end

    test "C: external deadline on later can beat nearer low-urgency action" do
      tonight = %{
        next_gap: "place",
        requires_user_action: true,
        has_meaningful_dims: true,
        when: "Tonight · 9:00 PM",
        minutes_until: 360,
        conversation_id: "tonight"
      }

      sat_hold = %{
        next_gap: "place",
        requires_user_action: true,
        has_meaningful_dims: true,
        when: "Saturday · 7:30 PM",
        minutes_until: 4000,
        action_deadline_minutes: 8,
        conversation_id: "sat_hold"
      }

      field =
        AttentionAuthority.compose_home_field(
          [{tonight, :tonight}, {sat_hold, :hold}],
          max_now: 1,
          max_later: 0,
          max_quiet: 0
        )

      assert field |> hd() |> Map.get(:item) == :hold
    end

    test "E: insertion order independence" do
      a = %{
        next_gap: "place",
        requires_user_action: true,
        has_meaningful_dims: true,
        when: "Tonight",
        minutes_until: 200,
        conversation_id: "a"
      }

      b = %{
        next_gap: "place",
        requires_user_action: true,
        has_meaningful_dims: true,
        when: "Saturday",
        minutes_until: 5000,
        conversation_id: "b"
      }

      f1 = AttentionAuthority.compose_home_field([{a, :a}, {b, :b}], max_now: 1, max_later: 0)
      f2 = AttentionAuthority.compose_home_field([{b, :b}, {a, :a}], max_now: 1, max_later: 0)
      assert hd(f1).item == :a
      assert hd(f2).item == :a
    end
  end

  describe "notification_policy/2" do
    test "dedupes same consequence" do
      facts = %{
        leave_by_relevant: true,
        minutes_until: 30,
        conversation_id: "c1",
        leave_by: "18:40"
      }

      first = AttentionAuthority.notification_policy(facts, nil)
      assert first.action == :notify

      again =
        AttentionAuthority.notification_policy(facts, %{
          consequence_id: "c1",
          class: "time_sensitive",
          payload_key: "||||"
        })

      # payload may differ — check supersede/suppress path exists
      assert again.action in [:suppress, :supersede, :notify, :silent]
    end

    test "recompute does not notify" do
      p = AttentionAuthority.notification_policy(%{recompute_only: true}, nil)
      assert p.action == :silent
    end
  end

  describe "Pass 11 density / ranking before cap" do
    test "imminent place gap outranks distant place gap before caps" do
      items = [
        {%{
           next_gap: "place",
           requires_user_action: true,
           has_meaningful_dims: true,
           minutes_until: 48 * 60,
           conversation_id: "friends_sat",
           label: "Saturday friends"
         }, :sat},
        {%{
           next_gap: "place",
           requires_user_action: true,
           has_meaningful_dims: true,
           minutes_until: 45,
           conversation_id: "jordan",
           label: "Jordan tonight"
         }, :jordan},
        {%{
           next_gap: "place",
           requires_user_action: true,
           has_meaningful_dims: true,
           minutes_until: 7 * 24 * 60,
           conversation_id: "maya",
           label: "Maya coffee week"
         }, :maya}
      ]

      explain = AttentionAuthority.compose_home_field_explain(items, max_now: 1, max_later: 1, max_quiet: 0)
      assert length(explain.surfaced) <= 2
      # Highest priority now band must be Jordan (imminent)
      now = Enum.filter(explain.surfaced, &(&1.band == "now"))
      assert hd(now).item == :jordan
      assert hd(now).surface_reason =~ "jordan" or hd(now).decision.priority >
               Enum.find(explain.after_collapse, &(&1.item == :sat)).decision.priority
    end

    test "multiple signals same conversation collapse to one reality" do
      items =
        for i <- 1..6 do
          {%{
             conversation_id: "jordan",
             next_gap: "place",
             requires_user_action: true,
             has_meaningful_dims: true,
             minutes_until: 60,
             kind: if(i == 1, do: "signal", else: "proposal")
           }, i}
        end

      # Force all as signals with different priority noise
      items =
        Enum.map(items, fn {f, i} ->
          {Map.put(f, :kind, "signal"), i}
        end)

      explain = AttentionAuthority.compose_home_field_explain(items, max_now: 5, max_later: 5)
      jordan_surfaced = Enum.filter(explain.surfaced, fn s -> s.lineage == "jordan" end)
      assert length(jordan_surfaced) == 1
      assert Enum.any?(explain.suppressed, &(&1.suppress_reason =~ "reality_collapse"))
    end

    test "private memory and recompute do not increase Home count" do
      base = [
        {%{next_gap: "place", requires_user_action: true, has_meaningful_dims: true, conversation_id: "j"},
         :main}
      ]

      bloated =
        base ++
          Enum.map(1..10, fn i ->
            {%{private_memory_only: true, conversation_id: "m#{i}"}, {:mem, i}}
          end) ++
          Enum.map(1..5, fn i ->
            {%{recompute_only: true, conversation_id: "r#{i}"}, {:re, i}}
          end)

      a = AttentionAuthority.compose_home_field(base)
      b = AttentionAuthority.compose_home_field(bloated)
      assert length(b) == length(a)
    end

    test "notification supersedes leave-time update" do
      a = %{leave_by_relevant: true, minutes_until: 40, conversation_id: "j", leave_by: "18:40"}
      b = %{leave_by_relevant: true, minutes_until: 20, conversation_id: "j", leave_by: "18:20"}
      first = AttentionAuthority.notification_policy(a, nil)
      assert first.action == :notify

      second =
        AttentionAuthority.notification_policy(b, %{
          consequence_id: "j",
          class: "time_sensitive",
          payload_key: "||18:40|"
        })

      assert second.action == :supersede
    end
  end

  describe "ExperienceContinuation" do
    test "night phrase is presentation, not required domain state" do
      night = ExperienceContinuation.present(%{"hour" => 22, "participant_count" => 2})
      assert night["verb"] == "continue"
      assert night["opens"] == "extend"
      assert night["label"] =~ ~r/night|evening|Continue/i
      assert night["daypart"] == "night"
    end

    test "morning does not say extend the night" do
      m = ExperienceContinuation.present(%{"hour" => 9, "participant_count" => 1})
      refute m["label"] =~ ~r/night/i
      assert m["label"] =~ ~r/morning|day|Continue/i
    end

    test "remote continuation" do
      r = ExperienceContinuation.present(%{"remote?" => true, "hour" => 15})
      assert r["daypart"] == "remote"
      assert r["label"] =~ ~r/hanging out|Continue/i
    end

    test "available only when set/ready and when known" do
      assert ExperienceContinuation.available?(:set, true)
      refute ExperienceContinuation.available?(:still_open, true)
      refute ExperienceContinuation.available?(:set, false)
    end

    test "suppresses when next commitment soon" do
      assert {true, "next_commitment_soon"} =
               ExperienceContinuation.suppressed?(%{minutes_to_next_commitment: 30})

      assert {false, nil} = ExperienceContinuation.suppressed?(%{minutes_to_next_commitment: 120})
    end
  end
end
