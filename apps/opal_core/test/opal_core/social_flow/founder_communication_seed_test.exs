defmodule OpalCore.SocialFlow.FounderCommunicationSeedTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.FounderCommunicationSeed

  setup do
    viewer =
      %User{}
      |> User.changeset(%{
        id: Ecto.UUID.generate(),
        handle: "founder-viewer-#{System.unique_integer([:positive])}",
        display_name: "Founder Review"
      })
      |> Repo.insert!()

    %{viewer: viewer}
  end

  test "refuses without explicit opt-in", %{viewer: viewer} do
    assert {:error, :explicit_opt_in_required} =
             FounderCommunicationSeed.ensure!(viewer.id, explicit_opt_in: false)
  end

  test "provisions five founder directs + Saturday Crew group via Messages", %{viewer: viewer} do
    assert {:ok, payload} =
             FounderCommunicationSeed.ensure!(viewer.id, explicit_opt_in: true)

    assert payload["parallel_chat_owner"] == false
    assert payload["via"] == "Messages"
    assert payload["founder_phone_chat_rows"] == 5
    # Repair #19 (W1): peers carry full human names — the display
    # strings are what the founder reviews on every surface.
    assert payload["direct"]["peer_display_name"] == "Chanelle Brooks"
    assert is_binary(payload["direct"]["conversation_id"])
    assert payload["group"]["label"] == "Saturday Crew"
    assert length(payload["group"]["member_ids"]) >= 3

    directs = payload["directs"]
    assert is_map(directs)

    for key <- ["chanelle", "maya", "sabrina", "alex"] do
      assert is_binary(directs[key]["conversation_id"])

      assert directs[key]["peer_display_name"] in [
               "Chanelle Brooks",
               "Maya Torres",
               "Sabrina Nguyen",
               "Alex Rivera"
             ]
    end

    convs = Messages.list_conversations(viewer.id)
    # 4 directs + 1 group
    assert length(convs) >= 5

    titles = Enum.map(convs, & &1["title"])
    assert "Chanelle" in titles or Enum.any?(titles, &String.contains?(&1, "Chanelle"))
    assert Enum.any?(titles, &String.contains?(&1, "Maya"))
    assert Enum.any?(titles, &String.contains?(&1, "Sabrina"))
    assert Enum.any?(titles, &String.contains?(&1, "Alex"))
    assert "Saturday Crew" in titles

    compositions = Enum.map(convs, & &1["composition"])
    assert "dyad" in compositions
    assert "group" in compositions
  end

  test "idempotent on second ensure", %{viewer: viewer} do
    assert {:ok, first} =
             FounderCommunicationSeed.ensure!(viewer.id, explicit_opt_in: true)

    assert {:ok, second} =
             FounderCommunicationSeed.ensure!(viewer.id, explicit_opt_in: true)

    assert first["direct"]["conversation_id"] == second["direct"]["conversation_id"]
    assert first["group"]["conversation_id"] == second["group"]["conversation_id"]

    assert first["directs"]["maya"]["conversation_id"] ==
             second["directs"]["maya"]["conversation_id"]

    assert length(Messages.list_conversations(viewer.id)) >= 5
  end
end
