defmodule OpalCore.SocialFlow.SmokeResidueTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SmokeResidue

  test "detects SF17 harness labels" do
    assert SmokeResidue.smoke_body?("SF17 live ping 1785790250157")
    assert SmokeResidue.smoke_body?("RT live 1785792744696")
    assert SmokeResidue.smoke_body?("RT reply 1785792747066")
    assert SmokeResidue.smoke_body?("OFF1 1785794226655")
    assert SmokeResidue.smoke_body?("REG 1785795265501")
    assert SmokeResidue.smoke_body?("SF17-GHCR-1785798194-MISS")
    assert SmokeResidue.smoke_body?("SAFRT98490")
  end

  test "does not flag ordinary social text" do
    refute SmokeResidue.smoke_body?("We should get dinner Thursday.")
    refute SmokeResidue.smoke_body?("I'm free after 6:30.")
    refute SmokeResidue.smoke_body?("Hope your morning is calm.")
    refute SmokeResidue.smoke_body?("OFF to the store")
  end

  test "cleanup deletes only smoke rows and is idempotent" do
    uid = System.unique_integer([:positive])

    {:ok, u} =
      %User{}
      |> User.changeset(%{display_name: "T", handle: "smoke-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "smoke-#{uid}"})
      |> Repo.insert()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
    |> Repo.insert!()

    smoke =
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: u.id,
        client_message_id: "smoke-1",
        message_type: "text",
        body: "SF17 live ping 111",
        server_seq: 1
      })
      |> Repo.insert!()

    keep =
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: u.id,
        client_message_id: "keep-1",
        message_type: "text",
        body: "We should get dinner Thursday.",
        server_seq: 2
      })
      |> Repo.insert!()

    {n, ids} = SmokeResidue.cleanup!(force: true)
    assert n >= 1
    assert smoke.id in ids
    assert Repo.get(Message, smoke.id) == nil
    assert Repo.get(Message, keep.id)

    {n2, _} = SmokeResidue.cleanup!(force: true)
    assert n2 == 0
  end
end
