defmodule OpalCore.TripsCanvasTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Trips
  alias OpalCore.Trips.DestinationPacks

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp maya, do: Fixtures.user_maya_id()
  defp taylor, do: Fixtures.user_taylor_id()

  test "Mexico City destination pack has real venues (no placeholder table)" do
    assert {:ok, pack} = DestinationPacks.lookup("Mexico City")
    names = Enum.map(pack["entries"], & &1["name"])
    assert "Pujol" in names
    assert "Contramar" in names
    assert "Quintonil" in names
    refute Enum.any?(names, &Regex.match?(~r/table for four/i, &1))
  end

  test "canvas: day → loose block → activity → subgroup responses" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "CDMX with the crew",
               destination_label: "Mexico City",
               user_ids: [jordan(), maya(), taylor()],
               starts_on: ~D[2026-11-12],
               ends_on: ~D[2026-11-15]
             })

    assert {:ok, day} =
             Trips.add_day(trip.id, %{
               "label" => "Fri",
               "on_date" => ~D[2026-11-13]
             })

    assert day.day_index == 0

    assert {:ok, block} =
             Trips.add_time_block(trip.id, day.id, %{
               "slot" => "evening",
               "time_label" => "7:30",
               "block_kind" => "meal",
               "title" => "Together dinner"
             })

    assert block.time_label == "7:30"

    assert {:ok, activity} =
             Trips.add_activity(trip.id, block.id, %{
               "venue_name" => "Pujol",
               "venue_area" => "Polanco",
               "activity_kind" => "meal",
               "vibe_tags" => ["fine_dining", "together"]
             })

    assert {:error, cs} =
             Trips.add_activity(trip.id, block.id, %{
               "venue_name" => "Table for four",
               "activity_kind" => "meal"
             })

    assert %{venue_name: _} = errors_on(cs)

    assert {:ok, _} = Trips.set_activity_response(trip.id, activity.id, alex(), "in")
    assert {:ok, _} = Trips.set_activity_response(trip.id, activity.id, maya(), "interested")
    assert {:ok, _} = Trips.set_activity_response(trip.id, activity.id, jordan(), "passed")

    assert {:ok, loaded} = Trips.get_trip(trip.id)
    contract = Trips.to_contract(loaded)
    assert length(contract["days"]) == 1
    [day_c] = contract["days"]
    [block_c] = day_c["time_blocks"]
    [act_c] = block_c["activities"]
    assert act_c["venue_name"] == "Pujol"
    assert alex() in act_c["whos_in"]
    assert maya() in act_c["interested"]
    assert jordan() in act_c["passed"]
  end

  test "seed_mexico_city_canvas: 4 days, free blocks, real venues, subgroups" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "Mexico City · crew",
               destination_label: "Mexico City",
               user_ids: [jordan(), maya(), taylor()]
             })

    assert {:ok, seeded} =
             Trips.seed_mexico_city_canvas(trip.id, [
               alex(),
               jordan(),
               maya(),
               taylor()
             ])

    contract = Trips.to_contract(seeded)
    assert length(contract["days"]) == 4

    free_blocks =
      for day <- contract["days"],
          block <- day["time_blocks"],
          block["block_kind"] == "free",
          do: block

    assert length(free_blocks) >= 2

    venues =
      for day <- contract["days"],
          block <- day["time_blocks"],
          act <- block["activities"],
          do: act["venue_name"]

    assert "Pujol" in venues
    assert "Contramar" in venues
    assert "Quintonil" in venues
    refute Enum.any?(venues, &Regex.match?(~r/table for/i, &1))

    # Subgroup: not everyone is `in` on every activity
    responses =
      for day <- contract["days"],
          block <- day["time_blocks"],
          act <- block["activities"],
          r <- act["responses"],
          do: r

    assert Enum.any?(responses, &(&1["state"] == "passed"))
    assert Enum.any?(responses, &(&1["state"] == "in"))
  end
end
