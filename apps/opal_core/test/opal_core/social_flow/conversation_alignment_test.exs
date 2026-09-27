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

  test "6:30 inside an after-6 window locks without another question" do
    state =
      ConversationAlignment.fold(
        [
          msg("1", "Can you meet tomorrow?"),
          msg("2", "Any time after 6 works."),
          msg("3", "Let's do 6:30.")
        ],
        ["user-a", "user-b"]
      )

    assert state["exact_time"]["state"] == "locked"
    assert state["exact_time"]["value"] == "6:30 PM"
    assert state["date"]["state"] == "locked"
    assert state["completion"] =~ "6:30 PM is set"
    refute state["confirmable"]
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

  test "a confirmed exact time stays locked when the same messages are folded again" do
    state =
      ConversationAlignment.fold(
        [
          msg("1", "Hey — can you meet tomorrow?"),
          msg("2", "Yes, after 6pm works."),
          msg("3", "lets do 6")
        ],
        ["user-a", "user-b"],
        [act("exact_time_lock", "user-a", "6:00 PM", 4, "locked")]
      )

    assert state["exact_time"]["state"] == "locked"
    assert state["exact_time"]["value"] == "6:00 PM"
    assert state["prompt"] == "What kind of meetup?"
    refute state["confirmable"]
  end

  test "make it 7 after a time lock still changes only the time" do
    state =
      ConversationAlignment.fold(
        [
          msg("1", "Can you meet tomorrow?"),
          msg("2", "Yes, after 6 works."),
          msg("3", "Let's do 6."),
          msg("4", "Actually make it 7")
        ],
        ["user-a", "user-b"],
        [act("exact_time_lock", "user-a", "6:00 PM", 3, "locked")]
      )

    assert state["date"]["state"] == "locked"
    assert state["exact_time"]["state"] == "candidate"
    assert state["exact_time"]["value"] == "7:00 PM"
    assert state["place"]["state"] == "unknown"
  end

  test "dinner shows one shared catalog and no invented travel" do
    state = dinner_ready()

    assert state["activity"]["state"] == "locked"
    assert state["activity"]["value"] == "Dinner"
    assert state["exact_time"]["state"] == "locked"
    assert state["next"] == "place"
    assert Enum.map(state["candidates"], & &1["name"]) == ["Juniper & Ivy", "Herb & Wood", "Fort Oak"]
    assert length(state["candidates"]) == 3
    assert Enum.all?(state["candidates"], &(&1["travel_time"] == nil))
    assert Enum.all?(state["candidates"], &(&1["provenance"] == "curated_catalog_no_live_travel_availability_or_trend"))
    refute state["prompt"] =~ "Where should we meet"
    refute state["prompt"] =~ "fits the group"
    refute state["prompt"] =~ "afford"
  end

  test "catalog options follow the activity and do not invent live data" do
    coffee =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "coffee", 10, "user_stated")
      ])

    assert Enum.map(coffee["candidates"], & &1["name"]) == ["Bird Rock Coffee"]
    refute Enum.any?(coffee["candidates"], &(&1["name"] == "Juniper & Ivy"))

    active =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "something active", 10, "user_stated")
      ])

    assert Enum.map(active["candidates"], & &1["name"]) == ["Torrey Pines"]
    refute Enum.any?(active["candidates"], &(&1["name"] in ["Juniper & Ivy", "Herb & Wood", "Fort Oak"]))
    assert Enum.all?(active["candidates"], &(&1["travel_time"] == nil))
  end

  test "changing activity keeps the time and clears the place and reservation" do
    state =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Herb & Wood", 11),
        act("place_confirm", "user-b", "Herb & Wood", 12, "agreed"),
        act("reservation_authorize", "user-a", "Herb & Wood", 13),
        act("reservation_authorize", "user-b", "Herb & Wood", 14, "agreed"),
        act("activity_lock", "user-a", "coffee", 15, "user_stated")
      ])

    assert state["date"]["state"] == "locked"
    assert state["exact_time"]["state"] == "locked"
    assert state["exact_time"]["value"] == "6:30 PM"
    assert state["activity"]["value"] == "Coffee"
    assert state["place"]["state"] == "unknown"
    assert state["execution"]["state"] == "unknown"
    assert Enum.map(state["candidates"], & &1["name"]) == ["Bird Rock Coffee"]
    assert state["activity_changeable"]
  end

  test "changing place keeps activity and time and clears reservation authorization" do
    state =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Herb & Wood", 11),
        act("place_confirm", "user-b", "Herb & Wood", 12, "agreed"),
        act("reservation_authorize", "user-a", "Herb & Wood", 13),
        act("place_reopen", "user-a", "Herb & Wood", 14, "revoked")
      ])

    assert state["activity"]["value"] == "Dinner"
    assert state["date"]["state"] == "locked"
    assert state["exact_time"]["value"] == "6:30 PM"
    assert state["place"]["state"] == "unknown"
    assert state["execution"]["state"] == "unknown"
    assert Enum.map(state["candidates"], & &1["name"]) == ["Juniper & Ivy", "Herb & Wood", "Fort Oak"]
  end

  test "7 p.m. after the plan is set proposes a new time and keeps the place" do
    state =
      ConversationAlignment.fold(
        dinner_messages() ++ [%{id: "9", body: "7 p.m.", sender_user_id: "user-a", seq: 20}],
        ["user-a", "user-b"],
        [
          act("activity_lock", "user-a", "dinner", 10, "user_stated"),
          act("place_propose", "user-a", "Herb & Wood", 11),
          act("place_confirm", "user-b", "Herb & Wood", 12, "agreed"),
          act("reservation_authorize", "user-a", "Herb & Wood", 13),
          act("reservation_authorize", "user-b", "Herb & Wood", 14, "agreed")
        ]
      )

    assert state["exact_time"]["value"] == "6:30 PM"
    assert state["place"]["value"] == "Herb & Wood"
    assert state["activity"]["value"] == "Dinner"
    assert state["execution"]["state"] == "agreed"
    assert state["change_proposal"]["value"] == "7:00 PM"
    assert state["change_proposal"]["field"] == "datetime"
    assert state["plan_lines"] == ["Tomorrow", "6:30 PM", "Herb & Wood"]
  end

  test "a time change after reservation approval is a proposal until accepted" do
    proposed =
      ConversationAlignment.fold(
        dinner_messages() ++ [%{id: "9", body: "Actually make it 7", sender_user_id: "user-b", seq: 20}],
        ["user-a", "user-b"],
        [
          act("activity_lock", "user-a", "dinner", 10, "user_stated"),
          act("place_propose", "user-a", "Herb & Wood", 11),
          act("place_confirm", "user-b", "Herb & Wood", 12, "agreed"),
          act("reservation_authorize", "user-a", "Herb & Wood", 13),
          act("reservation_authorize", "user-b", "Herb & Wood", 14, "agreed")
        ]
      )

    assert proposed["exact_time"]["value"] == "6:30 PM"
    assert proposed["exact_time"]["state"] == "locked"
    assert proposed["place"]["value"] == "Herb & Wood"
    assert proposed["execution"]["state"] == "agreed"
    assert proposed["change_proposal"]["value"] == "7:00 PM"
    assert proposed["change_proposal"]["proposed_by_user_id"] == "user-b"
    assert proposed["prompt"] =~ "7:00 PM"

    accepted =
      ConversationAlignment.fold(
        dinner_messages() ++ [%{id: "9", body: "Actually make it 7", sender_user_id: "user-b", seq: 20}],
        ["user-a", "user-b"],
        [
          act("activity_lock", "user-a", "dinner", 10, "user_stated"),
          act("place_propose", "user-a", "Herb & Wood", 11),
          act("place_confirm", "user-b", "Herb & Wood", 12, "agreed"),
          act("reservation_authorize", "user-a", "Herb & Wood", 13),
          act("reservation_authorize", "user-b", "Herb & Wood", 14, "agreed"),
          act("change_accept", "user-a", "7:00 PM", 21, "agreed")
        ]
      )

    assert accepted["exact_time"]["value"] == "7:00 PM"
    assert accepted["exact_time"]["state"] == "locked"
    assert accepted["place"]["value"] == "Herb & Wood"
    assert accepted["execution"]["state"] == "unknown"
    assert accepted["change_proposal"] == nil
  end

  test "one person proposes a place and the other confirms it" do
    state =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_confirm", "user-b", "Juniper & Ivy", 12, "agreed")
      ])

    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Juniper & Ivy"
    assert state["place"]["truth"] == "locked"
    assert state["place"]["proposed_by_user_id"] == "user-a"
    assert state["place"]["confirmed_by_user_id"] == "user-b"
    assert state["place"]["lock_reason"] == "confirmed"
    assert state["exact_time"]["value"] == "6:30 PM"
    assert state["exact_time"]["state"] == "locked"
    assert state["prompt"] == "Plan set ✓"
    assert state["change_quiet"]
    refute state["prompt"] =~ "Nothing is sent"
    refute state["execution"]["executed"]
    refute state["execution"]["state"] == "executed"
  end

  test "the proposer cannot confirm their own place" do
    state =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_confirm", "user-a", "Juniper & Ivy", 12, "agreed")
      ])

    assert state["place"]["state"] == "candidate"
    assert state["place_confirmable"]
    assert state["prompt"] == "Juniper & Ivy?"
  end

  test "both people picking the same place locks it" do
    state =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Herb & Wood", 11),
        act("place_propose", "user-b", "Herb & Wood", 12)
      ])

    assert state["place"]["state"] == "locked"
    assert state["place"]["lock_reason"] == "both_selected"
    assert state["place"]["value"] == "Herb & Wood"
    refute state["prompt"] =~ "fits the group"
  end

  test "different simultaneous places stay conflicted instead of last write winning" do
    state =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_propose", "user-b", "Fort Oak", 12)
      ])

    assert state["place"]["state"] == "conflicted"
    assert state["place"]["value"] == nil
    assert state["place"]["truth"] == "proposed"
    assert state["prompt"] == "You picked different places."
    assert state["place_conflicted"]
    refute state["place_confirmable"]
    assert Enum.map(state["conflict_options"], & &1["name"]) == ["Juniper & Ivy", "Fort Oak"]
    assert Enum.map(state["place"]["proposals"], & &1["actor_user_id"]) == ["user-a", "user-b"]
    assert state["exact_time"]["state"] == "locked"
    assert state["exact_time"]["value"] == "6:30 PM"
    refute state["prompt"] =~ "Booked"
    refute state["prompt"] =~ "Reserved"

    stayed =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_propose", "user-b", "Fort Oak", 12),
        act("place_propose", "user-a", "Juniper & Ivy", 13)
      ])

    assert stayed["place"]["state"] == "conflicted"

    converged =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_propose", "user-b", "Fort Oak", 12),
        act("place_propose", "user-a", "Fort Oak", 13)
      ])

    assert converged["place"]["state"] == "locked"
    assert converged["place"]["value"] == "Fort Oak"
    assert converged["place"]["lock_reason"] == "converged"
    assert converged["exact_time"]["value"] == "6:30 PM"
    assert converged["activity"]["value"] == "Dinner"

    cleared =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_propose", "user-b", "Fort Oak", 12),
        act("place_decline", "user-b", nil, 13, "revoked")
      ])

    assert cleared["place"]["state"] == "unknown"
    assert length(cleared["candidates"]) == 3
    assert cleared["exact_time"]["state"] == "locked"
    assert cleared["activity"]["value"] == "Dinner"
  end

  test "declining a proposal returns the shared board and reopening changes only place" do
    declined =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_decline", "user-b", "Juniper & Ivy", 12, "revoked")
      ])

    assert declined["place"]["state"] == "unknown"
    assert length(declined["candidates"]) == 3
    assert declined["exact_time"]["state"] == "locked"

    reopened =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_confirm", "user-b", "Juniper & Ivy", 12, "agreed"),
        act("place_reopen", "user-a", "Juniper & Ivy", 13, "revoked")
      ])

    assert reopened["place"]["state"] == "unknown"
    assert reopened["exact_time"]["state"] == "locked"
    assert reopened["exact_time"]["value"] == "6:30 PM"
    assert reopened["execution"]["state"] == "unknown"
    assert length(reopened["candidates"]) == 3
  end

  test "reservation authorization is shared consent and is not execution" do
    one =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_confirm", "user-b", "Juniper & Ivy", 12, "agreed"),
        act("reservation_authorize", "user-a", "Juniper & Ivy", 13)
      ])

    assert one["execution"]["state"] == "candidate"
    assert one["execution"]["truth"] == "proposed"
    assert one["execution"]["value"] == "reservation_not_sent"
    assert one["execution"]["executed"] == false
    assert one["prompt"] == "Waiting on one response."
    refute one["prompt"] =~ "Nothing was sent"
    assert one["place"]["state"] == "locked"
    assert one["exact_time"]["state"] == "locked"

    both =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10, "user_stated"),
        act("place_propose", "user-a", "Juniper & Ivy", 11),
        act("place_confirm", "user-b", "Juniper & Ivy", 12, "agreed"),
        act("reservation_authorize", "user-a", "Juniper & Ivy", 13),
        act("reservation_authorize", "user-b", "Juniper & Ivy", 14, "agreed")
      ])

    assert both["execution"]["state"] == "agreed"
    assert both["execution"]["truth"] == "agreed"
    assert both["execution"]["executed"] == false
    assert both["commitment"] == "execution_ready"
    assert both["prompt"] == "Reservation approved"
    assert both["detail"] == "Booking hasn't been placed yet."
    assert both["change_quiet"]
    refute both["prompt"] =~ "Nothing was sent"
    refute both["prompt"] =~ "Reserved"
  end

  test "chat can propose and confirm the same place without a second plan" do
    state =
      ConversationAlignment.fold(
        dinner_messages() ++
          [
            %{id: "4", body: "Let's do Juniper & Ivy", sender_user_id: "user-a"},
            %{id: "5", body: "yes", sender_user_id: "user-b"}
          ],
        ["user-a", "user-b"],
        [act("activity_lock", "user-a", "dinner", 10, "user_stated")]
      )

    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Juniper & Ivy"
    assert state["place"]["lock_reason"] == "confirmed"
    assert state["exact_time"]["value"] == "6:30 PM"
  end

  test "actually naming another place reopens only the place" do
    state =
      ConversationAlignment.fold(
        dinner_messages() ++ [%{id: "4", body: "Actually Fort Oak", sender_user_id: "user-b", seq: 20}],
        ["user-a", "user-b"],
        [
          act("activity_lock", "user-a", "dinner", 10, "user_stated"),
          act("place_propose", "user-a", "Juniper & Ivy", 11),
          act("place_confirm", "user-b", "Juniper & Ivy", 12, "agreed")
        ]
      )

    assert state["place"]["state"] == "candidate"
    assert state["place"]["value"] == "Fort Oak"
    assert state["exact_time"]["state"] == "locked"
    assert state["exact_time"]["value"] == "6:30 PM"
  end

  defp dinner_messages do
    [
      msg("1", "Can you meet tomorrow?"),
      msg("2", "Any time after 6 works."),
      msg("3", "Let's do 6:30.")
    ]
  end

  defp dinner_ready, do: ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [act("activity_lock", "user-a", "dinner", 10, "user_stated")])

  defp act(kind, actor, value, seq, truth \\ "proposed") do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "seq" => seq,
      "truth" => truth,
      "explicit" => true
    }
  end
end
