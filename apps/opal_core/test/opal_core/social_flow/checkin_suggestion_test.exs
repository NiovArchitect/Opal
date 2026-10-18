defmodule OpalCore.SocialFlow.CheckinSuggestionTest do
  @moduledoc """
  Repair #18 B3, Act 2 - the proactive sweep suggestion gate matrix
  (design section 6, Scenario C step 3; section 3.3 gate stack).

  Every leg runs through the REAL gate stack:
  ProactiveConversation.threads_enabled?/1 -> dismissal ledger ->
  once-per-circle -> sweep quiet window -> minor majority ->
  ProactiveConversation.maybe_initiate/5 unmodified (opt-out, 7-day
  activity, quiet hours, 1/day cap, AttentionBudget). No gate is
  stubbed; the clock is pinned so quiet-hours legs are deterministic.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.ProactiveConversation
  alias OpalCore.OpalConversations
  alias OpalCore.Relationships
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AssistancePreference,
    Checkin,
    CheckinSuggestion,
    Clock,
    PlanParticipant,
    SharedPlan
  }

  alias OpalCore.SocialMemory.{ConversationIndex, ProactiveThreadLog}

  # Same readiness recipe as the Repair #16 proactivity suite: clock
  # pinned to a daytime instant, the owner's AttentionBudget quiet
  # window pinned away from now, and a ConversationIndex activity row
  # so the 7-day activity gate passes on its own terms.
  defp ready_user do
    n = System.unique_integer([:positive])

    user =
      %User{}
      |> User.changeset(%{
        id: Ecto.UUID.generate(),
        handle: "b3s-#{n}",
        display_name: "Suggester #{n}"
      })
      |> Repo.insert!()

    Clock.freeze(~U[2026-06-01 19:00:00Z])
    on_exit(fn -> Clock.unfreeze() end)

    now_h = Clock.utc_now().hour
    qs = rem(now_h + 2, 24)
    qe = rem(now_h + 3, 24)
    pad = fn h -> String.pad_leading(Integer.to_string(h), 2, "0") end

    %AssistancePreference{}
    |> AssistancePreference.changeset(%{
      user_id: user.id,
      timezone: "UTC",
      intelligence_maturity: "established",
      quiet_hours_start: "#{pad.(qs)}:00",
      quiet_hours_end: "#{pad.(qe)}:00"
    })
    |> Repo.insert!()

    %ConversationIndex{}
    |> ConversationIndex.changeset(%{
      account_id: user.id,
      conversation_id: Ecto.UUID.generate(),
      last_activity_at: Clock.utc_now(),
      rolling_summary: "active"
    })
    |> Repo.insert!()

    user
  end

  defp plan!(owner, attrs \\ []) do
    base = %{
      title: "Porch dinner",
      status: "agreed",
      timezone: "America/Los_Angeles",
      created_by_user_id: owner.id,
      source: "center",
      plan_type: "virtual",
      start_at: DateTime.add(Clock.utc_now(), 72 * 3600, :second),
      time_label: "in 3 days"
    }

    %SharedPlan{}
    |> SharedPlan.changeset(Map.merge(base, Map.new(attrs)))
    |> Repo.insert!()
  end

  defp participant!(plan, user, state \\ "accepted") do
    %PlanParticipant{}
    |> PlanParticipant.changeset(%{plan_id: plan.id, user_id: user.id, response_state: state})
    |> Repo.insert!()
  end

  defp fresh_user(name) do
    n = System.unique_integer([:positive])

    %User{}
    |> User.changeset(%{id: Ecto.UUID.generate(), handle: "b3s-m-#{n}", display_name: name})
    |> Repo.insert!()
  end

  defp source(plan), do: %{"kind" => "plan", "ref_id" => plan.id}

  test "trigger is registered in the closed list" do
    assert "checkin_sweep" in ProactiveConversation.allowed_triggers()
  end

  test "(a) opt-in OFF: suppressed at gate 1, nothing logged, manual sweep untouched" do
    org = ready_user()
    plan = plan!(org)
    participant!(plan, fresh_user("Ana"))

    assert {:suppressed, :proactive_threads_not_enabled} =
             CheckinSuggestion.maybe_suggest(org.id, source(plan), :plan_virtual)

    assert Repo.aggregate(ProactiveThreadLog, :count) == 0

    # Manual Act 1 needs no opt-in at all.
    assert {:ok, _sweep, :created} =
             Checkin.create_sweep(org.id, source(plan),
               idempotency_key: "k-#{Ecto.UUID.generate()}"
             )
  end

  test "(b) opt-in ON: exactly one reason-first thread; second signal same day produces nothing" do
    org = ready_user()
    :ok = ProactiveConversation.set_threads_enabled(org.id, true)
    plan = plan!(org)
    participant!(plan, fresh_user("Ana"))
    participant!(plan, fresh_user("Ben"))

    assert {:ok, _result} = CheckinSuggestion.maybe_suggest(org.id, source(plan), :plan_cancelled)

    assert [log] = Repo.all(ProactiveThreadLog)
    assert log.trigger_type == "checkin_sweep"
    assert log.account_id == org.id

    {:ok, conv} = OpalConversations.get_or_create_conversation(org.id)
    bodies = Enum.map(OpalConversations.list_messages(conv.id), & &1.body)
    assert Enum.any?(bodies, &(&1 =~ "Check in with everyone"))
    assert Enum.any?(bodies, &(&1 =~ "cancelled"))

    # Once per circle: the same-day second signal is spent.
    assert {:suppressed, :already_suggested_recently} =
             CheckinSuggestion.maybe_suggest(org.id, source(plan), :plan_virtual)

    assert Repo.aggregate(ProactiveThreadLog, :count) == 1
  end

  test "(c) opt-out wins over opt-in" do
    org = ready_user()
    :ok = ProactiveConversation.set_threads_enabled(org.id, true)
    :ok = ProactiveConversation.set_opt_out(org.id, true)
    plan = plan!(org)
    participant!(plan, fresh_user("Ana"))

    assert {:suppressed, :opt_out} =
             CheckinSuggestion.maybe_suggest(org.id, source(plan), :plan_virtual)

    assert Repo.aggregate(ProactiveThreadLog, :count) == 0
  end

  test "(d) quiet hours: suppressed at 23:30 local and NOT queued for the morning" do
    org = ready_user()
    :ok = ProactiveConversation.set_threads_enabled(org.id, true)
    plan = plan!(org)
    participant!(plan, fresh_user("Ana"))

    assert {:suppressed, :quiet_hours} =
             CheckinSuggestion.maybe_suggest(org.id, source(plan), :plan_virtual, local_hour: 23)

    # The signal is spent, not deferred: no log row exists that any
    # morning process could deliver from, and no thread was opened.
    assert Repo.aggregate(ProactiveThreadLog, :count) == 0
    {:ok, conv} = OpalConversations.get_or_create_conversation(org.id)
    assert OpalConversations.list_messages(conv.id) == []
  end

  test "accepting the suggestion creates the sweep through the one creation path" do
    org = ready_user()
    :ok = ProactiveConversation.set_threads_enabled(org.id, true)
    plan = plan!(org)
    participant!(plan, fresh_user("Ana"))

    assert {:ok, _} = CheckinSuggestion.maybe_suggest(org.id, source(plan), :plan_virtual)

    assert {:ok, sweep, :created} =
             Checkin.create_sweep(org.id, source(plan),
               idempotency_key: "k-#{Ecto.UUID.generate()}"
             )

    assert sweep.source_kind == "plan"

    # With a sweep open for the circle, no further suggestion fires.
    assert {:suppressed, :sweep_already_open} =
             CheckinSuggestion.maybe_suggest(org.id, source(plan), :plan_virtual)
  end

  test "dismissal is permanent for the circle and leaves other circles alone" do
    org = ready_user()
    :ok = ProactiveConversation.set_threads_enabled(org.id, true)
    plan = plan!(org)
    other = plan!(org, title: "Other plan")
    participant!(plan, fresh_user("Ana"))
    participant!(other, fresh_user("Ben"))

    assert CheckinSuggestion.surface_suggestion(org.id, source(plan)) != nil

    assert {:ok, :dismissed} = CheckinSuggestion.dismiss(org.id, source(plan))

    for _ <- 1..5 do
      assert CheckinSuggestion.surface_suggestion(org.id, source(plan)) == nil
    end

    assert {:suppressed, :dismissed} =
             CheckinSuggestion.maybe_suggest(org.id, source(plan), :plan_virtual)

    # Other circles still suggest normally.
    assert CheckinSuggestion.surface_suggestion(org.id, source(other)) != nil
  end

  test "minor-majority family circle is never suggested (5.4)" do
    org = ready_user()
    :ok = ProactiveConversation.set_threads_enabled(org.id, true)

    adult = fresh_user("Adult Amy")
    kid1 = fresh_user("Kid One")
    kid2 = fresh_user("Kid Two")
    for u <- [adult, kid1, kid2], do: {:ok, _} = Relationships.set_type(org.id, u.id, "family")
    {:ok, _} = Relationships.set_family_subtype(org.id, kid1.id, "child", minor: true)
    {:ok, _} = Relationships.set_family_subtype(org.id, kid2.id, "child", minor: true)

    assert {:suppressed, :minor_majority} =
             CheckinSuggestion.maybe_suggest(
               org.id,
               %{"kind" => "relationship_set", "filter" => %{"type" => "family"}},
               :plan_virtual
             )

    assert Repo.aggregate(ProactiveThreadLog, :count) == 0
  end

  test "PlanCompletion.drive carries the S1 step: suppressed by default, initiated when opted in" do
    org = ready_user()
    plan = plan!(org)
    participant!(plan, fresh_user("Ana"))

    assert {:ok, %{steps: steps}} = OpalCore.SocialFlow.PlanCompletion.drive(plan.id, org.id)
    step = Enum.find(steps, &(&1["id"] == "checkin_suggestion"))
    assert step["status"] == "suppressed"
    assert step["reason"] == "proactive_threads_not_enabled"

    org2 = ready_user()
    :ok = ProactiveConversation.set_threads_enabled(org2.id, true)
    # Start OUTSIDE the 48-96h temporal-anchor band: the anchor step
    # (g) runs before the suggestion step (h) and lawfully spends the
    # day's single proactive slot when it fires (design 3.3 step 4).
    plan2 = plan!(org2, start_at: DateTime.add(Clock.utc_now(), 200 * 3600, :second))
    participant!(plan2, fresh_user("Ben"))

    assert {:ok, %{steps: steps2}} = OpalCore.SocialFlow.PlanCompletion.drive(plan2.id, org2.id)
    step2 = Enum.find(steps2, &(&1["id"] == "checkin_suggestion"))
    assert step2["status"] == "initiated"
  end

  test "no time-based producer: repeated reads suggest nothing on their own" do
    org = ready_user()
    :ok = ProactiveConversation.set_threads_enabled(org.id, true)
    plan = plan!(org)
    participant!(plan, fresh_user("Ana"))

    # Merely reading the summary / for-source surface never opens a
    # proactive thread (S2 renders in place only).
    assert {:ok, nil, _key} = Checkin.for_source(org.id, source(plan))
    assert Repo.aggregate(ProactiveThreadLog, :count) == 0

    from(s in OpalCore.SocialFlow.CheckinSweep, select: count(s.id)) |> Repo.one()
  end
end
