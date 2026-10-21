defmodule OpalCore.SocialFlow.R21GreetingLawTest do
  @moduledoc """
  Repair #21 - Cluster L-LAWS, law L-1 (server Flows leg): THE
  GREETING IS TRUE (founder law, 2026-10-20 13:23 PDT).

  ProductShell.home_snapshot is the server Flows (Home) snapshot -
  the greeting it composes must be dynamic and personal: the
  time-of-day word follows the VIEWER's own timezone at the moment
  of viewing, and the name is the SIGNED-IN USER's own name.

  Pre-L-1 findings pinned against here:
  - greeting/1 read DateTime.utc_now().hour - a UTC greeting, wrong
    for every viewer outside UTC;
  - home_snapshot accepted a caller-supplied :display_name that
    overrode the viewer's own record, so a payload field naming
    another person could have been greeted.

  Clock convention: the pinned instant rides attrs :now (the
  backend clock-override convention, as in Connections.build's :now
  opt and FollowThrough's attrs :now). The viewer timezone rides
  attrs :timezone (the channel passes the device timezone the
  viewer sent with the social_flow:home_snapshot request; without
  one, the viewer's stored effective timezone is used).
  """
  use OpalCore.DataCase

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.ProductShell

  setup do
    FixturesHelper.seed!()
    :ok
  end

  # One fixed instant: 2026-10-20 02:00 UTC is 19:00 on Oct 19 in
  # Los Angeles (evening), 11:00 on Oct 20 in Tokyo (morning), and
  # 15:00 on Oct 20 in Auckland (afternoon).
  @instant ~U[2026-10-20 02:00:00Z]

  test "L-1: the same instant renders evening / morning / afternoon under three viewer timezones" do
    alex = Fixtures.user_alex_id()

    la =
      ProductShell.home_snapshot(%{
        user_id: alex,
        now: @instant,
        timezone: "America/Los_Angeles"
      })

    tokyo =
      ProductShell.home_snapshot(%{user_id: alex, now: @instant, timezone: "Asia/Tokyo"})

    auckland =
      ProductShell.home_snapshot(%{
        user_id: alex,
        now: @instant,
        timezone: "Pacific/Auckland"
      })

    assert la["greeting"] == "Good evening, Alex."
    assert tokyo["greeting"] == "Good morning, Alex."
    assert auckland["greeting"] == "Good afternoon, Alex."
    assert la["greeting_context"]["timezone"] == "America/Los_Angeles"
    assert tokyo["greeting_context"]["timezone"] == "Asia/Tokyo"
  end

  test "L-1: two distinct viewers are each greeted by their own name at the same instant" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    opts = %{now: @instant, timezone: "America/Los_Angeles"}

    alex_home = ProductShell.home_snapshot(Map.put(opts, :user_id, alex))
    jordan_home = ProductShell.home_snapshot(Map.put(opts, :user_id, jordan))

    assert alex_home["greeting"] == "Good evening, Alex."
    assert jordan_home["greeting"] == "Good evening, Jordan."
    refute alex_home["greeting"] =~ "Jordan"
    refute jordan_home["greeting"] =~ "Alex"
  end

  test "L-1: a caller-supplied display_name naming another person is never greeted" do
    alex = Fixtures.user_alex_id()

    home =
      ProductShell.home_snapshot(%{
        user_id: alex,
        display_name: "Jordan",
        now: @instant,
        timezone: "America/Los_Angeles"
      })

    assert home["greeting"] == "Good evening, Alex."
    assert home["greeting_context"]["display_name"] == "Alex"
    refute home["greeting"] =~ "Jordan"
  end

  test "L-1: an invalid viewer timezone falls back, never to a seed or server name" do
    alex = Fixtures.user_alex_id()

    home =
      ProductShell.home_snapshot(%{
        user_id: alex,
        now: @instant,
        timezone: "not a zone"
      })

    # The fallback is the viewer's stored effective timezone; the
    # greeting still names the viewer and carries a real timezone.
    # (This stack has no Tzdata package, so validation is the house
    # IANA-shape convention - a malformed string is what can be
    # rejected here, exactly as in AvailabilityWindow.)
    assert home["greeting"] =~ "Alex."
    assert is_binary(home["greeting_context"]["timezone"])
    assert home["greeting_context"]["timezone"] != "not a zone"
  end
end
