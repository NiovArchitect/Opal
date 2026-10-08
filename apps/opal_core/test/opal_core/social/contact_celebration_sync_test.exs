defmodule OpalCore.Social.ContactCelebrationSyncTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Celebrations
  alias OpalCore.Social.ContactCelebrationSync
  alias OpalCore.SocialMemory.TemporalAnchor
  alias OpalCore.Repo

  test "selected contact with birthday creates celebration + temporal anchor" do
    account_id = Ecto.UUID.generate()

    assert {:ok, result} =
             ContactCelebrationSync.sync_selected_contact(account_id, %{
               "name" => "Maya",
               "birthday" => %{"month" => 6, "day" => 14, "year" => 1992}
             })

    assert result.provenance == "observed"
    assert length(result.celebrations) == 1
    [c] = result.celebrations
    assert c.person_name == "Maya"
    assert c.kind == "birthday"
    assert c.month == 6
    assert c.day == 14
    assert c.notes == "from your contacts"

    anchors = Repo.all(TemporalAnchor)
    assert Enum.any?(anchors, fn a -> a.account_id == account_id and a.anchor_type == "birthday" end)
  end

  test "no date fields → nothing (never invents)" do
    account_id = Ecto.UUID.generate()

    assert {:ok, :nothing} =
             ContactCelebrationSync.sync_selected_contact(account_id, %{"name" => "Sam"})

    assert {:ok, []} = Celebrations.list_for_user(account_id)
  end

  test "idempotent on same name+kind" do
    account_id = Ecto.UUID.generate()
    attrs = %{"name" => "Alex", "birthday" => %{"month" => 1, "day" => 2}}

    assert {:ok, _} = ContactCelebrationSync.sync_selected_contact(account_id, attrs)
    assert {:ok, _} = ContactCelebrationSync.sync_selected_contact(account_id, attrs)
    assert {:ok, list} = Celebrations.list_for_user(account_id)
    assert length(list) == 1
  end
end
