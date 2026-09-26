defmodule OpalCore.MessagesDirectConversationTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  defp insert_user!(name) do
    n = System.unique_integer([:positive])

    %User{}
    |> User.changeset(%{
      display_name: name,
      handle: "p31-#{String.downcase(name)}-#{n}"
    })
    |> Repo.insert!()
  end

  setup do
    a = insert_user!("Founder")
    b = insert_user!("Maya")
    c = insert_user!("Chris")
    %{a: a, b: b, c: c}
  end

  test "ensure_direct creates one dyad", %{a: a, b: b} do
    assert {:ok, r1} = Messages.ensure_direct_conversation(a.id, b.id)
    assert r1.composition == "dyad"
    assert r1.member_count == 2
    assert r1.origin == :created
    assert MapSet.new(r1.member_ids) == MapSet.new([a.id, b.id])
  end

  test "connection- label is not the product title", %{a: a, b: b} do
    assert {:ok, direct} = Messages.ensure_direct_conversation(a.id, b.id)

    Repo.get!(Conversation, direct.conversation_id)
    |> Ecto.Changeset.change(
      label: "connection-#{String.slice(a.id, 0, 8)}-#{String.slice(b.id, 0, 8)}"
    )
    |> Repo.update!()

    row =
      Messages.list_conversations(a.id)
      |> Enum.find(&(&1["id"] == direct.conversation_id))

    assert row["title"] == "Maya"
    refute row["title"] =~ "connection-"
  end

  test "ensure_direct reuses existing dyad (idempotent)", %{a: a, b: b} do
    assert {:ok, r1} = Messages.ensure_direct_conversation(a.id, b.id)
    assert {:ok, r2} = Messages.ensure_direct_conversation(a.id, b.id)
    assert r2.origin == :existing
    assert r2.conversation_id == r1.conversation_id

    assert {:ok, r3} = Messages.ensure_direct_conversation(b.id, a.id)
    assert r3.conversation_id == r1.conversation_id
  end

  test "ensure_direct never returns multi-party group", %{a: a, b: b, c: c} do
    assert {:ok, group} = Messages.create_group_conversation(a.id, [b.id, c.id])
    assert group.member_count >= 3

    assert {:ok, direct} = Messages.ensure_direct_conversation(a.id, b.id)
    assert direct.conversation_id != group.conversation_id
    assert direct.composition == "dyad"
    assert direct.member_count == 2

    members = Messages.member_user_ids(direct.conversation_id)
    assert length(members) == 2
    refute c.id in members
  end

  test "shared group membership must not widen dyadic invitation", %{a: a, b: b, c: c} do
    {:ok, _} = Messages.create_group_conversation(a.id, [b.id, c.id], label: "Saturday Circle")
    {:ok, direct} = Messages.ensure_direct_conversation(a.id, b.id)

    count =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^direct.conversation_id,
        select: count(cm.id)
      )
      |> Repo.one()

    assert count == 2
  end

  test "ensure_direct is stable when historical duplicate dyads exist", %{a: a, b: b} do
    assert {:ok, r1} = Messages.ensure_direct_conversation(a.id, b.id)

    # Simulate historical duplicate (pre-S1.1 race residue)
    {:ok, r_dup} =
      Repo.transaction(fn ->
        {:ok, conv} =
          %OpalCore.Messaging.Conversation{}
          |> OpalCore.Messaging.Conversation.changeset(%{
            label: "dup-direct-#{System.unique_integer([:positive])}"
          })
          |> Repo.insert()

        Enum.each([a.id, b.id], fn uid ->
          %ConversationMember{}
          |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
          |> Repo.insert!()
        end)

        conv.id
      end)

    assert is_binary(r_dup)
    assert r_dup != r1.conversation_id

    assert {:ok, r2} = Messages.ensure_direct_conversation(a.id, b.id)
    assert {:ok, r3} = Messages.ensure_direct_conversation(b.id, a.id)
    # Always the oldest dyad — never oscillate between duplicates
    assert r2.conversation_id == r1.conversation_id
    assert r3.conversation_id == r1.conversation_id
    assert r2.origin == :existing
  end
end
