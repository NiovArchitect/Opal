defmodule OpalCore.SocialFlow.TemporalHabitMinerTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    MemoryCandidate,
    PlanParticipant,
    SharedPlan,
    TemporalHabitMiner
  }

  # Test env ships utc-only TZ DB; wall clocks are stored as UTC and plan.timezone
  # is UTC so classification matches AvailabilityComposition daypart windows.
  @tz "UTC"

  setup do
    user = user("p5b")
    conv = solo_conv(user)
    {:ok, user: user, conv: conv}
  end

  test "8 agreed Friday-evening plans → prefers:friday_evening candidate", %{
    user: user,
    conv: conv
  } do
    # Eight Fridays at 19:00 local (evening window 17–21)
    fridays = [
      ~D[2026-01-02],
      ~D[2026-01-09],
      ~D[2026-01-16],
      ~D[2026-01-23],
      ~D[2026-01-30],
      ~D[2026-02-06],
      ~D[2026-02-13],
      ~D[2026-02-20]
    ]

    for date <- fridays do
      insert_plan!(conv, user, %{
        status: "agreed",
        start_at: local_utc(date, 19, 0),
        title: "Friday dinner"
      })
    end

    result = TemporalHabitMiner.mine(user.id)
    assert is_map(result)
    assert result.plan_count == 8
    assert result.submitted >= 1

    prefers =
      Enum.find(result.patterns, fn p ->
        p.kind == :prefers and p.value_key == "temporal:prefers:friday_evening"
      end)

    assert prefers
    assert prefers.count == 8
    assert prefers.share == 1.0

    cand = find_candidate(user.id, "temporal:prefers:friday_evening")
    assert cand
    assert cand.memory_class == "recurring_routine"
    assert cand.source_type == "temporal_miner"
    assert cand.evidence_kind == "repeated_behavior"
    assert cand.candidate_summary == "temporal:prefers:friday_evening"
    assert cand.value_key == "recurring_routine:temporal_prefers_friday_evening"
    assert cand.context_dims["conceptual_value_key"] == "temporal:prefers:friday_evening"
    assert cand.context_dims["source"] == "temporal_miner"
  end

  test "12 plans, zero mornings → avoids:morning candidate", %{user: user, conv: conv} do
    # Spread across weekdays, all evening (17–21) — no mornings
    dates = [
      ~D[2026-03-02],
      ~D[2026-03-03],
      ~D[2026-03-04],
      ~D[2026-03-05],
      ~D[2026-03-06],
      ~D[2026-03-07],
      ~D[2026-03-08],
      ~D[2026-03-09],
      ~D[2026-03-10],
      ~D[2026-03-11],
      ~D[2026-03-12],
      ~D[2026-03-13]
    ]

    for date <- dates do
      insert_plan!(conv, user, %{
        status: "agreed",
        start_at: local_utc(date, 18, 30),
        title: "Evening hang"
      })
    end

    result = TemporalHabitMiner.mine(user.id)
    assert result.plan_count == 12

    avoids_morning =
      Enum.find(result.patterns, fn p ->
        p.kind == :avoids and p.value_key == "temporal:avoids:morning"
      end)

    assert avoids_morning

    cand = find_candidate(user.id, "temporal:avoids:morning")
    assert cand
    assert cand.memory_class == "recurring_routine"
    assert cand.candidate_summary == "temporal:avoids:morning"
    assert cand.value_key == "recurring_routine:temporal_avoids_morning"
  end

  test "3 plans → :insufficient_data, zero candidates", %{user: user, conv: conv} do
    for i <- 1..3 do
      insert_plan!(conv, user, %{
        status: "agreed",
        start_at: local_utc(~D[2026-04-03], 19, i),
        title: "Thin #{i}"
      })
    end

    assert TemporalHabitMiner.mine(user.id) == :insufficient_data
    assert miner_candidate_count(user.id) == 0
  end

  test "re-mine → no duplicates", %{user: user, conv: conv} do
    for date <- [
          ~D[2026-05-01],
          ~D[2026-05-08],
          ~D[2026-05-15],
          ~D[2026-05-22],
          ~D[2026-05-29],
          ~D[2026-06-05],
          ~D[2026-06-12],
          ~D[2026-06-19]
        ] do
      insert_plan!(conv, user, %{
        status: "completed",
        start_at: local_utc(date, 19, 0),
        title: "Friday again"
      })
    end

    first = TemporalHabitMiner.mine(user.id)
    assert first.submitted >= 1
    count1 = miner_candidate_count(user.id)

    second = TemporalHabitMiner.mine(user.id)
    assert second.submitted == 0
    assert Enum.all?(second.results, &(&1.status == :skipped and &1.reason == :idempotent))
    assert miner_candidate_count(user.id) == count1
  end

  test "cancelled plans excluded from counts", %{user: user, conv: conv} do
    # 3 agreed Friday evenings + 8 cancelled Friday evenings → still insufficient
    for date <- [~D[2026-07-03], ~D[2026-07-10], ~D[2026-07-17]] do
      insert_plan!(conv, user, %{
        status: "agreed",
        start_at: local_utc(date, 19, 0),
        title: "Real Friday"
      })
    end

    for date <- [
          ~D[2026-07-24],
          ~D[2026-07-31],
          ~D[2026-08-07],
          ~D[2026-08-14],
          ~D[2026-08-21],
          ~D[2026-08-28],
          ~D[2026-09-04],
          ~D[2026-09-11]
        ] do
      insert_plan!(conv, user, %{
        status: "cancelled",
        start_at: local_utc(date, 19, 0),
        title: "Cancelled Friday",
        cancelled_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
    end

    # Also exclude tentative / changed
    insert_plan!(conv, user, %{
      status: "tentative",
      start_at: local_utc(~D[2026-09-18], 19, 0),
      title: "Maybe"
    })

    insert_plan!(conv, user, %{
      status: "changed",
      start_at: local_utc(~D[2026-09-25], 19, 0),
      title: "Changed"
    })

    assert TemporalHabitMiner.mine(user.id) == :insufficient_data
    assert miner_candidate_count(user.id) == 0
  end

  test "daypart classification reuses AvailabilityComposition windows", %{
    user: user,
    conv: conv
  } do
    # 10:00 local → morning (8–12); 14:00 → afternoon; 19:00 → evening; 22:00 → night
    plan_m =
      insert_plan!(conv, user, %{status: "agreed", start_at: local_utc(~D[2026-10-05], 10, 0)})

    plan_a =
      insert_plan!(conv, user, %{status: "agreed", start_at: local_utc(~D[2026-10-05], 14, 0)})

    plan_e =
      insert_plan!(conv, user, %{status: "agreed", start_at: local_utc(~D[2026-10-05], 19, 0)})

    plan_n =
      insert_plan!(conv, user, %{status: "agreed", start_at: local_utc(~D[2026-10-05], 22, 0)})

    assert TemporalHabitMiner.classify_sample(plan_m).daypart == "morning"
    assert TemporalHabitMiner.classify_sample(plan_a).daypart == "afternoon"
    assert TemporalHabitMiner.classify_sample(plan_e).daypart == "evening"
    assert TemporalHabitMiner.classify_sample(plan_n).daypart == "night"
  end

  # --- helpers ---

  defp find_candidate(owner_id, conceptual_key) do
    value_key = "recurring_routine:" <> slug(conceptual_key)

    from(c in MemoryCandidate,
      where: c.owner_user_id == ^owner_id,
      where: c.value_key == ^value_key,
      where: c.source_type == "temporal_miner"
    )
    |> Repo.one()
  end

  defp miner_candidate_count(owner_id) do
    from(c in MemoryCandidate,
      where: c.owner_user_id == ^owner_id,
      where: c.source_type == "temporal_miner"
    )
    |> Repo.aggregate(:count)
  end

  defp insert_plan!(conv, user, attrs) do
    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: attrs[:title] || "Plan",
        status: attrs[:status],
        timezone: @tz,
        start_at: attrs[:start_at],
        created_by_user_id: user.id,
        cancelled_at: attrs[:cancelled_at]
      })
      |> Repo.insert!()

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %PlanParticipant{}
    |> PlanParticipant.changeset(%{
      plan_id: plan.id,
      user_id: user.id,
      role: "lead",
      response_state: "accepted",
      responded_at: now,
      authority_source: "user_action"
    })
    |> Repo.insert!()

    plan
  end

  defp local_utc(%Date{} = date, hour, minute) do
    %DateTime{
      year: date.year,
      month: date.month,
      day: date.day,
      hour: hour,
      minute: minute,
      second: 0,
      microsecond: {0, 6},
      time_zone: "Etc/UTC",
      zone_abbr: "UTC",
      utc_offset: 0,
      std_offset: 0
    }
  end

  defp user(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp solo_conv(user) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "p5b-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
    |> Repo.insert!()

    conv
  end

  defp slug(s) do
    s
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/, "_")
    |> String.trim("_")
  end
end
