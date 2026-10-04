defmodule OpalCore.TripsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips
  alias OpalCore.Trips.Trip
  alias OpalCore.Trips.TripLeg

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()

  test "create_trip / get_trip / list_trips_for_user" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "Big Sur weekend",
               destination_label: "Big Sur",
               starts_on: ~D[2026-11-14],
               ends_on: ~D[2026-11-16]
             })

    assert trip.title == "Big Sur weekend"
    assert trip.destination_label == "Big Sur"
    assert trip.created_by_user_id == alex()
    assert trip.legs == []

    assert {:ok, loaded} = Trips.get_trip(trip.id)
    assert loaded.id == trip.id
    assert loaded.legs == []

    assert {:ok, list} = Trips.list_trips_for_user(alex())
    assert Enum.any?(list, &(&1.id == trip.id))

    assert {:ok, other} = Trips.list_trips_for_user(jordan())
    refute Enum.any?(other, &(&1.id == trip.id))
  end

  test "zero-leg trip is valid (planning phase)" do
    assert {:ok, trip} = Trips.create_trip(alex(), %{title: "Someday trip"})
    assert trip.legs == []
    assert is_nil(trip.destination_label) or trip.destination_label == nil
  end

  test "add_leg appends in order at max(position)+1" do
    assert {:ok, trip} = Trips.create_trip(alex(), %{title: "Coast run"})

    assert {:ok, leg0} =
             Trips.add_leg(trip.id, %{
               "leg_type" => "transit",
               "place_label" => "Drive north"
             })

    assert {:ok, leg1} =
             Trips.add_leg(trip.id, %{
               leg_type: "lodging",
               place_label: "Cabin"
             })

    assert {:ok, leg2} =
             Trips.add_leg(trip.id, %{
               leg_type: "meal",
               place_label: "Dinner in town"
             })

    assert leg0.position == 0
    assert leg1.position == 1
    assert leg2.position == 2
    assert is_nil(leg0.place_ref)

    assert {:ok, loaded} = Trips.get_trip(trip.id)
    assert Enum.map(loaded.legs, & &1.id) == [leg0.id, leg1.id, leg2.id]
    assert Enum.map(loaded.legs, & &1.position) == [0, 1, 2]
  end

  test "reorder_legs rewrites positions atomically" do
    assert {:ok, trip} = Trips.create_trip(alex(), %{title: "Reorder me"})

    assert {:ok, a} = Trips.add_leg(trip.id, %{leg_type: "activity", place_label: "A"})
    assert {:ok, b} = Trips.add_leg(trip.id, %{leg_type: "activity", place_label: "B"})
    assert {:ok, c} = Trips.add_leg(trip.id, %{leg_type: "activity", place_label: "C"})

    assert {:ok, reordered} = Trips.reorder_legs(trip.id, [c.id, a.id, b.id])
    assert Enum.map(reordered.legs, & &1.id) == [c.id, a.id, b.id]
    assert Enum.map(reordered.legs, & &1.position) == [0, 1, 2]

    assert Repo.get!(TripLeg, c.id).position == 0
    assert Repo.get!(TripLeg, a.id).position == 1
    assert Repo.get!(TripLeg, b.id).position == 2
  end

  test "remove_leg deletes the row" do
    assert {:ok, trip} = Trips.create_trip(alex(), %{title: "Trim"})
    assert {:ok, keep} = Trips.add_leg(trip.id, %{leg_type: "lodging", place_label: "Stay"})
    assert {:ok, drop} = Trips.add_leg(trip.id, %{leg_type: "meal", place_label: "Drop"})

    assert {:ok, deleted} = Trips.remove_leg(trip.id, drop.id)
    assert deleted.id == drop.id
    assert is_nil(Repo.get(TripLeg, drop.id))

    assert {:ok, loaded} = Trips.get_trip(trip.id)
    assert Enum.map(loaded.legs, & &1.id) == [keep.id]
  end

  test "leg may link to an existing SharedPlan (reuse, don't duplicate)" do
    assert {:ok, plan} =
             %SharedPlan{}
             |> SharedPlan.changeset(%{
               conversation_id: Fixtures.conv_alex_jordan_id(),
               title: "Dinner at Fort Oak",
               status: "agreed",
               timezone: "America/Los_Angeles",
               created_by_user_id: alex(),
               location: "Fort Oak"
             })
             |> Repo.insert()

    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "Weekend with dinner",
               destination_label: "North Park"
             })

    assert {:ok, leg} =
             Trips.add_leg(trip.id, %{
               leg_type: "meal",
               place_label: "Fort Oak",
               place_ref: nil
             })

    assert is_nil(leg.shared_plan_id)

    assert {:ok, linked} = Trips.link_leg_plan(trip.id, leg.id, plan.id, alex())
    assert linked.shared_plan_id == plan.id
    assert Repo.get!(SharedPlan, plan.id).title == "Dinner at Fort Oak"
  end

  test "invalid attrs return {:error, changeset} and do not crash" do
    assert {:error, %Ecto.Changeset{} = cs} = Trips.create_trip(alex(), %{title: ""})
    assert cs.errors[:title]

    assert {:error, %Ecto.Changeset{} = cs2} =
             Trips.create_trip(alex(), %{
               title: "Bad dates",
               starts_on: ~D[2026-12-10],
               ends_on: ~D[2026-12-01]
             })

    assert cs2.errors[:ends_on]

    assert {:ok, trip} = Trips.create_trip(alex(), %{title: "Valid"})

    assert {:error, %Ecto.Changeset{} = cs3} =
             Trips.add_leg(trip.id, %{leg_type: "spaceship", place_label: "Mars"})

    assert cs3.errors[:leg_type]

    assert {:error, :not_found} = Trips.get_trip(Ecto.UUID.generate())
    assert {:error, :not_found} = Trips.add_leg(Ecto.UUID.generate(), %{leg_type: "meal", place_label: "X"})
    assert {:error, :not_found} = Trips.remove_leg(trip.id, Ecto.UUID.generate())

    assert {:ok, a} = Trips.add_leg(trip.id, %{leg_type: "meal", place_label: "A"})
    assert {:ok, b} = Trips.add_leg(trip.id, %{leg_type: "meal", place_label: "B"})
    # Incomplete list must error (must list every leg exactly once)
    assert {:error, %Ecto.Changeset{}} = Trips.reorder_legs(trip.id, [a.id])
    assert {:error, %Ecto.Changeset{}} = Trips.reorder_legs(trip.id, [a.id, a.id])
    _ = b
  end

  test "no *_score fields on trip or leg schemas" do
    trip_fields = Trip.__schema__(:fields)
    leg_fields = TripLeg.__schema__(:fields)

    refute Enum.any?(trip_fields, fn f -> String.ends_with?(Atom.to_string(f), "_score") end)
    refute Enum.any?(leg_fields, fn f -> String.ends_with?(Atom.to_string(f), "_score") end)
  end
end
