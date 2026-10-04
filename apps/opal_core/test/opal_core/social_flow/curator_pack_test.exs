defmodule OpalCore.SocialFlow.CuratorPackTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.CuratorPack
  alias OpalCore.SocialFlow.DurablePreferenceMemory

  setup do
    viewer =
      %User{}
      |> User.changeset(%{handle: "cur-v-#{System.unique_integer([:positive])}", display_name: "Viewer"})
      |> Repo.insert!()

    peer =
      %User{}
      |> User.changeset(%{handle: "cur-p-#{System.unique_integer([:positive])}", display_name: "Peer"})
      |> Repo.insert!()

    %{viewer: viewer, peer: peer}
  end

  test "assembles N people with empty prefs without crashing", %{viewer: viewer, peer: peer} do
    assert {:ok, pack} = CuratorPack.assemble(viewer.id, [viewer.id, peer.id])

    assert length(pack["participants"]) == 2
    assert pack["relationship_context"] == "friends"
    assert pack["hard_constraints"]["party_size"] == 2
    assert pack["soft_prefs"] == []
    assert pack["shared_pref_leak"] == false
    assert pack["recent_visits"] == []

    Enum.each(pack["participants"], fn p ->
      assert is_list(p["prefs"])
      assert is_list(p["boundaries"])
      assert p["permission_class"] == "owner_private"
    end)
  end

  test "private prefs of peer stay private? and never enter soft_prefs", %{
    viewer: viewer,
    peer: peer
  } do
    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => peer.id,
               "preference" => "quiet restaurants",
               "polarity" => "prefer"
             })

    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => viewer.id,
               "preference" => "italian",
               "polarity" => "prefer"
             })

    assert {:ok, pack} = CuratorPack.assemble(viewer.id, [viewer.id, peer.id])

    assert pack["soft_prefs"] == []

    peer_slot = Enum.find(pack["participants"], &(&1["user_id"] == peer.id))
    viewer_slot = Enum.find(pack["participants"], &(&1["user_id"] == viewer.id))

    assert peer_slot["private?"] == true
    assert viewer_slot["private?"] == false

    peer_prefs = Enum.map(peer_slot["prefs"], & &1["preference"])
    assert "quiet restaurants" in peer_prefs
    Enum.each(peer_slot["prefs"], fn p ->
      assert p["permission_class"] == "owner_private"
      assert p["private?"] == true
    end)

    viewer_prefs = Enum.map(viewer_slot["prefs"], & &1["preference"])
    assert "italian" in viewer_prefs
  end

  test "avoid polarity becomes boundary on participant slot", %{viewer: viewer, peer: peer} do
    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => peer.id,
               "preference" => "sushi",
               "polarity" => "avoid"
             })

    assert {:ok, pack} = CuratorPack.assemble(viewer.id, [viewer.id, peer.id])
    peer_slot = Enum.find(pack["participants"], &(&1["user_id"] == peer.id))

    assert Enum.any?(peer_slot["boundaries"], fn b ->
             b["preference"] == "sushi" or b["summary"] == "sushi"
           end)
  end

  test "unknown user_ids rejected", %{viewer: viewer} do
    ghost = Ecto.UUID.generate()

    assert {:error, {:unknown_users, [^ghost]}} =
             CuratorPack.assemble(viewer.id, [viewer.id, ghost])
  end

  test "empty user_ids rejected", %{viewer: viewer} do
    assert {:error, :user_ids_required} = CuratorPack.assemble(viewer.id, [])
  end
end
