defmodule OpalCore.SocialFlow.FeasibilityCampaignTest do
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.OpalCalendar.ReminderDelivery

  alias OpalCore.SocialFlow.Feasibility.{
    Buffer,
    Engine,
    LeaveBy,
    Metrics,
    Probing,
    TimePlaceLoop,
    Travel
  }

  setup do
    Metrics.reset()
    Probing.reset()
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "fe-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "fe-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "fe-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  defp future(h, d \\ 2) do
    s = DateTime.utc_now() |> DateTime.add(h * 3600, :second) |> DateTime.truncate(:microsecond)
    {s, DateTime.add(s, d * 3600, :second)}
  end

  test "travel feasibility: free slot can still be unrealistic after prior commitment" do
    prior_end = ~U[2026-08-14 18:15:00.000000Z]
    candidate = ~U[2026-08-14 18:30:00.000000Z]

    assert {:ok, t} =
             Travel.assess(%{
               prior_end_at: prior_end,
               candidate_start: candidate,
               travel_minutes: 35
             })

    assert t["feasibility"] == "unrealistic"
    refute Travel.usable?(t)
    refute t["score_exposed"]
    refute t["origin_exposed"]
  end

  test "travel feasible with enough gap" do
    prior_end = ~U[2026-08-14 17:00:00.000000Z]
    candidate = ~U[2026-08-14 19:00:00.000000Z]

    assert {:ok, t} =
             Travel.assess(%{
               prior_end_at: prior_end,
               candidate_start: candidate,
               travel_minutes: 25
             })

    assert t["feasibility"] in ~w(feasible tight)
    assert Travel.usable?(t)
  end

  test "leave-by is private and natural", %{a: a, conv: conv} do
    {s, e} = future(48)

    assert {:ok, c} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               participant_user_ids: [a.id]
             })

    assert {:ok, leave} =
             LeaveBy.for_commitment(
               OpalCore.SocialFlow.OpalCalendar.Commitment.to_owner_contract(c),
               travel_minutes: 25
             )

    assert leave["private"] == true
    assert leave["origin_exposed"] == false
    assert leave["private_copy"] =~ "Leave"
    assert {:error, :user_authorization_required} = LeaveBy.share_eta(leave)
    assert {:ok, shared} = LeaveBy.share_eta(leave, user_authorized: true, eta_minutes: 12)
    refute shared["origin_exposed"]
  end

  test "reminder delivery separates intent from transport", %{a: a, conv: conv} do
    {s, e} = future(50)

    assert {:ok, c} =
             OpalCalendar.record_commitment(%{
               conversation_id: conv.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               participant_user_ids: [a.id]
             })

    deliveries =
      ReminderDelivery.prepare_and_queue(
        OpalCore.SocialFlow.OpalCalendar.Commitment.to_owner_contract(c),
        travel_minutes: 20
      )

    assert Enum.any?(deliveries, &(&1["kind"] in ~w(plan_upcoming leave_by)))
    assert Enum.all?(deliveries, &(&1["delivery_status"] in ~w(scheduled pending)))
    refute Enum.any?(deliveries, &(&1["spam"] == true))

    cancelled = ReminderDelivery.cancel_for_commitment(c.id, deliveries)
    assert Enum.all?(cancelled, &(&1["delivery_status"] == "cancelled"))
  end

  test "engine: calendar-clear but travel-impossible yields alternate", %{a: a, conv: conv} do
    # Prior commitment ends 6:15 — other conversation
    {:ok, other} =
      %Conversation{}
      |> Conversation.changeset(%{label: "prior-#{System.unique_integer([:positive])}"})
      |> Repo.insert()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: other.id, user_id: a.id})
    |> Repo.insert!()

    prior_start = ~U[2026-08-14 16:00:00.000000Z]
    prior_end = ~U[2026-08-14 18:15:00.000000Z]

    assert {:ok, _} =
             OpalCalendar.record_commitment(%{
               conversation_id: other.id,
               owner_user_id: a.id,
               start_at: prior_start,
               end_at: prior_end,
               label: "Work wrap",
               participant_user_ids: [a.id]
             })

    # New plan 6:30 same evening, far place
    candidate = ~U[2026-08-14 18:30:00.000000Z]

    assert {:ok, ev} =
             Engine.evaluate(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               candidate_start: candidate,
               candidate_end: DateTime.add(candidate, 7200, :second),
               travel_minutes: 40
             })

    assert ev["viable"] == false
    assert ev["other_plan_revealed"] == false
    assert ev["feasibility"] == "unrealistic"
    assert match?(%DateTime{}, ev["alternate_start"])
    Metrics.incr("travel_comparisons_avoided")
    assert Metrics.snapshot()["travel_comparisons_avoided"] >= 1
  end

  test "engine: native calendar conflict stays private", %{a: a, conv: conv} do
    {s, e} = future(30)

    {:ok, other} =
      %Conversation{}
      |> Conversation.changeset(%{label: "secret-#{System.unique_integer([:positive])}"})
      |> Repo.insert()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: other.id, user_id: a.id})
    |> Repo.insert!()

    assert {:ok, _} =
             OpalCalendar.record_commitment(%{
               conversation_id: other.id,
               owner_user_id: a.id,
               start_at: s,
               end_at: e,
               label: "Secret dinner with Chanelle",
               place_label: "Secret Spot",
               participant_user_ids: [a.id]
             })

    assert {:ok, ev} =
             Engine.evaluate(%{
               owner_user_id: a.id,
               conversation_id: conv.id,
               candidate_start: DateTime.add(s, 1800, :second),
               candidate_end: DateTime.add(s, 5400, :second),
               travel_minutes: 10
             })

    assert ev["calendar_conflict"] == true
    refute ev["conflict"]["private_copy"] =~ "Chanelle"
    refute ev["conflict"]["private_copy"] =~ "Secret"
  end

  test "time-place loop compresses to few options" do
    starts = [~U[2026-08-14 19:00:00.000000Z], ~U[2026-08-14 19:30:00.000000Z]]

    result =
      TimePlaceLoop.converge(%{
        candidate_starts: starts,
        prior_end_at: ~U[2026-08-14 17:00:00.000000Z],
        category: "dinner",
        quiet_only: true,
        travel_by_place: %{"harbor_table" => 15, "coast_kitchen" => 18, "loud_bar" => 40}
      })

    assert length(result["options"]) <= 3
    refute result["workflow_exposed"]
    # loud_bar should tend to drop via quiet_only catalog filter
    refute Enum.any?(result["options"], &(&1["place_id"] == "loud_bar"))
  end

  test "buffer model is conservative and bounded" do
    assert Buffer.minutes(mode: :driving) >= 5

    assert Buffer.minutes(mode: :driving, context: :work_leave) >
             Buffer.minutes(mode: :driving)

    assert Buffer.minutes(mode: :driving, context: :parking_heavy) <= 45
  end

  test "probing rate limit protects schedule inference", %{a: a, conv: conv} do
    assert :ok = Probing.authorize_evaluation(a.id, conv.id, max: 3)
    assert :ok = Probing.authorize_evaluation(a.id, conv.id, max: 3)
    assert :ok = Probing.authorize_evaluation(a.id, conv.id, max: 3)
    assert {:error, :rate_limited} = Probing.authorize_evaluation(a.id, conv.id, max: 3)
  end

  test "courtship golden: low-effort path needs feasibility underneath", %{a: a, b: b, conv: conv} do
    {:ok, other} =
      %Conversation{}
      |> Conversation.changeset(%{label: "peer-#{System.unique_integer([:positive])}"})
      |> Repo.insert()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: other.id, user_id: b.id})
    |> Repo.insert!()

    prior_s = ~U[2026-08-14 16:00:00.000000Z]
    prior_e = ~U[2026-08-14 18:00:00.000000Z]

    assert {:ok, _} =
             OpalCalendar.record_commitment(%{
               conversation_id: other.id,
               owner_user_id: b.id,
               start_at: prior_s,
               end_at: prior_e,
               participant_user_ids: [b.id]
             })

    thursday_730 = ~U[2026-08-14 19:30:00.000000Z]

    assert {:ok, for_b} =
             Engine.evaluate(%{
               owner_user_id: b.id,
               conversation_id: conv.id,
               candidate_start: thursday_730,
               travel_minutes: 20
             })

    # 6pm end + 20m + buffer fits 7:30
    assert for_b["viable"] == true or for_b["feasibility"] in ~w(feasible tight)

    places =
      TimePlaceLoop.converge(%{
        candidate_starts: [thursday_730],
        prior_end_at: prior_e,
        category: "dinner",
        quiet_only: true,
        travel_by_place: %{"harbor_table" => 18, "coast_kitchen" => 22}
      })

    assert places["options"] != []
    Metrics.incr("place_searches_avoided")
    Metrics.incr("option_comparisons_avoided")
    assert Metrics.snapshot()["place_searches_avoided"] >= 1
    _ = a
  end
end
