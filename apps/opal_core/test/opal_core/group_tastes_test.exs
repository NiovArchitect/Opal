defmodule OpalCore.GroupTastesTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.FixturesHelper
  alias OpalCore.GroupTastes
  alias OpalCore.OpalContext
  alias OpalCore.OpalResponse
  alias OpalCore.Repo

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp fresh_user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}_#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp trio do
    a = fresh_user!("Maya")
    b = fresh_user!("John")
    c = fresh_user!("Sam")
    {[a.id, b.id, c.id], a, b, c}
  end

  test "group_hash is deterministic for same members" do
    ids = ["user_c", "user_a", "user_b"]
    h1 = GroupTastes.group_hash(ids)
    h2 = GroupTastes.group_hash(Enum.reverse(ids))
    assert h1 == h2
    assert String.length(h1) == 16
    assert h1 == GroupTastes.group_hash(["user_a", "user_b", "user_c"])
  end

  test "group_hash matches SHA256 first 16 of sorted join" do
    ids = ["user_a", "user_b", "user_c"]
    expected =
      :crypto.hash(:sha256, "user_a|user_b|user_c")
      |> Base.encode16(case: :lower)
      |> String.slice(0, 16)

    assert GroupTastes.group_hash(ids) == expected
  end

  test "record_plan creates group_taste and increments counts" do
    {ids, _, _, _} = trio()

    assert {:ok, gt1} =
             GroupTastes.record_plan(ids, %{
               vibe: "lively",
               cuisine: "italian",
               day_of_week: "friday"
             })

    assert gt1.plan_count == 1
    assert gt1.group_hash == GroupTastes.group_hash(ids)
    assert get_in(gt1.vibes, ["lively", "n"]) == 1
    assert get_in(gt1.cuisines, ["italian", "n"]) == 1
    assert get_in(gt1.temporal_patterns, ["friday", "n"]) == 1

    assert {:ok, gt2} =
             GroupTastes.record_plan(ids, %{
               vibe: "lively",
               cuisine: "italian",
               day_of_week: "friday"
             })

    assert gt2.id == gt1.id
    assert gt2.plan_count == 2
    assert get_in(gt2.vibes, ["lively", "n"]) == 2
  end

  test "get_for_group returns nil for <2 members" do
    u = fresh_user!("solo")
    assert GroupTastes.get_for_group([u.id]) == nil
    assert {:error, :too_few_members} = GroupTastes.record_plan([u.id], %{vibe: "quiet"})
  end

  test "get_for_group returns nil when no record" do
    {ids, _, _, _} = trio()
    assert GroupTastes.get_for_group(ids) == nil
  end

  test "suggest_for_group returns empty for plan_count < 3" do
    {ids, _, _, _} = trio()

    assert {:ok, _} = GroupTastes.record_plan(ids, %{vibe: "lively", cuisine: "thai"})
    assert {:ok, _} = GroupTastes.record_plan(ids, %{vibe: "lively", cuisine: "thai"})

    assert GroupTastes.suggest_for_group(ids) == %{vibes: [], cuisines: [], best_day: nil}
  end

  test "suggest_for_group returns top vibes/cuisines for 3+ plans" do
    {ids, _, _, _} = trio()

    for _ <- 1..3 do
      assert {:ok, _} =
               GroupTastes.record_plan(ids, %{
                 vibe: "lively",
                 cuisine: "italian",
                 day_of_week: "friday"
               })
    end

    assert {:ok, _} =
             GroupTastes.record_plan(ids, %{
               vibe: "quiet",
               cuisine: "thai",
               day_of_week: "saturday"
             })

    sug = GroupTastes.suggest_for_group(ids)
    assert "lively" in sug.vibes
    assert "italian" in sug.cuisines
    assert sug.best_day == "friday"
  end

  test "decay: old plans weighted 0.5" do
    {ids, _, _, _} = trio()
    old = DateTime.utc_now() |> DateTime.add(-200 * 24 * 3600, :second)

    # Three old lively/italian, one recent quiet/thai — with decay lively still wins on raw
    # count*0.5 = 1.5 vs quiet 1.0; force equal counts: 2 old lively vs 2 recent quiet
    assert {:ok, _} =
             GroupTastes.record_plan(ids, %{
               vibe: "lively",
               cuisine: "italian",
               day_of_week: "friday",
               observed_at: old
             })

    assert {:ok, _} =
             GroupTastes.record_plan(ids, %{
               vibe: "lively",
               cuisine: "italian",
               day_of_week: "friday",
               observed_at: old
             })

    now = DateTime.utc_now()

    assert {:ok, _} =
             GroupTastes.record_plan(ids, %{
               vibe: "quiet",
               cuisine: "thai",
               day_of_week: "monday",
               observed_at: now
             })

    assert {:ok, _} =
             GroupTastes.record_plan(ids, %{
               vibe: "quiet",
               cuisine: "thai",
               day_of_week: "monday",
               observed_at: now
             })

    # lively weight 0.5+0.5=1.0; quiet 1+1=2.0 → quiet wins
    sug = GroupTastes.suggest_for_group(ids, as_of: now)
    assert hd(sug.vibes) == "quiet"
    assert hd(sug.cuisines) == "thai"
  end

  test "privacy: opt-out user excluded from learning" do
    {ids, a, b, c} = trio()
    assert {:ok, _} = GroupTastes.set_opt_out(c.id, true)

    # Learning uses a+b only (opt-out filtered before hash)
    assert {:ok, gt} =
             GroupTastes.record_plan(ids, %{vibe: "lively", cuisine: "italian", day_of_week: "friday"})

    assert gt.member_ids == Enum.sort([a.id, b.id])
    refute c.id in gt.member_ids
    assert gt.group_hash == GroupTastes.group_hash([a.id, b.id])
    refute gt.group_hash == GroupTastes.group_hash(ids)

    # Lookups also filter opt-out → same a+b row; c never stored as member
    found = GroupTastes.get_for_group(ids)
    assert found.id == gt.id
    refute c.id in found.member_ids
    assert GroupTastes.get_for_group([a.id, b.id]).id == gt.id
  end

  test "groups_for_user lists membership" do
    {ids, a, _, _} = trio()
    assert {:ok, _} = GroupTastes.record_plan(ids, %{vibe: "lively"})
    list = GroupTastes.groups_for_user(a.id)
    assert length(list) == 1
    assert hd(list).group_hash == GroupTastes.group_hash(ids)
  end

  test "context includes group_tastes after 3+ plans" do
    {ids, a, b, c} = trio()

    for _ <- 1..3 do
      assert {:ok, _} =
               GroupTastes.record_plan(ids, %{
                 vibe: "lively",
                 cuisine: "italian",
                 day_of_week: "friday"
               })
    end

    assert {:ok, ctx} = OpalContext.assemble(a.id, "hello")
    assert length(ctx.group_tastes) == 1
    slice = hd(ctx.group_tastes)
    assert "lively" in slice.vibes
    assert slice.best_day == "friday"
    assert Enum.any?(slice.member_names, &(&1 in [a.display_name, b.display_name, c.display_name]))
  end

  test "OC-4 recommend uses group taste when for_who matches" do
    ctx = %{
      user: %{id: "x", display_name: "Alex", handle: "a", timezone: "America/Los_Angeles"},
      taste: %{vibes: [], cuisines: [], price_comfort: nil},
      temporal: %{recent_plans: [], upcoming_celebrations: [], active_conversation_count: 0},
      social: %{frequent_contacts: [], group_patterns: []},
      relationships: %{},
      trust_tier: "known",
      financial: nil,
      group_tastes: [
        %{
          member_names: ["Maya", "John", "Alex"],
          vibes: ["lively"],
          cuisines: ["italian"],
          best_day: "friday",
          plan_count: 4
        }
      ],
      message: %{text: "recommend dinner", length: 10, sent_at: "x"}
    }

    intent = %{
      intent: :recommend,
      confidence: :high,
      entities: %{for_who: ["Maya", "John"]},
      raw_text: "recommend dinner for Maya and John"
    }

    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    assert text =~ "always love"
    assert text =~ "lively"
    assert text =~ "italian"
  end

  test "OC-4 plan_create suggests best day for group" do
    ctx = %{
      user: %{id: "x", display_name: "Alex", handle: "a", timezone: "America/Los_Angeles"},
      taste: %{vibes: [], cuisines: [], price_comfort: nil},
      temporal: %{recent_plans: [], upcoming_celebrations: [], active_conversation_count: 0},
      social: %{frequent_contacts: [], group_patterns: []},
      relationships: %{},
      trust_tier: "known",
      financial: nil,
      group_tastes: [
        %{
          member_names: ["Maya", "John", "Alex"],
          vibes: ["lively"],
          cuisines: ["italian"],
          best_day: "friday",
          plan_count: 5
        }
      ],
      message: %{text: "plan dinner", length: 10, sent_at: "x"}
    }

    intent = %{
      intent: :plan_create,
      confidence: :high,
      entities: %{what: "dinner", when: "soon", who: ["Maya", "John"]},
      raw_text: "plan dinner with Maya and John"
    }

    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    assert text =~ "Friday"
    assert text =~ "Maya"
  end

  test "never scores groups — suggest has no compatibility field" do
    {ids, _, _, _} = trio()

    for _ <- 1..3 do
      assert {:ok, _} = GroupTastes.record_plan(ids, %{vibe: "lively", day_of_week: "friday"})
    end

    sug = GroupTastes.suggest_for_group(ids)
    refute Map.has_key?(sug, :score)
    refute Map.has_key?(sug, :compatibility)
    assert Map.keys(sug) |> Enum.sort() == [:best_day, :cuisines, :vibes]
  end

  test "set_opt_out toggles flag" do
    u = fresh_user!("opt")
    refute GroupTastes.opted_out?(u.id)
    assert {:ok, _} = GroupTastes.set_opt_out(u.id, true)
    assert GroupTastes.opted_out?(u.id)
  end
end
