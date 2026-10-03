defmodule OpalCore.SocialFlow.ActivityIntentCapabilitiesTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.ActivityIntent

  test "movie at home — no booking or travel CTAs" do
    caps = ActivityIntent.capabilities("Movie at home")
    policy = ActivityIntent.execution_cta_policy(caps)

    assert MapSet.member?(caps, "supports_at_home")
    refute MapSet.member?(caps, "supports_provider_booking")
    refute policy["show_provider_booking"]
    refute policy["show_travel_ctas"]
    refute policy["show_leave_by"]
  end

  test "dinner at Fort Oak may support booking + travel" do
    caps = ActivityIntent.capabilities("Dinner", place_name: "Fort Oak")
    policy = ActivityIntent.execution_cta_policy(caps)

    assert MapSet.member?(caps, "needs_place")
    assert MapSet.member?(caps, "supports_provider_booking")
    assert policy["show_travel_ctas"]
    assert policy["show_leave_by"]
  end

  test "phone call is remote without at-home or booking" do
    caps = ActivityIntent.capabilities("Phone call")

    assert MapSet.member?(caps, "supports_remote")
    refute MapSet.member?(caps, "supports_at_home")
    refute MapSet.member?(caps, "supports_provider_booking")
  end

  test "unknown activity does not invent reservation semantics" do
    policy = ActivityIntent.execution_cta_policy("Something together")
    refute policy["show_provider_booking"]
  end

  test "at_home_explicit suppresses travel even with a place name" do
    policy =
      ActivityIntent.execution_cta_policy(
        ActivityIntent.capabilities("Movie", place_name: "Home", at_home_explicit: true)
      )

    refute policy["show_provider_booking"]
    refute policy["show_travel_ctas"]
    refute policy["show_leave_by"]
  end
end
