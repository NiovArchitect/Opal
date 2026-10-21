defmodule OpalCore.R21GroupMembershipTest do
  @moduledoc """
  Repair #21 (W-5b) - group membership on the real ConversationMember
  machinery:

  - multi-select add in ONE action, through the same add path as the
    single add (same recording, same idempotency);
  - the admin rule: only the conversation's creator may remove
    someone else; anyone may remove themselves (leave);
  - join / leave / remove events recorded into the conversation's
    durable record (Chronology moments), readable back through
    `Messages.membership_events/1` AND the orbit projection;
  - the orbit identity never moves: a membership change never mints
    a new conversation.
  """
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper, Messages, Repo}
  alias OpalCore.Accounts.AccountActivity
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.SocialFlow.{GroupMembership, OrbitProjection}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp make_group do
    {:ok, result} =
      Messages.create_group_conversation(
        Fixtures.user_alex_id(),
        [Fixtures.user_jordan_id(), Fixtures.user_maya_id(), Fixtures.user_chris_id()],
        label: "r21-group"
      )

    result.conversation_id
  end

  test "group creation records its creator on the conversation record" do
    cid = make_group()

    assert Repo.get!(Conversation, cid).created_by_user_id == Fixtures.user_alex_id()
    assert Messages.conversation_creator_id(cid) == Fixtures.user_alex_id()
  end

  test "creator falls back to the earliest member on record when the row carries none" do
    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "r21-legacy-group"})
      |> Repo.insert()

    for uid <- [Fixtures.user_maya_id(), Fixtures.user_chris_id(), Fixtures.user_taylor_id()] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    # Deterministic record order: Maya's membership is the oldest.
    Repo.update_all(
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conv.id and cm.user_id == ^Fixtures.user_maya_id()
      ),
      set: [inserted_at: ~U[2026-01-01 00:00:00.000000Z]]
    )

    Repo.update_all(
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conv.id and cm.user_id != ^Fixtures.user_maya_id()
      ),
      set: [inserted_at: ~U[2026-01-02 00:00:00.000000Z]]
    )

    assert Messages.conversation_creator_id(conv.id) == Fixtures.user_maya_id()

    # And the fallback creator carries the admin right.
    assert {:ok, _} =
             Messages.remove_conversation_member(
               conv.id,
               Fixtures.user_maya_id(),
               Fixtures.user_chris_id()
             )

    assert {:error, :not_creator} =
             Messages.remove_conversation_member(
               conv.id,
               Fixtures.user_taylor_id(),
               Fixtures.user_maya_id()
             )
  end

  test "multi-add adds several people in one action, on the same conversation" do
    cid = make_group()
    conversations_before = Repo.aggregate(Conversation, :count)

    assert {:ok, result} =
             Messages.add_conversation_members(cid, Fixtures.user_alex_id(), [
               Fixtures.user_taylor_id(),
               Fixtures.user_marcus_id()
             ])

    assert result.conversation_id == cid
    assert Enum.sort(result.added_ids) == Enum.sort([Fixtures.user_taylor_id(), Fixtures.user_marcus_id()])
    assert result.already_member_ids == []
    assert result.member_count == 6
    assert Repo.aggregate(Conversation, :count) == conversations_before

    # Re-adding reports already-member and records nothing twice.
    assert {:ok, again} =
             Messages.add_conversation_members(cid, Fixtures.user_alex_id(), [
               Fixtures.user_taylor_id()
             ])

    assert again.added_ids == []
    assert again.already_member_ids == [Fixtures.user_taylor_id()]

    events = Messages.membership_events(cid)
    taylor_joins = Enum.filter(events, &(&1["target_user_id"] == Fixtures.user_taylor_id()))
    assert length(taylor_joins) == 1
    assert hd(taylor_joins)["kind"] == "member_added"
    assert hd(taylor_joins)["label"] == "Taylor joined the conversation"
  end

  test "a non-member cannot add anyone" do
    cid = make_group()

    assert {:error, :not_a_member} =
             Messages.add_conversation_members(cid, Fixtures.user_evelyn_id(), [
               Fixtures.user_taylor_id()
             ])
  end

  test "removal: creator removes another, non-creator cannot, anyone can leave" do
    cid = make_group()

    # A non-creator member cannot remove someone else.
    assert {:error, :not_creator} =
             Messages.remove_conversation_member(
               cid,
               Fixtures.user_jordan_id(),
               Fixtures.user_maya_id()
             )

    assert Fixtures.user_maya_id() in Messages.member_user_ids(cid)

    # The same rule binds the older GroupMembership entry point -
    # it delegates to this path now, it does not bypass it.
    assert {:error, :not_creator} =
             GroupMembership.remove_member(
               cid,
               Fixtures.user_jordan_id(),
               Fixtures.user_maya_id()
             )

    # A non-member cannot remove anyone at all.
    assert {:error, :not_a_member} =
             Messages.remove_conversation_member(
               cid,
               Fixtures.user_evelyn_id(),
               Fixtures.user_maya_id()
             )

    # The creator cannot remove someone who is not in the conversation.
    assert {:error, :target_not_a_member} =
             Messages.remove_conversation_member(
               cid,
               Fixtures.user_alex_id(),
               Fixtures.user_evelyn_id()
             )

    # Anyone may remove themselves (leave).
    assert {:ok, left} =
             Messages.remove_conversation_member(
               cid,
               Fixtures.user_jordan_id(),
               Fixtures.user_jordan_id()
             )

    assert left.left == true
    assert left.conversation_id == cid
    refute Fixtures.user_jordan_id() in Messages.member_user_ids(cid)

    # The creator may remove another member.
    assert {:ok, removed} =
             Messages.remove_conversation_member(
               cid,
               Fixtures.user_alex_id(),
               Fixtures.user_maya_id()
             )

    assert removed.left == false
    refute Fixtures.user_maya_id() in Messages.member_user_ids(cid)

    # The conversation itself is untouched - same id, still there.
    assert Repo.get!(Conversation, cid).id == cid
  end

  test "join / leave / remove events land in the record the orbit reads" do
    cid = make_group()

    {:ok, _} =
      Messages.add_conversation_members(cid, Fixtures.user_alex_id(), [Fixtures.user_taylor_id()])

    {:ok, _} =
      Messages.remove_conversation_member(
        cid,
        Fixtures.user_jordan_id(),
        Fixtures.user_jordan_id()
      )

    {:ok, _} =
      Messages.remove_conversation_member(cid, Fixtures.user_alex_id(), Fixtures.user_maya_id())

    events = Messages.membership_events(cid)
    labels = Enum.map(events, & &1["label"])
    assert "Taylor joined the conversation" in labels
    assert "Jordan left the conversation" in labels
    assert "Maya was removed from the conversation" in labels

    # The orbit projection carries the same events, and its identity
    # is the same conversation after every change.
    orbit = OrbitProjection.for_conversation(Fixtures.user_alex_id(), cid)
    assert orbit["conversation_id"] == cid
    orbit_labels = Enum.map(orbit["membership_events"], & &1["label"])
    assert "Taylor joined the conversation" in orbit_labels
    assert "Jordan left the conversation" in orbit_labels
    assert "Maya was removed from the conversation" in orbit_labels

    # The account activity trail carries the events too.
    assert AccountActivity.count_for_user(Fixtures.user_taylor_id(), "conversation_member_added") >=
             1

    assert AccountActivity.count_for_user(Fixtures.user_alex_id(), "conversation_member_removed") >=
             1
  end

  test "membership projection: flags are decided from the record, per viewer" do
    cid = make_group()

    assert {:ok, creator_view} = Messages.membership_projection(cid, Fixtures.user_alex_id())
    assert creator_view["creator_user_id"] == Fixtures.user_alex_id()
    assert creator_view["viewer_is_creator"] == true

    by_id = Map.new(creator_view["members"], &{&1["user_id"], &1})
    assert by_id[Fixtures.user_alex_id()]["is_creator"] == true
    assert by_id[Fixtures.user_alex_id()]["can_remove"] == true
    assert by_id[Fixtures.user_maya_id()]["can_remove"] == true

    assert {:ok, member_view} = Messages.membership_projection(cid, Fixtures.user_maya_id())
    assert member_view["viewer_is_creator"] == false
    by_id = Map.new(member_view["members"], &{&1["user_id"], &1})
    # Maya may remove only herself; she cannot remove the creator.
    assert by_id[Fixtures.user_maya_id()]["can_remove"] == true
    assert by_id[Fixtures.user_alex_id()]["can_remove"] == false

    assert {:error, :not_a_member} =
             Messages.membership_projection(cid, Fixtures.user_evelyn_id())
  end
end
