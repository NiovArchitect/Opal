defmodule OpalCore.TripsConvoyTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Trips
  alias OpalCore.Trips.Convoy

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()

  test "opt-in required before ping; roster shows place labels + geometric ETA" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "CDMX convoy",
               destination_label: "Mexico City",
               user_ids: [jordan()]
             })

    assert {:error, :not_sharing} =
             Convoy.ping(trip.id, alex(), %{"place_label" => "Museo Frida Kahlo"})

    assert {:ok, _} = Convoy.opt_in(trip.id, alex())
    assert {:ok, _} = Convoy.opt_in(trip.id, jordan())

    assert {:ok, _} =
             Convoy.ping(trip.id, alex(), %{
               "place_label" => "Museo Frida Kahlo",
               "lat" => 19.355,
               "lng" => -99.162
             })

    assert {:ok, _} =
             Convoy.ping(trip.id, jordan(), %{
               "place_label" => "Contramar",
               "lat" => 19.419,
               "lng" => -99.165
             })

    assert {:ok, roster} = Convoy.roster(trip.id, alex())
    assert roster["sharing"] == true
    assert length(roster["members"]) == 2
    assert Enum.any?(roster["members"], &String.contains?(&1["eta_note"] || "", "min geometric"))

    assert {:ok, _} = Convoy.opt_out(trip.id, jordan())
    assert {:ok, roster2} = Convoy.roster(trip.id, alex())
    assert length(roster2["members"]) == 1
  end
end
