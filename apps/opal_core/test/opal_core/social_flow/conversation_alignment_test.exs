defmodule OpalCore.SocialFlow.ConversationAlignmentTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.ConversationAlignment

  defp msg(id, body), do: %{id: id, body: body}

  test "tomorrow then after 6 then lets do 6 asks for one confirmation" do
    state =
      ConversationAlignment.fold(
        [
          msg("1", "Hey — can you meet tomorrow?"),
          msg("2", "Yes, after 6pm works."),
          msg("3", "lets do 6")
        ],
        ["user-a", "user-b"]
      )

    assert state["participants"]["state"] == "locked"
    assert state["date"]["state"] == "locked"
    assert state["date"]["value"] == "tomorrow"
    assert state["time_window"]["state"] == "constrained"
    assert state["exact_time"]["state"] == "candidate"
    assert state["exact_time"]["value"] == "6:00 PM"
    assert state["prompt"] == "Confirm tomorrow at 6:00 PM?"
    refute state["prompt"] =~ "What's the plan"
    refute state["prompt"] =~ "Still free"
  end

  test "hey does not create a plan prompt" do
    state = ConversationAlignment.fold([msg("1", "hey")], ["user-a", "user-b"])
    refute ConversationAlignment.plan_material?(state)
    assert state["prompt"] == nil
    refute ConversationAlignment.consequential?("hey")
    assert ConversationAlignment.consequential?("Yes, after 6pm works.")
  end

  test "make it 7 reopens only the time" do
    state =
      ConversationAlignment.fold(
        [
          msg("1", "Can you meet tomorrow?"),
          msg("2", "Yes, after 6 works."),
          msg("3", "Let's do 6."),
          msg("4", "Actually make it 7")
        ],
        ["user-a", "user-b"]
      )

    assert state["date"]["state"] == "locked"
    assert state["participants"]["state"] == "locked"
    assert state["exact_time"]["value"] == "7:00 PM"
    assert state["exact_time"]["state"] == "candidate"
    assert state["place"]["state"] == "unknown"
  end
end
