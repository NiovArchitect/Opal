defmodule OpalCore.Trips.TripBookendsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.Trips
  alias OpalCore.Trips.TripBookends

  setup do
    user =
      %User{}
      |> User.changeset(%{
        handle: "trip-#{System.unique_integer([:positive])}",
        display_name: "Tripper"
      })
      |> Repo.insert!()

    %{user: user}
  end

  test "templates render countdown / logistics / tomorrow / memory slots" do
    c7 = TripBookends.render_card(:countdown_7, %{destination: "Mexico City", days: 7, teaser_kind: :venue})
    assert c7.title =~ "7 days until Mexico City"
    assert c7.tier == :low

    c3 = TripBookends.render_card(:logistics_3, %{destination: "Mexico City", confirmed_count: 2, open_count: 1})
    assert c3.title =~ "3 days"
    assert c3.body =~ "confirmed"

    c1 = TripBookends.render_card(:tomorrow_1, %{destination: "Mexico City", day1_plan: "Centro", meetup: "Lobby"})
    assert c1.title =~ "Tomorrow"
    assert c1.tier == :urgent

    mem = TripBookends.render_card(:memory, %{destination: "Mexico City", highlights: ["Tacos", "Chapultepec"]})
    assert mem.title =~ "Remember Mexico City"
    assert mem.body =~ "Add your photos"
    assert mem.someday_seed =~ "someday"
  end

  test "process_trip with manipulated starts_on=today+7 sends countdown", %{user: user} do
    today = Date.utc_today()
    starts = Date.add(today, 7)
    ends = Date.add(today, 10)

    assert {:ok, trip} =
             Trips.create_trip(user.id, %{
               "title" => "Mexico City",
               "destination_label" => "Mexico City",
               "starts_on" => starts,
               "ends_on" => ends
             })

    assert {:ok, n} = TripBookends.process_trip(trip, today)
    assert n >= 1

    # Idempotent — second pass sends 0
    assert {:ok, 0} = TripBookends.process_trip(trip, today)
  end

  test "process_trip memory 3 days after ends_on", %{user: user} do
    today = Date.utc_today()
    starts = Date.add(today, -10)
    ends = Date.add(today, -3)

    assert {:ok, trip} =
             Trips.create_trip(user.id, %{
               "title" => "Mexico City",
               "destination_label" => "Mexico City",
               "starts_on" => starts,
               "ends_on" => ends
             })

    assert {:ok, n} = TripBookends.process_trip(trip, today)
    assert n >= 1
  end
end
