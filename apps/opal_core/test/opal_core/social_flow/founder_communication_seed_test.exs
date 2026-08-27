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

  test "provisions Direct Chanelle + Saturday Crew group via Messages", %{viewer: viewer} do
    assert {:ok, payload} =
             FounderCommunicationSeed.ensure!(viewer.id, explicit_opt_in: true)

    assert payload["parallel_chat_owner"] == false
    assert payload["via"] == "Messages"
    assert payload["direct"]["peer_display_name"] == "Chanelle"
    assert is_binary(payload["direct"]["conversation_id"])
    assert payload["group"]["label"] == "Saturday Crew"
    assert length(payload["group"]["member_ids"]) >= 3

    convs = Messages.list_conversations(viewer.id)
    assert length(convs) >= 2

    titles = Enum.map(convs, & &1["title"])
    assert "Chanelle" in titles or Enum.any?(titles, &String.contains?(&1, "Chanelle"))
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
    assert length(Messages.list_conversations(viewer.id)) >= 2
  end
end
