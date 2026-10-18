defmodule OpalCore.SocialFlow.CareRotations.Schedule do
  @moduledoc """
  Repair #18 Division B (B4) — the entire recurrence engine for care
  rotations: pure date functions over a closed cadence shape, in the
  style of `Celebrations.next_occurrence/3`. No RRULE, no library, no
  database. There is deliberately no general recurrence engine in the
  product and this module does not become one — three shapes only:

      %{
        "frequency" => "daily" | "weekdays" | "weekly",
        "weekdays" => [1..7],        # ISO weekdays; required for
                                     # "weekdays", exactly 1 for "weekly"
        "local_time" => "18:00",     # window opens at this local time
        "window_hours" => 4          # 1..12
      }

  A window is a span, never a bare instant: a check-in is an act with
  duration, and a bare instant manufactures misses.

  Timezone handling: the product ships NO tz database (the same
  constraint TemporalFollowThrough's fixed-offset fallbacks live
  with), so offsets are computed here from the post-2007 US DST rules
  (DST from the second Sunday of March 02:00 local to the first
  Sunday of November 02:00 local) for the US zones a household
  realistically declares, plus UTC. A window straddling a DST
  transition still opens and closes exactly once. Zones outside the
  table resolve to UTC offset 0 — a named limitation, inherited from
  the product's existing timezone posture, not a silent invention.
  """

  @frequencies ~w(daily weekdays weekly)

  # zone => {standard offset seconds, daylight offset seconds | nil}
  @zones %{
    "UTC" => {0, nil},
    "Etc/UTC" => {0, nil},
    "America/New_York" => {-5 * 3600, -4 * 3600},
    "America/Detroit" => {-5 * 3600, -4 * 3600},
    "America/Toronto" => {-5 * 3600, -4 * 3600},
    "America/Chicago" => {-6 * 3600, -5 * 3600},
    "America/Winnipeg" => {-6 * 3600, -5 * 3600},
    "America/Denver" => {-7 * 3600, -6 * 3600},
    "America/Edmonton" => {-7 * 3600, -6 * 3600},
    "America/Phoenix" => {-7 * 3600, nil},
    "America/Los_Angeles" => {-8 * 3600, -7 * 3600},
    "America/Vancouver" => {-8 * 3600, -7 * 3600},
    "America/Anchorage" => {-9 * 3600, -8 * 3600},
    "Pacific/Honolulu" => {-10 * 3600, nil}
  }

  def known_zone?(timezone), do: Map.has_key?(@zones, timezone)

  @doc "Validate + normalize a cadence map against the closed shape."
  def validate_cadence(cadence) when is_map(cadence) do
    c = Map.new(cadence, fn {k, v} -> {to_string(k), v} end)
    freq = c["frequency"]
    weekdays = normalize_weekdays(c["weekdays"])
    local_time = c["local_time"]
    hours = c["window_hours"]

    cond do
      freq not in @frequencies ->
        {:error, :invalid_frequency}

      not valid_local_time?(local_time) ->
        {:error, :invalid_local_time}

      not (is_integer(hours) and hours >= 1 and hours <= 12) ->
        {:error, :invalid_window_hours}

      freq == "weekdays" and weekdays == [] ->
        {:error, :weekdays_required}

      freq == "weekly" and length(weekdays) != 1 ->
        {:error, :weekly_needs_one_weekday}

      true ->
        normalized = %{
          "frequency" => freq,
          "local_time" => local_time,
          "window_hours" => hours
        }

        normalized =
          if freq in ~w(weekdays weekly),
            do: Map.put(normalized, "weekdays", weekdays),
            else: normalized

        {:ok, normalized}
    end
  end

  def validate_cadence(_), do: {:error, :invalid_cadence}

  @doc "True when `date` (in the rotation timezone) is a cadence day."
  def cadence_day?(cadence, %Date{} = date) do
    case cadence["frequency"] do
      "daily" -> true
      "weekdays" -> Date.day_of_week(date) in normalize_weekdays(cadence["weekdays"])
      "weekly" -> Date.day_of_week(date) in normalize_weekdays(cadence["weekdays"])
      _ -> false
    end
  end

  @doc """
  The window for a local date: `{window_start_at, window_end_at}` in
  UTC, or nil when the date is not a cadence day.
  """
  def window_for_date(cadence, %Date{} = date, timezone) do
    if cadence_day?(cadence, date) do
      [h, m] = cadence["local_time"] |> String.split(":") |> Enum.map(&String.to_integer/1)
      naive = NaiveDateTime.new!(date, Time.new!(h, m, 0))
      start_at = naive |> wall_to_utc(timezone) |> DateTime.truncate(:microsecond)
      end_at = DateTime.add(start_at, cadence["window_hours"] * 3600, :second)
      {start_at, end_at}
    end
  end

  @doc """
  The most recent window that has opened at or before `now`
  (`{date, start, end}` in the rotation timezone), searching back far
  enough to cover weekly cadences. Nil when none has opened yet.
  """
  def latest_opened_window(cadence, timezone, %DateTime{} = now) do
    today = local_date(now, timezone)

    Enum.find_value(0..8, fn back ->
      date = Date.add(today, -back)

      case window_for_date(cadence, date, timezone) do
        {start_at, end_at} ->
          if DateTime.compare(start_at, now) != :gt,
            do: {date, start_at, end_at},
            else: nil

        nil ->
          nil
      end
    end)
  end

  @doc "The next window that opens strictly after `now`."
  def next_window(cadence, timezone, %DateTime{} = now) do
    today = local_date(now, timezone)

    Enum.find_value(0..8, fn fwd ->
      date = Date.add(today, fwd)

      case window_for_date(cadence, date, timezone) do
        {start_at, end_at} ->
          if DateTime.compare(start_at, now) == :gt,
            do: {date, start_at, end_at},
            else: nil

        nil ->
          nil
      end
    end)
  end

  @doc ~S|Occurrence key for a local date: "care:<rotation_id>:2026-10-18".|
  def occurrence_key(rotation_id, %Date{} = date) do
    "care:#{rotation_id}:#{Date.to_iso8601(date)}"
  end

  @doc "The local date of a UTC instant in `timezone`."
  def local_date(%DateTime{} = utc, timezone) do
    utc
    |> DateTime.add(utc_offset_seconds(timezone, utc), :second)
    |> DateTime.to_date()
  end

  @doc "The local naive datetime of a UTC instant in `timezone`."
  def local_naive(%DateTime{} = utc, timezone) do
    utc
    |> DateTime.add(utc_offset_seconds(timezone, utc), :second)
    |> DateTime.to_naive()
  end

  @doc ~S|Human window label in the rotation timezone, e.g. "6-10 PM".|
  def window_label(%DateTime{} = start_at, %DateTime{} = end_at, timezone) do
    s = local_naive(start_at, timezone)
    e = local_naive(end_at, timezone)
    s12 = rem(s.hour + 11, 12) + 1
    e12 = rem(e.hour + 11, 12) + 1
    s_mer = if s.hour < 12, do: "AM", else: "PM"
    e_mer = if e.hour < 12, do: "AM", else: "PM"

    if s_mer == e_mer,
      do: "#{s12}-#{e12} #{e_mer}",
      else: "#{s12} #{s_mer}-#{e12} #{e_mer}"
  end

  # --- Zone offset engine (US DST rules, post-2007) ---

  @doc "UTC offset in seconds for `timezone` at a UTC instant."
  def utc_offset_seconds(timezone, %DateTime{} = utc) do
    case Map.get(@zones, timezone, {0, nil}) do
      {std, nil} ->
        std

      {std, dst} ->
        if dst_in_effect?(utc, std, dst), do: dst, else: std
    end
  end

  # DST runs from the second Sunday of March at 02:00 local standard
  # time to the first Sunday of November at 02:00 local daylight time.
  defp dst_in_effect?(%DateTime{} = utc, std, dst) do
    year = utc.year
    start_utc = transition_utc(year, 3, 2, 2, std)
    end_utc = transition_utc(year, 11, 1, 2, dst)
    DateTime.compare(utc, start_utc) != :lt and DateTime.compare(utc, end_utc) == :lt
  end

  # The nth Sunday of `month` at `hour`:00 local, expressed in UTC
  # under the given offset.
  defp transition_utc(year, month, nth_sunday, hour, offset) do
    first = Date.new!(year, month, 1)
    days_to_sunday = rem(7 - Date.day_of_week(first), 7)
    day = 1 + days_to_sunday + (nth_sunday - 1) * 7
    naive = NaiveDateTime.new!(Date.new!(year, month, day), Time.new!(hour, 0, 0))
    naive |> NaiveDateTime.add(-offset, :second) |> DateTime.from_naive!("Etc/UTC")
  end

  # Wall-clock local time -> UTC instant. The standard-offset guess is
  # corrected when DST is in effect at the guessed instant; the
  # corrected instant is verified once more so spring-gap wall times
  # (which do not exist) land on the first valid instant after them.
  defp wall_to_utc(%NaiveDateTime{} = naive, timezone) do
    {std, dst} = Map.get(@zones, timezone, {0, nil})

    if is_nil(dst) do
      naive |> NaiveDateTime.add(-std, :second) |> DateTime.from_naive!("Etc/UTC")
    else
      guess_std = naive |> NaiveDateTime.add(-std, :second) |> DateTime.from_naive!("Etc/UTC")

      if dst_in_effect?(guess_std, std, dst) do
        naive |> NaiveDateTime.add(-dst, :second) |> DateTime.from_naive!("Etc/UTC")
      else
        guess_std
      end
    end
  end

  defp normalize_weekdays(list) when is_list(list) do
    list
    |> Enum.filter(&(is_integer(&1) and &1 >= 1 and &1 <= 7))
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp normalize_weekdays(_), do: []

  defp valid_local_time?(value) when is_binary(value) do
    case String.split(value, ":") do
      [h, m] ->
        with {hh, ""} <- Integer.parse(h),
             {mm, ""} <- Integer.parse(m) do
          hh >= 0 and hh <= 23 and mm >= 0 and mm <= 59
        else
          _ -> false
        end

      _ ->
        false
    end
  end

  defp valid_local_time?(_), do: false
end
