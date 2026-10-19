defmodule OpalCore.SocialFlow.QuietHoursTest do
  @moduledoc """
  Repair #19 FIX-A (BS-04) — the ONE quiet-hours resolver.

  Pins: the stored Soul window (AssistancePreference) is the only
  window; judgment is at minute precision in the stored timezone;
  overnight windows wrap; and the documented EDGE RULE — start ==
  end means DISABLED (never quiet), everywhere, including the
  consumers that previously read the same value as quiet-all-day
  (AttentionBudget) or never-quiet-by-accident (push's range check
  on an unrelated window).
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Push.NotificationIntelligence
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.QuietHours

  defp user_with_pref!(attrs) do
    user_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: user_id,
        handle: "qh19_" <> String.slice(user_id, 0, 8),
        display_name: "Quiet Hours 19"
      })
      |> Repo.insert()

    {:ok, pref} =
      %AssistancePreference{}
      |> AssistancePreference.changeset(Map.merge(%{user_id: user_id}, attrs))
      |> Repo.insert()

    {user_id, pref}
  end

  test "window_for reads the stored window + timezone from the Soul record" do
    {user_id, _pref} =
      user_with_pref!(%{
        timezone: "America/New_York",
        quiet_hours_start: "22:30",
        quiet_hours_end: "08:15"
      })

    window = QuietHours.window_for(user_id)
    assert window.start == "22:30"
    assert window.end == "08:15"
    assert window.timezone == "America/New_York"
    assert window.start_minutes == 22 * 60 + 30
    assert window.end_minutes == 8 * 60 + 15
  end

  test "minute precision + overnight wrap, judged in the stored timezone" do
    {user_id, pref} =
      user_with_pref!(%{
        timezone: "America/New_York",
        quiet_hours_start: "22:30",
        quiet_hours_end: "08:15"
      })

    # 2026-06-01 11:30Z = 07:30 EDT — inside 22:30–08:15 in New York,
    # outside it in UTC: true proves the stored timezone judges.
    assert QuietHours.quiet_now?(user_id, ~U[2026-06-01 11:30:00Z])
    # The record-in-hand entry (follow-through's path) agrees on the
    # POSITIVE case too — a clause-order regression once made it
    # always answer false.
    assert QuietHours.quiet_now?(pref, ~U[2026-06-01 11:30:00Z])
    refute QuietHours.quiet_now?(pref, ~U[2026-06-01 16:00:00Z])
    # 16:00Z = 12:00 EDT — daytime, not quiet.
    refute QuietHours.quiet_now?(user_id, ~U[2026-06-01 16:00:00Z])
    # Minute precision at the start edge: 02:29Z = 22:29 EDT (not yet),
    # 02:30Z = 22:30 EDT (quiet starts exactly at the stored minute).
    refute QuietHours.quiet_now?(user_id, ~U[2026-06-01 02:29:00Z])
    assert QuietHours.quiet_now?(user_id, ~U[2026-06-01 02:30:00Z])
    # End edge: 12:14Z = 08:14 EDT (still quiet), 12:15Z = 08:15 (over).
    assert QuietHours.quiet_now?(user_id, ~U[2026-06-01 12:14:00Z])
    refute QuietHours.quiet_now?(user_id, ~U[2026-06-01 12:15:00Z])
  end

  test "EDGE RULE: start == end is DISABLED — never quiet, in every consumer" do
    {user_id, pref} =
      user_with_pref!(%{
        timezone: "UTC",
        quiet_hours_start: "08:00",
        quiet_hours_end: "08:00"
      })

    for instant <- [
          ~U[2026-06-01 08:00:00Z],
          ~U[2026-06-01 03:00:00Z],
          ~U[2026-06-01 23:00:00Z]
        ] do
      refute QuietHours.quiet_now?(user_id, instant)
      # The follow-through entry (record in hand) agrees.
      refute QuietHours.quiet_now?(pref, instant)
      # The attention-budget entry (local wall time in hand) agrees.
      refute QuietHours.quiet_at_local?(user_id, instant)
    end

    assert QuietHours.in_window?(480, 480, 480) == false
    assert QuietHours.in_window?(0, 480, 480) == false
  end

  test "no preference row: the product default window in the product default timezone" do
    user_id = Ecto.UUID.generate()

    window = QuietHours.window_for(user_id)

    assert {window.start, window.end, window.timezone} ==
             {"22:00", "08:00", "America/Los_Angeles"}

    # 09:00Z = 02:00 PDT (quiet); 19:00Z = 12:00 PDT (not quiet).
    assert QuietHours.quiet_now?(user_id, ~U[2026-06-01 09:00:00Z])
    refute QuietHours.quiet_now?(user_id, ~U[2026-06-01 19:00:00Z])
  end

  test "push consumes the stored window at minute precision (not a sleep bias, not a hardcoded clock)" do
    {user_id, _pref} =
      user_with_pref!(%{
        timezone: "UTC",
        quiet_hours_start: "21:30",
        quiet_hours_end: "07:30"
      })

    on_exit(fn -> Clock.unfreeze() end)

    # 21:45Z is inside the stored 21:30–07:30 window. The retired
    # push path (sleep-bias window judged in Los Angeles) said false
    # here; the one resolver says quiet.
    Clock.freeze(~U[2026-06-01 21:45:00Z])
    assert NotificationIntelligence.quiet_hours?(user_id)
    assert QuietHours.quiet_now?(user_id)

    # 21:15Z is before the stored start minute: not quiet.
    Clock.freeze(~U[2026-06-01 21:15:00Z])
    refute NotificationIntelligence.quiet_hours?(user_id)

    # quiet_window/1 (the digest worker's flush source) reports the
    # stored window's hours, not a bias.
    assert NotificationIntelligence.quiet_window(user_id) == {21, 7}
  end

  test "JA-07 read-back: the Soul room's Off write (start == end) reads back off and the resolver honors it; On restores the window" do
    alias OpalCore.MemoryWallet.Soul

    {user_id, _pref} =
      user_with_pref!(%{
        timezone: "America/Los_Angeles",
        quiet_hours_start: "22:00",
        quiet_hours_end: "08:00"
      })

    # 2026-10-18T06:30Z is 23:30 PDT the previous evening — deep
    # inside the ON window.
    inside = ~U[2026-10-18 06:30:00Z]
    assert QuietHours.quiet_now?(user_id, inside)

    # The web Off control writes end == start through the Soul
    # room's own update path.
    assert {:ok, off} =
             Soul.update_soul(user_id, %{
               "quiet_hours_start" => "22:00",
               "quiet_hours_end" => "22:00"
             })

    assert off["quiet_hours_start"] == "22:00"
    assert off["quiet_hours_end"] == "22:00"
    assert off["quiet_hours_label"] == "Quiet hours are off"

    # Read-back through the room's own read: same truth, and the
    # resolver honors the disabled state at the same instant.
    assert {:ok, read_back} = Soul.soul_for(user_id)
    assert read_back["quiet_hours_label"] == "Quiet hours are off"
    refute QuietHours.quiet_now?(user_id, inside)

    # On restores the window: label and resolver agree again.
    assert {:ok, on} =
             Soul.update_soul(user_id, %{
               "quiet_hours_start" => "22:00",
               "quiet_hours_end" => "08:00"
             })

    assert on["quiet_hours_label"] == "Quiet hours - 22:00 to 08:00"
    assert QuietHours.quiet_now?(user_id, inside)
  end

  test "in_window? core: same-day window, overnight wrap, exclusive end" do
    # Same-day 09:00–17:00.
    assert QuietHours.in_window?(9 * 60, 9 * 60, 17 * 60)
    assert QuietHours.in_window?(16 * 60 + 59, 9 * 60, 17 * 60)
    refute QuietHours.in_window?(17 * 60, 9 * 60, 17 * 60)
    refute QuietHours.in_window?(8 * 60 + 59, 9 * 60, 17 * 60)

    # Overnight 22:00–08:00.
    assert QuietHours.in_window?(23 * 60, 22 * 60, 8 * 60)
    assert QuietHours.in_window?(0, 22 * 60, 8 * 60)
    assert QuietHours.in_window?(7 * 60 + 59, 22 * 60, 8 * 60)
    refute QuietHours.in_window?(8 * 60, 22 * 60, 8 * 60)
    refute QuietHours.in_window?(12 * 60, 22 * 60, 8 * 60)
  end
end
