defmodule OpalCore.Repair20GroupOrbitScopeTest do
  @moduledoc """
  Repair #20 (F-19) — the GROUP doorway birth pins: a scoped Opal
  session for a group thread is anchored to the conversation
  itself (the full party set), because no single person scopes a
  group honestly. Fail-closed legs: a dyad may not take the
  conversation scope (it keeps the person scope), a non-member
  may not scope to a conversation at all, and a plan from another
  conversation may not ride the group scope.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.OpalConversations
  alias OpalCore.Repo
  alias OpalCore.SocialFlow

  defp fresh_user(name) do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{id: Ecto.UUID.generate(), handle: "r20g-#{suffix}", display_name: name})
    |> Repo.insert!()
  end

  defp conversation_with(members, label \\ nil) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{
        id: Ecto.UUID.generate(),
        label: label || "group-#{Ecto.UUID.generate()}"
      })
      |> Repo.insert!()

    for uid <- members do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv
  end

  test "a group conversation scopes a session to the conversation anchor, party carried live" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    c = fresh_user("Cy")
    group = conversation_with([a.id, b.id, c.id])

    assert {:ok, %{conversation: session}} =
             OpalConversations.create_scoped_session(a.id, %{
               "conversation_id" => group.id
             })

    assert session.anchor_type == "conversation"
    assert session.anchor_id == group.id
    assert session.context_conversation_id == group.id
    assert session.context_person_id == nil

    contract = OpalConversations.to_conversation_contract(session, [])
    assert contract["anchor"]["type"] == "conversation"
    assert contract["anchor"]["id"] == group.id
    assert contract["context"]["conversation_id"] == group.id
    assert contract["context"]["person_id"] == nil

    party = contract["context"]["party"]
    assert MapSet.new(Enum.map(party, & &1["id"])) == MapSet.new([b.id, c.id])
    names = Map.new(party, &{&1["id"], &1["display_name"]})
    assert names[b.id] == "Bea"
    assert names[c.id] == "Cy"
  end

  test "a group scope with the conversation's own plan anchors to the plan" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    c = fresh_user("Cy")
    group = conversation_with([a.id, b.id, c.id])

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(group.id, a.id, %{
        "title" => "Group orbit plan #{System.unique_integer([:positive])}"
      })

    assert {:ok, %{conversation: session}} =
             OpalConversations.create_scoped_session(a.id, %{
               "conversation_id" => group.id,
               "plan_id" => plan.id
             })

    assert session.anchor_type == "plan"
    assert session.anchor_id == plan.id
    assert session.context_plan_id == plan.id
    assert session.context_conversation_id == group.id
    assert session.context_person_id == nil
  end

  test "fail-closed: dyad conversation scope, non-member, and a foreign plan" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    c = fresh_user("Cy")
    outsider = fresh_user("Ola")
    dyad = conversation_with([a.id, b.id])
    group = conversation_with([a.id, b.id, c.id])
    other_group = conversation_with([a.id, b.id, outsider.id])

    # A dyad keeps the person scope; the conversation scope refuses it.
    assert {:error, :invalid_scope} =
             OpalConversations.create_scoped_session(a.id, %{
               "conversation_id" => dyad.id
             })

    # A non-member cannot scope to the group at all.
    assert {:error, :invalid_scope} =
             OpalConversations.create_scoped_session(outsider.id, %{
               "conversation_id" => group.id
             })

    # A plan belonging to a DIFFERENT conversation cannot ride along.
    {:ok, foreign_plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(other_group.id, a.id, %{
        "title" => "Foreign plan #{System.unique_integer([:positive])}"
      })

    assert {:error, :invalid_scope} =
             OpalConversations.create_scoped_session(a.id, %{
               "conversation_id" => group.id,
               "plan_id" => foreign_plan.id
             })

    # And the person scope still works exactly as before.
    assert {:ok, %{conversation: person_session}} =
             OpalConversations.create_scoped_session(a.id, %{
               "person_id" => b.id,
               "conversation_id" => dyad.id
             })

    assert person_session.anchor_type == "person"
    assert person_session.context_person_id == b.id
  end

  test "a conversation anchor can be set on an existing session by a member only" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    c = fresh_user("Cy")
    outsider = fresh_user("Ola")
    group = conversation_with([a.id, b.id, c.id])

    assert {:ok, session} = OpalConversations.get_or_create_conversation(a.id)

    assert {:ok, anchored} =
             OpalConversations.set_anchor(a.id, session.id, %{
               "type" => "conversation",
               "id" => group.id
             })

    assert anchored.anchor_type == "conversation"
    assert anchored.anchor_id == group.id
    assert anchored.context_conversation_id == group.id

    assert {:ok, other} = OpalConversations.get_or_create_conversation(outsider.id)

    assert {:error, _} =
             OpalConversations.set_anchor(outsider.id, other.id, %{
               "type" => "conversation",
               "id" => group.id
             })
  end
end
