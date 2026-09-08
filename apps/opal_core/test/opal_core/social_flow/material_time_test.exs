defmodule OpalCore.SocialFlow.MaterialTimeTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Feasibility.MaterialTime

  test "overlap material when shared-safe common start exists" do
    assert {:material, "availability_overlap", payload} =
             MaterialTime.evaluate(%{
               "kind" => "availability_overlap",
               "strongest_common_start" => "2026-09-07T19:00:00Z",
               "shared_safe" => true
             })

    assert payload["one_suggestion"] == true
    assert payload["spam"] == false
  end

  test "overlap silence when already shown" do
    assert {:silence, "already_shown"} =
             MaterialTime.evaluate(
               %{
                 "kind" => "availability_overlap",
                 "strongest_common_start" => "2026-09-07T19:00:00Z"
               },
               already_shown: true
             )
  end

  test "shared_now never exposes roster" do
    assert {:material, "shared_now", payload} =
             MaterialTime.evaluate(%{
               "kind" => "shared_now",
               "shared_window_start" => "2026-09-07T18:00:00Z",
               "participant_count" => 3
             })

    assert payload["roster_exposed"] == false
    assert payload["calendars_exposed"] == false
  end

  test "significant_change requires user value change" do
    assert {:silence, "no_user_value_change"} =
             MaterialTime.evaluate(%{"kind" => "significant_change", "commitment_id" => "c1"})

    assert {:material, "significant_change", _} =
             MaterialTime.evaluate(%{
               "kind" => "significant_change",
               "user_value_changed" => true,
               "commitment_id" => "c1"
             })
  end

  test "leave_by delegates to materiality (silence when too early)" do
    leave =
      DateTime.utc_now()
      |> DateTime.add(7200, :second)
      |> DateTime.truncate(:second)

    assert {:silence, _} =
             MaterialTime.evaluate(%{
               "kind" => "leave_by",
               "leave_by" => DateTime.to_iso8601(leave)
             })
  end
end
