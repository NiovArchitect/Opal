defmodule OpalCore.Social.LifeEventsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Repo
  alias OpalCore.Social.LifeEvents
  alias OpalCore.SocialMemory.PersonMemory

  test "detect engagement" do
    assert %{event_type: "engagement", person_name: "Maya"} =
             LifeEvents.detect("Maya just got engaged")
  end

  test "user-told engagement → person memory + open loop + temporal anchor" do
    account_id = Ecto.UUID.generate()

    assert {:ok, result} =
             LifeEvents.ingest_user_told(account_id, "Maya just got engaged")

    assert result.event_type == "engagement"
    assert result.person_name == "Maya"
    assert result.nudge_path == :recall_open_loop_or_temporal

    pm = Repo.get!(PersonMemory, result.person_memory_id)
    assert get_in(pm.known_facts, ["life_event.engagement", "provenance"]) == "stated"
    assert Enum.any?(pm.open_loops || [], fn l -> String.contains?(l["description"] || "", "engagement") end)

    assert result.anchor
  end

  test "non life-event text → none" do
    account_id = Ecto.UUID.generate()
    assert {:ok, :none} = LifeEvents.ingest_user_told(account_id, "want coffee tomorrow?")
  end
end
