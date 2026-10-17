defmodule OpalCore.Intelligence.QuietHoursClockTest do
  @moduledoc """
  Repair #17 regression — the quiet-hours gates keep their real
  semantics under pinned clocks, and the Clock override seams work.

  Quiet instant:     2026-06-01 09:00Z = 02:00 PDT (America/Los_Angeles)
  Non-quiet instant: 2026-06-01 19:00Z = 12:00 PDT
  """
  use OpalCore.DataCase, async: false
  use Oban.Testing, repo: OpalCore.Repo

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.AttentionBudget
  alias OpalCore.Push.NotificationIntelligence
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialMemory.ConversationIndex

  @quiet ~U[2026-06-01 09:00:00Z]
  @daytime ~U[2026-06-01 19:00:00Z]

  setup do
    on_exit(fn -> Clock.unfreeze() end)

    account_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: account_id,
        handle: "qh_" <> String.slice(account_id, 0, 8),
        display_name: "Quiet Hours"
      })
      |> Repo.insert()

    {:ok, _} =
      %AssistancePreference{}
      |> AssistancePreference.changeset(%{
        user_id: account_id,
        timezone: "America/Los_Angeles",
        quiet_hours_start: "22:00",
        quiet_hours_end: "08:00",
        intelligence_maturity: "established"
      })
      |> Repo.insert()

    {:ok, account_id: account_id}
  end

  test "quiet time: AttentionBudget denies routine, allows time_critical when active",
       %{account_id: aid} do
    Clock.freeze(@quiet)

    assert {:denied, :quiet_hours} =
             AttentionBudget.request_slot(aid, "nudge", "proactive_thread", %{
               person_id: Ecto.UUID.generate(),
               topic: "quiet_proactive",
               provenance: "stated"
             })

    assert {:denied, :quiet_hours} =
             AttentionBudget.request_slot(aid, "routine_break", "routine_break", %{
               person_id: Ecto.UUID.generate(),
               topic: "quiet_routine",
               provenance: "stated"
             })

    # time_critical does NOT break through for an inactive owner
    assert {:denied, :quiet_hours} =
             AttentionBudget.request_slot(aid, "reminder", "time_critical", %{
               person_id: Ecto.UUID.generate(),
               topic: "quiet_critical_inactive",
               provenance: "stated"
             })

    # weekly briefing defers instead of denying outright
    assert {:denied, :quiet_hours_defer_8am} =
             AttentionBudget.request_slot(aid, "weekly_briefing", "weekly_briefing", %{
               topic: "quiet_briefing",
               provenance: "observed"
             })

    # user-command reminders bypass quiet hours entirely
    assert {:granted, _} =
             AttentionBudget.request_slot(aid, "reminder", "reminder", %{
               person_id: Ecto.UUID.generate(),
               topic: "quiet_reminder",
               provenance: "stated"
             })

    # …and time_critical breaks through once the owner is recently active
    {:ok, _} =
      %ConversationIndex{}
      |> ConversationIndex.changeset(%{
        account_id: aid,
        conversation_id: Ecto.UUID.generate(),
        last_activity_at: @quiet
      })
      |> Repo.insert()

    assert {:granted, _} =
             AttentionBudget.request_slot(aid, "reminder", "time_critical", %{
               person_id: Ecto.UUID.generate(),
               topic: "quiet_critical_active",
               provenance: "stated"
             })
  end

  test "non-quiet time: AttentionBudget allows routine and proactive", %{account_id: aid} do
    Clock.freeze(@daytime)

    assert {:granted, _} =
             AttentionBudget.request_slot(aid, "nudge", "proactive_thread", %{
               person_id: Ecto.UUID.generate(),
               topic: "day_proactive",
               provenance: "stated"
             })

    assert {:granted, _} =
             AttentionBudget.request_slot(aid, "routine_break", "routine_break", %{
               person_id: Ecto.UUID.generate(),
               topic: "day_routine",
               provenance: "stated"
             })
  end

  test "quiet time: push holds normal tier, still sends urgent", %{account_id: aid} do
    Clock.freeze(@quiet)

    Oban.Testing.with_testing_mode(:manual, fn ->
      assert NotificationIntelligence.quiet_hours?(aid)

      assert {:ok, :held_quiet_hours} =
               NotificationIntelligence.enqueue(
                 aid,
                 "New message",
                 "held until morning",
                 %{"kind" => "message.new"},
                 tier: :normal
               )

      refute_enqueued(worker: DeliverPushWorker)

      assert {:ok, %Oban.Job{}} =
               NotificationIntelligence.enqueue(
                 aid,
                 "Missed call",
                 "urgent still goes out",
                 %{"kind" => "call.missed"},
                 tier: :urgent
               )

      assert_enqueued(worker: DeliverPushWorker, args: %{"user_id" => aid})
    end)
  end

  test "non-quiet time: push sends normal tier immediately", %{account_id: aid} do
    Clock.freeze(@daytime)

    Oban.Testing.with_testing_mode(:manual, fn ->
      refute NotificationIntelligence.quiet_hours?(aid)

      assert {:ok, %Oban.Job{}} =
               NotificationIntelligence.enqueue(
                 aid,
                 "New message",
                 "sent right away",
                 %{"kind" => "message.new"},
                 tier: :normal
               )

      assert_enqueued(worker: DeliverPushWorker, args: %{"user_id" => aid})
    end)
  end

  test "clock override seams: app env honored, process freeze outranks it" do
    previous = Application.get_env(:opal_core, :clock_override)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :clock_override)
      else
        Application.put_env(:opal_core, :clock_override, previous)
      end
    end)

    # Application-env override (the global seam the coordinator pins)
    Application.put_env(:opal_core, :clock_override, @quiet)
    assert Clock.utc_now() == @quiet

    # ISO-8601 binary form is accepted too
    Application.put_env(:opal_core, :clock_override, "2026-06-01T19:00:00Z")
    assert Clock.utc_now() == @daytime

    # Process freeze outranks the app-env override (per-test pins win
    # over a run-wide pin)
    Clock.freeze(@quiet)
    assert Clock.utc_now() == @quiet
    Clock.unfreeze()
    assert Clock.utc_now() == @daytime

    Application.delete_env(:opal_core, :clock_override)
  end
end
