defmodule OpalCore.TripsCreatePlanTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()

  test "create_plan_from_leg creates tentative plan + pending participants + links leg" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "Coast weekend",
               user_ids: [jordan()]
             })

    assert {:ok, leg} =
             Trips.add_leg(trip.id, %{
               leg_type: "meal",
               place_label: "Dinner Friday",
               starts_on: ~D[2026-11-14],
               ends_on: ~D[2026-11-14]
             })

    assert {:ok, :created, plan, participants, linked_leg} =
             Trips.create_plan_from_leg(trip.id, leg.id, alex())

    assert plan.title == "Dinner Friday"
    assert plan.location == "Dinner Friday"
    assert plan.status == "tentative"
    assert plan.source == "trip_leg"
    assert plan.trip_leg_id == leg.id
    assert is_nil(plan.conversation_id)
    assert linked_leg.shared_plan_id == plan.id
    assert length(participants) == 2
    assert Enum.all?(participants, &(&1.response_state == "pending"))

    assert {:ok, :existing, same, _, _} =
             Trips.create_plan_from_leg(trip.id, leg.id, alex())

    assert same.id == plan.id
    assert Repo.aggregate(SharedPlan, :count, :id) >= 1

    assert {:ok, going} = JourneyAuthority.accept_going(plan.id, alex())
    assert going["response_state"] == "accepted"
    assert Repo.get_by!(PlanParticipant, plan_id: plan.id, user_id: alex()).response_state ==
             "accepted"
  end

  test "non-member create_plan_from_leg → :not_found" do
    assert {:ok, trip} = Trips.create_trip(alex(), %{title: "Private"})
    assert {:ok, leg} = Trips.add_leg(trip.id, %{leg_type: "meal", place_label: "X"})

    assert {:error, :not_found} = Trips.create_plan_from_leg(trip.id, leg.id, jordan())
  end

  test "conversation SharedPlan changeset still requires conversation_id" do
    cs =
      SharedPlan.changeset(%SharedPlan{}, %{
        title: "Need conv",
        status: "tentative",
        timezone: "UTC",
        created_by_user_id: alex(),
        source: "conversation"
      })

    refute cs.valid?
    assert cs.errors[:conversation_id]
  end
end
