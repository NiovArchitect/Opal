defmodule OpalCore.SocialFlow.CareRotations.ScheduleTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.CareRotations.Schedule

  @daily %{"frequency" => "daily", "local_time" => "18:00", "window_hours" => 4}
  @tz "America/New_York"

  test "validate: closed shape only" do
    assert {:ok, @daily} = Schedule.validate_cadence(@daily)

    assert {:error, :invalid_frequency} =
             Schedule.validate_cadence(%{
               "frequency" => "hourly",
               "local_time" => "18:00",
               "window_hours" => 4
             })

    assert {:error, :invalid_window_hours} =
             Schedule.validate_cadence(%{@daily | "window_hours" => 13})

    assert {:error, :invalid_window_hours} =
             Schedule.validate_cadence(%{@daily | "window_hours" => 0})

    assert {:error, :invalid_local_time} =
             Schedule.validate_cadence(%{@daily | "local_time" => "25:00"})

    assert {:error, :weekdays_required} =
             Schedule.validate_cadence(%{
               "frequency" => "weekdays",
               "local_time" => "18:00",
               "window_hours" => 4
             })

    assert {:error, :weekly_needs_one_weekday} =
             Schedule.validate_cadence(%{
               "frequency" => "weekly",
               "weekdays" => [1, 3],
               "local_time" => "18:00",
               "window_hours" => 4
             })

    assert {:ok, %{"weekdays" => [3]}} =
             Schedule.validate_cadence(%{
               "frequency" => "weekly",
               "weekdays" => [3],
               "local_time" => "18:00",
               "window_hours" => 4
             })
  end

  test "window math: daily 18:00 + 4h in New York (EDT)" do
    # 2026-10-19 is a Monday, EDT (UTC-4): 18:00 local = 22:00Z, end 02:00Z.
    assert {start_at, end_at} = Schedule.window_for_date(@daily, ~D[2026-10-19], @tz)
    assert DateTime.compare(start_at, ~U[2026-10-19 22:00:00.000000Z]) == :eq
    assert DateTime.compare(end_at, ~U[2026-10-20 02:00:00.000000Z]) == :eq
    assert Schedule.window_label(start_at, end_at, @tz) == "6-10 PM"
  end

  test "weekdays cadence skips non-cadence days" do
    cadence = %{
      "frequency" => "weekdays",
      "weekdays" => [1, 3, 5],
      "local_time" => "09:00",
      "window_hours" => 2
    }

    # 2026-10-20 is a Tuesday — not a cadence day.
    assert nil == Schedule.window_for_date(cadence, ~D[2026-10-20], @tz)
    # 2026-10-21 Wednesday — cadence day.
    assert {%DateTime{}, %DateTime{}} = Schedule.window_for_date(cadence, ~D[2026-10-21], @tz)
  end

  test "latest opened window: before today's open, yesterday's window is latest" do
    # Tue 11:00 EDT
    now = ~U[2026-10-20 15:00:00.000000Z]
    assert {~D[2026-10-19], start_at, _end} = Schedule.latest_opened_window(@daily, @tz, now)
    assert DateTime.compare(start_at, ~U[2026-10-19 22:00:00.000000Z]) == :eq

    # Tue 19:00 EDT — today's window open
    now2 = ~U[2026-10-20 23:00:00.000000Z]
    assert {~D[2026-10-20], _, _} = Schedule.latest_opened_window(@daily, @tz, now2)
  end

  test "DST spring transition: window opens and closes exactly once" do
    # 2027-03-14: US spring forward (02:00 EST -> 03:00 EDT). 18:00 local = 22:00Z (EDT).
    assert {start_at, end_at} = Schedule.window_for_date(@daily, ~D[2027-03-14], @tz)
    assert DateTime.compare(start_at, ~U[2027-03-14 22:00:00.000000Z]) == :eq
    assert DateTime.compare(end_at, ~U[2027-03-15 02:00:00.000000Z]) == :eq
    # The day before is EST: 18:00 local = 23:00Z.
    assert {prev_start, _} = Schedule.window_for_date(@daily, ~D[2027-03-13], @tz)
    assert DateTime.compare(prev_start, ~U[2027-03-13 23:00:00.000000Z]) == :eq
  end

  test "occurrence key format" do
    assert Schedule.occurrence_key("rot-1", ~D[2026-10-18]) == "care:rot-1:2026-10-18"
  end
end
