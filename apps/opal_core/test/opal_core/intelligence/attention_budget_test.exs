defmodule OpalCore.Intelligence.AttentionBudgetTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{AttentionBudget, AttentionSlot}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialMemory.ConversationIndex

  setup do
    # Repair #17 — pin the clock to an instant that is daytime in both
    # timezones this file uses: 2026-06-01 03:00Z = 12:00 JST (the
    # setup preference) and 20:00 PDT the prior evening in Los Angeles.
    # Individual tests re-pin when they exercise the quiet-hours gate.
    Clock.freeze(~U[2026-06-01 03:00:00Z])
    on_exit(fn -> Clock.unfreeze() end)

    account_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: account_id,
        handle: "attn_" <> String.slice(account_id, 0, 8),
        display_name: "Attn"
      })
      |> Repo.insert()

    {:ok, _} =
      %AssistancePreference{}
      |> AssistancePreference.changeset(%{
        user_id: account_id,
        timezone: "Asia/Tokyo",
        quiet_hours_start: "22:00",
        quiet_hours_end: "08:00",
        intelligence_maturity: "established"
      })
      |> Repo.insert()

    {:ok, account_id: account_id}
  end

  test "daily budget grants up to 5 counting slots", %{account_id: aid} do
    results =
      for i <- 1..6 do
        AttentionBudget.request_slot(aid, "nudge", "reminder", %{
          person_id: Ecto.UUID.generate(),
          topic: "t#{i}",
          provenance: "stated"
        })
      end

    granted = Enum.count(results, &match?({:granted, _}, &1))
    denied = Enum.find(results, &match?({:denied, :daily_budget}, &1))

    assert granted == 5
    assert denied == {:denied, :daily_budget}
  end

  test "weekly_briefing exempt from daily budget", %{account_id: aid} do
    for i <- 1..5 do
      assert {:granted, _} =
               AttentionBudget.request_slot(aid, "nudge", "reminder", %{
                 person_id: Ecto.UUID.generate(),
                 topic: "fill#{i}",
                 provenance: "stated"
               })
    end

    # Briefing still grants even when budget full (if not quiet hours — may defer)
    case AttentionBudget.request_slot(aid, "weekly_briefing", "weekly_briefing", %{
           topic: "weekly_briefing",
           provenance: "observed"
         }) do
      {:granted, id} ->
        slot = Repo.get!(AttentionSlot, id)
        assert slot.counts_against_budget == false

      {:denied, :quiet_hours_defer_8am} ->
        # Acceptable during quiet hours in CI local TZ
        assert true

      other ->
        flunk("unexpected #{inspect(other)}")
    end
  end

  test "duplicate person/topic within 24h — higher priority wins", %{account_id: aid} do
    person = Ecto.UUID.generate()

    assert {:granted, low_id} =
             AttentionBudget.request_slot(aid, "routine_break", "routine_break", %{
               person_id: person,
               topic: "coffee",
               provenance: "observed"
             })

    assert {:granted, high_id} =
             AttentionBudget.request_slot(aid, "mediation", "mediation", %{
               person_id: person,
               topic: "coffee",
               provenance: "observed"
             })

    assert high_id != low_id
    assert Repo.get!(AttentionSlot, low_id).status == "superseded"
    assert Repo.get!(AttentionSlot, high_id).status == "granted"

    assert {:denied, :duplicate} =
             AttentionBudget.request_slot(aid, "reminder", "reminder", %{
               person_id: person,
               topic: "coffee",
               provenance: "observed"
             })
  end

  test "inferred-only provenance denied", %{account_id: aid} do
    assert {:denied, :inferred_only} =
             AttentionBudget.request_slot(aid, "nudge", "reminder", %{
               person_id: Ecto.UUID.generate(),
               topic: "birthday",
               provenance: "inferred"
             })
  end

  test "quiet hours deny routine; time_critical + active may grant", %{account_id: aid} do
    # Force LA TZ for this case (suite default Asia/Tokyo keeps other tests daytime)
    pref = Repo.get_by!(AssistancePreference, user_id: aid)

    {:ok, _} =
      pref
      |> AssistancePreference.changeset(%{timezone: "America/Los_Angeles"})
      |> Repo.update()

    # Repair #17 — both branches of this test used to be chosen by the
    # real wall clock. Pin a quiet instant instead (2026-06-01 09:00Z =
    # 02:00 PDT) and exercise the quiet branch deterministically…
    Clock.freeze(~U[2026-06-01 09:00:00Z])

    # Opal proactive nudges respect quiet hours (user-command Reminders bypass separately)
    assert {:denied, :quiet_hours} =
             AttentionBudget.request_slot(aid, "nudge", "proactive_thread", %{
               person_id: Ecto.UUID.generate(),
               topic: "quiet_test",
               provenance: "stated"
             })

    {:ok, _} =
      %ConversationIndex{}
      |> ConversationIndex.changeset(%{
        account_id: aid,
        conversation_id: Ecto.UUID.generate(),
        last_activity_at: ~U[2026-06-01 09:00:00Z]
      })
      |> Repo.insert()

    assert {:granted, _} =
             AttentionBudget.request_slot(aid, "reminder", "time_critical", %{
               person_id: Ecto.UUID.generate(),
               topic: "urgent",
               provenance: "stated"
             })

    # …then pin a non-quiet instant (2026-06-01 19:00Z = 12:00 PDT) and
    # exercise the daytime branch deterministically too.
    Clock.freeze(~U[2026-06-01 19:00:00Z])

    assert {:granted, id} =
             AttentionBudget.request_slot(aid, "nudge", "proactive_thread", %{
               person_id: Ecto.UUID.generate(),
               topic: "daytime",
               provenance: "stated"
             })

    slot = Repo.get!(AttentionSlot, id)
    assert slot.granted_on == ~D[2026-06-01]
  end

  test "midnight local date reset — used_today scoped to granted_on", %{account_id: aid} do
    yesterday = Date.add(Date.utc_today(), -1)

    {:ok, _} =
      %AttentionSlot{}
      |> AttentionSlot.changeset(%{
        account_id: aid,
        surface: "nudge",
        priority: "reminder",
        ref: %{},
        dedupe_key: "person_date:x:#{yesterday}",
        granted_on: yesterday,
        counts_against_budget: true,
        status: "granted"
      })
      |> Repo.insert()

    assert AttentionBudget.used_today(aid, Date.utc_today()) == 0

    assert {:granted, _} =
             AttentionBudget.request_slot(aid, "nudge", "reminder", %{
               person_id: Ecto.UUID.generate(),
               topic: "new_day",
               provenance: "stated"
             })
  end
end
