defmodule OpalCore.SocialFlow.OpalCalendarTest do
  @moduledoc "Native Opal calendar — canonical schedule without Google."
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{Availability, OpalCalendar, SharedPlan, PlanParticipant}
  alias OpalCore.SocialFlow.OpalCalendar.{Reminders, ScheduleKnowledge}
  alias OpalCore.SocialFlow.RealWorld.CalendarSufficiency
  alias OpalCore.SocialFlow.RealWorld.Calendar.FreeBusyStore

  setup do
    FreeBusyStore.reset()
    Application.put_env(:opal_core, :external_calendar_enabled, false)
    on_exit(fn -> Application.put_env(:opal_core, :external_calendar_enabled, true) end)

    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "nc-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "nc-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "nc-#{uid}"})
      |> Repo.insert()

    {:ok, conv2} =
      %Conversation{}
      |> Conversation.changeset(%{label: "nc2-#{uid}"})
      |> Repo.insert()

    for {c, users} <- [{conv, [a, b]}, {conv2, [a]}] do
      for u <- users do
        %ConversationMember{}
        |> ConversationMember.changeset(%{conversation_id: c.id, user_id: u.id})
        |> Repo.insert!()
      end
    end

    %{a: a, b: b, conv: conv, conv2: conv2}
  end

  defp future(hours, dur \\ 2) do
    s =
      DateTime.utc_now()
      |> DateTime.add(hours * 3600, :second)
      |> DateTime.truncate(:microsecond)

    {s, DateTime.add(s, dur * 3600, :second)}
  end

  test "Set-like plan projects native commitments without Google", %{a: a, b: b, conv: conv} do
    {s, e} = future(48)

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Dinner",
        status: "agreed",
        time_label: "Thursday · 7:00 PM",
        timezone: "America/Los_Angeles",
        start_at: s,
        end_at: e,
        location: "Harbor Table",
        created_by_user_id: a.id
      })
      |> Repo.insert()

    for u <- [a, b] do
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        plan_id: plan.id,
        user_id: u.id,
        role: "participant",
        response_state: "accepted"
      })
      |> Repo.insert!()
    end

    assert {:ok, commitments} = OpalCalendar.project_from_shared_plan(plan)
    assert length(commitments) == 2
    assert Enum.all?(commitments, &(&1.status == "active"))
    refute OpalCalendar.authorizes_set?()

    mine = OpalCalendar.list_mine(a.id)
    assert length(mine) == 1
    assert hd(mine)["place_label"] == "Harbor Table"
  end

  test "native busy blocks fusion without external calendar", %{a: a, conv: conv} do
    {s, e} = future(24)

    assert {:ok, _} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               timezone: "UTC",
               label: "Dinner",
               participant_user_ids: [a.id]
             })

    # External disabled — still detects Opal busy
    enrich =
      CalendarSufficiency.enrich_facts(
        a.id,
        %{has_fresh_windows: false},
        candidate_start: DateTime.add(s, 30 * 60, :second),
        candidate_end: DateTime.add(s, 90 * 60, :second),
        willingness: "willing"
      )

    assert enrich.calendar.opal_busy == true
    assert enrich.calendar.calendar_free_for_candidate == false
    assert enrich.google_required == false
    assert enrich.conflict["reveals_other_plan"] == false
    assert enrich.conflict["private_copy"] =~ "conflicts"
  end

  test "privacy: other conversation never learns who/what/where", %{
    a: a,
    conv: conv,
    conv2: conv2
  } do
    {s, e} = future(30)

    assert {:ok, _} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               label: "Dinner with secret friend",
               place_label: "Secret Place",
               participant_user_ids: [a.id]
             })

    g =
      OpalCalendar.private_conflict_guidance(a.id, s, e, exclude_conversation_id: conv2.id)

    assert g["conflicts"] == true
    refute g["private_copy"] =~ "secret"
    refute g["private_copy"] =~ "Secret"
    assert g["peer_safe_copy"] == nil
  end

  test "reschedule supersedes prior version", %{a: a, conv: conv} do
    {s1, e1} = future(40)
    {s2, e2} = future(64)

    assert {:ok, c1} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s1,
               end_at: e1,
               plan_version: 1,
               participant_user_ids: [a.id]
             })

    assert {:ok, c2} = OpalCalendar.reschedule(c1.id, %{start_at: s2, end_at: e2})
    assert c2.plan_version == 2
    assert c2.status == "active"
    reloaded = Repo.get(OpalCore.SocialFlow.OpalCalendar.Commitment, c1.id)
    assert reloaded.status == "superseded"
    assert reloaded.superseded_by_id == c2.id
  end

  test "cancel plan commitments", %{a: a, conv: conv} do
    {s, e} = future(50)

    assert {:ok, c} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               shared_plan_id: nil,
               participant_user_ids: [a.id]
             })

    assert {:ok, cancelled} = OpalCalendar.cancel(c.id)
    assert cancelled.status == "cancelled"
    refute OpalCalendar.conflicts?(a.id, s, e)
  end

  test "empty Opal calendar is not willingness", %{a: a} do
    enrich =
      CalendarSufficiency.enrich_facts(
        a.id,
        %{has_fresh_windows: false},
        candidate_start: elem(future(10), 0),
        candidate_end: elem(future(10), 1),
        willingness: "unknown"
      )

    # No Opal commitment + external off + no manual → not free capacity
    assert enrich.calendar.calendar_free_for_candidate == false
    assert enrich.google_required == false
  end

  test "schedule knowledge priority places Opal above external" do
    assert ScheduleKnowledge.rank(:opal_calendar_commitment) >
             ScheduleKnowledge.rank(:external_free_busy)

    assert ScheduleKnowledge.rank(:explicit_correction) >
             ScheduleKnowledge.rank(:opal_calendar_commitment)
  end

  test "reminders do not require Google", %{a: a, conv: conv} do
    {s, e} = future(72)

    assert {:ok, c} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               participant_user_ids: [a.id]
             })

    intents =
      Reminders.prepare_for_commitment(
        OpalCore.SocialFlow.OpalCalendar.Commitment.to_owner_contract(c),
        travel_minutes: 25
      )

    assert Enum.any?(intents, &(&1["kind"] == "plan_upcoming"))
    assert Enum.any?(intents, &(&1["kind"] == "leave_by"))
    assert Enum.all?(intents, &(&1["visibility"] == "private"))
  end

  test "resolve_intervention works with native busy, Google off", %{a: a, conv: conv} do
    {s, e} = future(20)

    assert {:ok, _} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               participant_user_ids: [a.id]
             })

    assert {:ok, i} =
             Availability.resolve_intervention(conv.id, a.id,
               candidate_start: s,
               candidate_end: e,
               willingness: "willing"
             )

    # Authoritative path still returns; may be no_useful or other when blocked by busy
    assert i["authorizes_set"] == false
    assert is_binary(i["decision"])
  end
end
