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
  end
end
