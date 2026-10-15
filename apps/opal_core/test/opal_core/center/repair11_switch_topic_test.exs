defmodule OpalCore.Center.Repair11SwitchTopicTest do
  @moduledoc """
  Repair #11 — broaden switch_topic patterns so explicit new-direction phrasing
  ("something new", "new search", "start over", "forget it", "never mind that")
  is recognized, and the sticky re-engagement cannot override the turn.

  Pure unit tests (no DB).

  NOT RUN — no Elixir toolchain on this VM (mix test not available).
  Would run: `mix test apps/opal_core/test/opal_core/center/repair11_switch_topic_test.exs`
  """

  use ExUnit.Case, async: true

  alias OpalCore.Center.PlanContextPatch

  test "something new is a topic switch" do
    assert PlanContextPatch.classify_conversation_act("Let's talk about something new") ==
             "switch_topic"
  end

  test "new search is a topic switch" do
    assert PlanContextPatch.classify_conversation_act("Start a new search") == "switch_topic"
  end

  test "start over is a topic switch" do
    assert PlanContextPatch.classify_conversation_act("Let's start over") == "switch_topic"
  end

  test "forget it is a topic switch" do
    assert PlanContextPatch.classify_conversation_act("Forget it") == "switch_topic"
  end

  test "never mind that is a topic switch" do
    assert PlanContextPatch.classify_conversation_act("Never mind that") == "switch_topic"
  end

  test "forget that venue still cancels the venue, not a topic switch (regression lock)" do
    assert PlanContextPatch.classify_conversation_act("Forget that venue") ==
             "cancel_venue_keep_plan"
  end

  test "cancel search still cancels the search (regression lock)" do
    assert PlanContextPatch.classify_conversation_act("Cancel the search") == "cancel_search"
  end
end
