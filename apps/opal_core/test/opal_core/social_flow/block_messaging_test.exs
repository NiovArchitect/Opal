defmodule OpalCore.SocialFlow.BlockMessagingTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Messages
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.TrustSafety
  alias OpalCore.Accounts.User

  test "active block freezes messaging and history both directions" do
    a = insert_user!("block-a")
    b = insert_user!("block-b")
    conv = insert_conversation!([a.id, b.id])

    assert {:ok, _, :created} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: a.id,
               client_message_id: "pre-block",
               body: "hello"
             })

    assert {:ok, _, _} =
             TrustSafety.create_block(%{
               blocker_user_id: a.id,
               blocked_user_id: b.id,
               conversation_id: conv.id,
               scope: "relationship",
               idempotency_key: "blk-msg-test"
             })

    assert {:error, :blocked} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: b.id,
               client_message_id: "after-block-b",
               body: "still here"
             })

    assert {:error, :blocked} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: a.id,
               client_message_id: "after-block-a",
               body: "blocker msg"
             })

    assert {:error, :blocked} = Messages.list_messages(conv.id, b.id)
    assert {:error, :blocked} = Messages.list_messages(conv.id, a.id)
  end

  defp insert_user!(handle) do
    {:ok, u} =
      %User{}
      |> User.changeset(%{
        display_name: handle,
        handle: handle <> Integer.to_string(System.unique_integer([:positive]))
      })
      |> Repo.insert()

    u
  end

  defp insert_conversation!(user_ids) do
    uid = System.unique_integer([:positive])

    {:ok, c} =
      %Conversation{}
      |> Conversation.changeset(%{label: "block-#{uid}"})
      |> Repo.insert()

    Enum.each(user_ids, fn peer ->
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: c.id, user_id: peer})
      |> Repo.insert!()
    end)

    c
  end
end
