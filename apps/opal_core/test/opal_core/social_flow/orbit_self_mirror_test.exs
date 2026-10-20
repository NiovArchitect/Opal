defmodule OpalCore.SocialFlow.OrbitSelfMirrorTest do
  @moduledoc """
  Repair #20 amendment - THE SELF-MIRROR (Orbit Ethics article 3):
  Orbit usage is visible to the user themselves in their own
  activity - a mirror, never a lock, QUIET.

  The write path is the real one: a scoped (orbit) Opal session
  birth - the one choke point every orbit session is born through
  (`OpalConversations.create_scoped_session/2` ->
  `insert_scoped_session/2`) - records an `orbit_session_started`
  entry on the owner's OWN account activity trail
  (`AccountActivity`, the trail the Settings activity read serves
  per-user). The entry carries ids and the anchor only, never
  message content, and nothing reads it to gate anything.

  Pins: the owner's trail gains the entry with the session's scope;
  another account's trail gains nothing (owner-only visibility by
  construction); an unscoped plain session birth records no orbit
  entry (the mirror does not invent orbit use).
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.{AccountActivity, User}
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.OpalConversations
  alias OpalCore.Repo

  defp fresh_user(name) do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{id: Ecto.UUID.generate(), handle: "mir-#{suffix}", display_name: name})
    |> Repo.insert!()
  end

  defp dyad(a, b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{
        id: Ecto.UUID.generate(),
        label: "mirror-#{Ecto.UUID.generate()}"
      })
      |> Repo.insert!()

    for uid <- [a.id, b.id] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv
  end

  defp orbit_entries(user_id) do
    user_id
    |> AccountActivity.list_for_user()
    |> Enum.filter(&(&1.kind == "orbit_session_started"))
  end

  test "a scoped orbit session birth lands on the owner's own activity trail only" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    conv = dyad(a, b)

    assert {:ok, %{conversation: session}} =
             OpalConversations.create_scoped_session(a.id, %{
               "person_id" => b.id,
               "conversation_id" => conv.id
             })

    assert [entry] = orbit_entries(a.id)
    assert entry.user_id == a.id
    assert entry.subject == session.id
    assert entry.detail["anchor_type"] == "person"
    assert entry.detail["anchor_id"] == b.id
    assert entry.detail["context_person_id"] == b.id
    assert entry.detail["context_conversation_id"] == conv.id
    # No content in the mirror: ids and anchor facts only.
    refute Map.has_key?(entry.detail, "body")
    refute Map.has_key?(entry.detail, "message")

    # Owner-only: B's trail (and any third account's read of their
    # own trail) carries no trace of A's orbit session.
    assert orbit_entries(b.id) == []
    assert AccountActivity.count_for_user(b.id, "orbit_session_started") == 0
    assert AccountActivity.count_for_user(a.id, "orbit_session_started") == 1
  end

  test "repeated orbit sessions accumulate quietly - the lean is visible to the user themselves" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    conv = dyad(a, b)

    for _ <- 1..3 do
      assert {:ok, _} =
               OpalConversations.create_scoped_session(a.id, %{
                 "person_id" => b.id,
                 "conversation_id" => conv.id
               })
    end

    assert length(orbit_entries(a.id)) == 3
    assert orbit_entries(b.id) == []
  end
end
