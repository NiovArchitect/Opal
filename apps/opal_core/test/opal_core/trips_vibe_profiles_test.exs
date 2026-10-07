defmodule OpalCore.TripsVibeProfilesTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Trips
  alias OpalCore.Trips.VibeProfiles

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp maya, do: Fixtures.user_maya_id()

  test "RSVP in learns tags from activity; passed does not create a profile" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "CDMX learn",
               destination_label: "Mexico City",
               user_ids: [maya()]
             })

    assert {:ok, day} = Trips.add_day(trip.id, %{"label" => "Fri"})

    assert {:ok, block} =
             Trips.add_time_block(trip.id, day.id, %{
               "slot" => "morning",
               "time_label" => "golden hour",
               "block_kind" => "activity"
             })

    assert {:ok, activity} =
             Trips.add_activity(trip.id, block.id, %{
               "venue_name" => "Rooftop Roma",
               "activity_kind" => "activity",
               "vibe_tags" => ["photography", "golden_hour"]
             })

    assert {:ok, _} = Trips.set_activity_response(trip.id, activity.id, alex(), "in")
    assert {:ok, profile} = VibeProfiles.get(alex())
    assert "photography" in profile.interest_tags
    assert "golden_hour" in profile.energy_windows or "golden_hour" in profile.interest_tags
    assert length(profile.evidence) >= 1

    assert {:ok, _} = Trips.set_activity_response(trip.id, activity.id, maya(), "passed")
    assert {:error, :not_found} = VibeProfiles.get(maya())

    assert {:ok, profiles} = Trips.vibe_profiles_for_trip(trip.id)
    alex_c = Enum.find(profiles, &(&1["user_id"] == alex()))
    assert "photography" in alex_c["interest_tags"]
  end
end
