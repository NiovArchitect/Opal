defmodule OpalCore.Center.ScheduleFeasibilityTest do
  use ExUnit.Case, async: true

  alias OpalCore.Center.ScheduleFeasibility

  test "shift ends 3pm flight 9pm → no PTO" do
    day = ~D[2026-10-17]
    shift_end = DateTime.new!(day, ~T[15:00:00], "Etc/UTC")
    departure = DateTime.new!(day, ~T[21:00:00], "Etc/UTC")

    r =
      ScheduleFeasibility.evaluate_work_conflict(%{
        shift_end: shift_end,
        departure_at: departure,
        buffer_minutes: 180
      })

    assert r["work_conflict"] == false
    assert r["PTO_ACTION"] == "NONE"
  end

  test "shift ends 5pm flight 2pm → conflict" do
    day = ~D[2026-10-17]
    shift_end = DateTime.new!(day, ~T[17:00:00], "Etc/UTC")
    departure = DateTime.new!(day, ~T[14:00:00], "Etc/UTC")

    r =
      ScheduleFeasibility.evaluate_work_conflict(%{
        shift_end: shift_end,
        departure_at: departure,
        buffer_minutes: 180
      })

    assert r["work_conflict"] == true

    pto =
      ScheduleFeasibility.pto_action_for_conflict(r, %{
        "provider_connected" => false,
        "submission_supported" => false
      })

    assert pto["PTO_ACTION"] == "PREPARE_BLOCKED"
    assert pto["PTO_PROVIDER_CONNECTED"] == false
  end
end
