defmodule OpalCore.TripsGroupCuratorTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Trips
  alias OpalCore.Trips.GroupCurator

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp maya, do: Fixtures.user_maya_id()
  defp taylor, do: Fixtures.user_taylor_id()

  test "curate_experience surfaces together, splits, free blocks, proposals" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "Mexico City · crew",
               destination_label: "Mexico City",
               user_ids: [jordan(), maya(), taylor()]
             })

    assert {:ok, _} =
             Trips.seed_mexico_city_canvas(trip.id, [alex(), jordan(), maya(), taylor()])

    # Teach Alex photography vibe via RSVP path already in seed; reinforce:
    assert {:ok, result} = GroupCurator.curate(trip.id, alex())

    assert result["commits_canvas"] == false
    assert result["destination"] == "Mexico City"
    assert is_list(result["together"])
    assert is_list(result["splits"])
    assert is_list(result["free_blocks"])
    assert length(result["free_blocks"]) >= 2
    assert length(result["splits"]) >= 1
    assert length(result["together"]) >= 1
    assert is_list(result["proposals"])

    split = hd(result["splits"])
    assert String.contains?(split["note"], "split") or String.contains?(split["note"], "Split")
  end
end
