defmodule OpalCore.SocialFlow.CoreSocialFlowContractTest do
  @moduledoc """
  Founder-proven alignment transitions. A later change may not relax these.
  """

  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.ConversationAlignment

  test "dinner through reservation, a time proposal, then an activity change" do
    base = [
      msg("1", "Can you meet tomorrow?"),
      msg("2", "Any time after 6 works."),
      msg("3", "Let's do 6:30.")
    ]

    dinner =
      ConversationAlignment.fold(base, ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10)
      ])

    assert dinner["exact_time"]["state"] == "locked"
    assert dinner["exact_time"]["value"] == "6:30 PM"
    assert dinner["activity"]["value"] == "Dinner"
    assert Enum.map(dinner["candidates"], & &1["name"]) == ["Juniper & Ivy", "Herb & Wood", "Fort Oak"]

    named =
      ConversationAlignment.fold(base, ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10),
        act("place_propose", "user-a", "Herb & Wood", 11),
        act("place_confirm", "user-b", "Herb & Wood", 12)
      ])

    assert named["place"]["value"] == "Herb & Wood"
    assert named["place"]["state"] == "locked"
    assert named["commitment"] == "aligned"

    approved =
      ConversationAlignment.fold(base, ["user-a", "user-b"], [
        act("activity_lock", "user-a", "dinner", 10),
        act("place_propose", "user-a", "Herb & Wood", 11),
        act("place_confirm", "user-b", "Herb & Wood", 12),
        act("reservation_authorize", "user-a", "Herb & Wood", 13),
        act("reservation_authorize", "user-b", "Herb & Wood", 14)
      ])

    assert approved["commitment"] == "execution_ready"
    assert approved["execution"]["executed"] == false

    # Accepting a new time clears reservation approval and drops commitment
    # back to aligned. Activity must still be proposable from that state.
    retimed =
      ConversationAlignment.fold(
        base ++ [%{id: "9", body: "7 PM", sender_user_id: "user-a", seq: 20}],
        ["user-a", "user-b"],
        [
          act("activity_lock", "user-a", "dinner", 10),
          act("place_propose", "user-a", "Herb & Wood", 11),
          act("place_confirm", "user-b", "Herb & Wood", 12),
          act("reservation_authorize", "user-a", "Herb & Wood", 13),
          act("reservation_authorize", "user-b", "Herb & Wood", 14),
          act("change_accept", "user-b", "7:00 PM", 21)
        ]
      )

    assert retimed["exact_time"]["value"] == "7:00 PM"
    assert retimed["place"]["value"] == "Herb & Wood"
    assert retimed["activity"]["value"] == "Dinner"
    assert retimed["execution"]["state"] == "unknown"
    assert retimed["commitment"] == "aligned"

    proposed =
      ConversationAlignment.fold(
        base ++ [%{id: "9", body: "7 PM", sender_user_id: "user-a", seq: 20}],
        ["user-a", "user-b"],
        [
          act("activity_lock", "user-a", "dinner", 10),
          act("place_propose", "user-a", "Herb & Wood", 11),
          act("place_confirm", "user-b", "Herb & Wood", 12),
          act("reservation_authorize", "user-a", "Herb & Wood", 13),
          act("reservation_authorize", "user-b", "Herb & Wood", 14),
          act("change_accept", "user-b", "7:00 PM", 21),
          act("change_propose", "user-a", "Coffee", 22) |> Map.put("field", "activity")
        ]
      )

    assert proposed["activity"]["value"] == "Dinner"
    assert proposed["place"]["value"] == "Herb & Wood"
    assert proposed["exact_time"]["value"] == "7:00 PM"
    assert proposed["change_proposal"]["field"] == "activity"
    assert proposed["change_proposal"]["value"] == "Coffee"

    accepted =
      ConversationAlignment.fold(
        base ++ [%{id: "9", body: "7 PM", sender_user_id: "user-a", seq: 20}],
        ["user-a", "user-b"],
        [
          act("activity_lock", "user-a", "dinner", 10),
          act("place_propose", "user-a", "Herb & Wood", 11),
          act("place_confirm", "user-b", "Herb & Wood", 12),
          act("reservation_authorize", "user-a", "Herb & Wood", 13),
          act("reservation_authorize", "user-b", "Herb & Wood", 14),
          act("change_accept", "user-b", "7:00 PM", 21),
          act("change_propose", "user-a", "church", 22) |> Map.put("field", "activity"),
          act("change_accept", "user-b", "Church", 23)
        ]
      )

    assert accepted["date"]["state"] == "locked"
    assert accepted["exact_time"]["value"] == "7:00 PM"
    assert accepted["activity"]["value"] == "Church"
    assert accepted["activity"]["category"] == "faith"
    assert accepted["place"]["state"] == "unknown"
    assert accepted["execution"]["state"] == "unknown"
    assert accepted["candidates"] in [nil, []]
    assert accepted["prompt"] =~ "Search connection not available yet"
    refute accepted["prompt"] =~ "Herb & Wood"
  end

  defp msg(id, body), do: %{id: id, body: body}

  defp act(kind, actor, value, seq) do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "seq" => seq,
      "truth" => "proposed",
      "explicit" => true
    }
  end
end
