defmodule OpalCore.SocialFlow.QuietHours do
  @moduledoc """
  Repair #19 FIX-A (BS-04) — ONE truth for quiet hours.

  Every consumer that asks "is it quiet for this user right now?"
  (push, the digest worker, follow-through, the attention budget,
  the check-in suggestion surface) resolves the answer HERE, from
  the user's stored record — `AssistancePreference`, the same record
  the Soul room reads and writes (`OpalCore.MemoryWallet.Soul` holds
  no parallel store) — and from nowhere else. Before this module the
  consumers diverged: push derived a window from a vibe sleep bias,
  proactive delivery used its own clock law, follow-through compared
  the saved window against UTC, and the attention budget read the
  saved window at hour granularity only and treated an empty window
  as quiet all day.

  ## The rules (the whole contract)

  - The window is the preference's `quiet_hours_start` /
    `quiet_hours_end` ("HH:MM"), judged at MINUTE precision in the
    preference's `timezone`. An overnight window (start > end, the
    usual 22:00–08:00) wraps midnight.
  - EDGE RULE: `start == end` means quiet hours are DISABLED —
    never quiet. An equal start/end is the off state of the window
    itself; it never means "quiet all day". (The attention budget
    previously read the same stored value as quiet-all-day; that
    reading is retired everywhere by this rule.)
  - No preference row, or an unparseable stored value, falls back
    per-field to the product default window 22:00–08:00 in
    `America/Los_Angeles` (the timezone the pre-existing consumers
    already used as the product default).
  - The timezone is the stored one, taken literally (a stored
    "UTC" is judged in UTC). If the stored zone cannot be loaded
    (no tzdata for it), the answer is computed from a fixed-offset
    approximation for the zones the product already approximates
    (the Pacific/Eastern/Tokyo/Shanghai/Sydney set the attention
    budget has always carried), else UTC.

  NAMED EXCEPTION (not flattened, by design): proactive thread
  INITIATION (`OpalCore.Intelligence.ProactiveConversation`) does
  not consume this module. Its moduledoc records a distinct,
  founder-tunable sender-side curfew as product law ("never before
  8am or after 10pm owner timezone") — a curfew on Opal starting a
  thread, deliberately independent of the window the user sets for
  being disturbed. BS-04's report names it; this helper governs the
  disturbance window only.
  """

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialFlow.Clock

  @default_start "22:00"
  @default_end "08:00"
  @default_tz "America/Los_Angeles"

  @doc """
  The user's stored quiet window, resolved once:

      %{start: "22:00", end: "08:00", timezone: "America/Los_Angeles",
        start_minutes: 1320, end_minutes: 480}

  `start_minutes` / `end_minutes` are minutes after local midnight.
  With no preference row the product default above is returned.
  """
  def window_for(user_id) when is_binary(user_id) do
    case Repo.get_by(AssistancePreference, user_id: user_id) do
      %AssistancePreference{} = pref -> window_from(pref)
      _ -> default_window()
    end
  rescue
    _ -> default_window()
  end

  def window_for(_), do: default_window()

  @doc "The window carried by one preference record (no DB read)."
  def window_from(%AssistancePreference{} = pref) do
    start = present_hm(pref.quiet_hours_start) || @default_start
    ending = present_hm(pref.quiet_hours_end) || @default_end
    tz = present_tz(pref.timezone) || @default_tz

    %{
      start: start,
      end: ending,
      timezone: tz,
      start_minutes: parse_hm!(start),
      end_minutes: parse_hm!(ending)
    }
  end

  def default_window do
    %{
      start: @default_start,
      end: @default_end,
      timezone: @default_tz,
      start_minutes: parse_hm!(@default_start),
      end_minutes: parse_hm!(@default_end)
    }
  end

  @doc "The user's home timezone for quiet-hours judgment (stored, else the product default)."
  def timezone_for(user_id) when is_binary(user_id), do: window_for(user_id).timezone
  def timezone_for(_), do: @default_tz

  @doc """
  Is it quiet for this user at `now` (a UTC instant; default: the
  server clock)? The instant is shifted into the user's stored
  timezone and judged against the stored window by the rules in
  the moduledoc.
  """
  def quiet_now?(user_id, now \\ Clock.utc_now())

  def quiet_now?(user_id, %DateTime{} = now) when is_binary(user_id) do
    window = window_for(user_id)
    quiet_at?(window, local_now(window, now))
  end

  # The same question for one already-fetched preference record and a
  # UTC instant — for consumers (follow-through) that already hold the
  # record. The instant is still shifted into the record's timezone
  # here; callers never compare the window against UTC themselves.
  # NOTE: this clause must stay ABOVE the catch-all below it.
  def quiet_now?(%AssistancePreference{} = pref, %DateTime{} = now) do
    window = window_from(pref)
    quiet_at?(window, local_now(window, now))
  end

  def quiet_now?(_, _), do: false

  @doc """
  Judge a LOCAL wall-clock time (already shifted into the user's
  timezone by the caller — e.g. the attention budget's travel-aware
  local clock) against the user's stored window. Window, minutes,
  and the edge rule are this module's; only the clock differs.
  """
  def quiet_at_local?(user_id, %DateTime{} = local_now) when is_binary(user_id) do
    quiet_at?(window_for(user_id), local_now)
  end

  def quiet_at_local?(_, _), do: false

  @doc "`now` (UTC) shifted into the window's timezone."
  def local_now(%{timezone: tz}, %DateTime{} = now) do
    case DateTime.shift_zone(now, tz) do
      {:ok, local} -> local
      _ -> DateTime.add(now, fixed_offset_hours(tz, now) * 3600, :second)
    end
  end

  @doc """
  The minute-precision core every consumer shares: is
  `minutes_after_midnight` inside the window from `start_minutes`
  to `end_minutes`? Overnight windows wrap. The EDGE RULE lives
  here: `start == end` is DISABLED — never quiet.
  """
  def in_window?(minutes, start_minutes, end_minutes)
      when is_integer(minutes) and is_integer(start_minutes) and is_integer(end_minutes) do
    cond do
      start_minutes == end_minutes -> false
      start_minutes < end_minutes -> minutes >= start_minutes and minutes < end_minutes
      true -> minutes >= start_minutes or minutes < end_minutes
    end
  end

  def in_window?(_, _, _), do: false

  defp quiet_at?(%{start_minutes: s, end_minutes: e}, %DateTime{} = local) do
    in_window?(local.hour * 60 + local.minute, s, e)
  end

  # --- stored-value parsing ------------------------------------------

  defp present_hm(value) when is_binary(value) do
    case parse_hm(value) do
      {:ok, _minutes} -> value
      :error -> nil
    end
  end

  defp present_hm(_), do: nil

  defp present_tz(value) when is_binary(value) do
    if String.trim(value) == "", do: nil, else: value
  end

  defp present_tz(_), do: nil

  defp parse_hm!(value) do
    {:ok, minutes} = parse_hm(value)
    minutes
  end

  defp parse_hm(value) when is_binary(value) do
    case String.split(String.trim(value), ":") do
      [h, m] ->
        with {hour, ""} <- Integer.parse(h),
             {minute, ""} <- Integer.parse(m),
             true <- hour >= 0 and hour <= 23 and minute >= 0 and minute <= 59 do
          {:ok, hour * 60 + minute}
        else
          _ -> :error
        end

      _ ->
        :error
    end
  end

  defp parse_hm(_), do: :error

  # Fixed-offset fallback for environments without tzdata — the same
  # approximation set the attention budget has always carried.
  defp fixed_offset_hours("UTC", _), do: 0
  defp fixed_offset_hours("Etc/UTC", _), do: 0

  defp fixed_offset_hours("America/Los_Angeles", %DateTime{} = utc) do
    if pacific_dst?(utc), do: -7, else: -8
  end

  defp fixed_offset_hours("America/New_York", %DateTime{} = utc) do
    if pacific_dst?(utc), do: -4, else: -5
  end

  defp fixed_offset_hours("Asia/Tokyo", _), do: 9
  defp fixed_offset_hours("Asia/Shanghai", _), do: 8

  defp fixed_offset_hours("Australia/Sydney", %DateTime{} = utc) do
    if utc.month >= 10 or utc.month <= 3, do: 11, else: 10
  end

  defp fixed_offset_hours(_, _), do: 0

  defp pacific_dst?(%DateTime{month: m}) when m >= 3 and m <= 10, do: true
  defp pacific_dst?(_), do: false
end
