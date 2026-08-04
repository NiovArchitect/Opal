defmodule OpalCore.SocialFlow.ProductSignalsTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.ProductSignals

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "sig-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "sig-b-#{uid}"})
      |> Repo.insert()

    {:ok, c} =
      %User{}
      |> User.changeset(%{display_name: "C", handle: "sig-c-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "a-b-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, c: c, conv: conv}
  end

  defp put_msg(conv, user, body, seq) do
    %Message{}
    |> Message.create_changeset(%{
      conversation_id: conv.id,
      sender_user_id: user.id,
      client_message_id: "cm-#{seq}-#{System.unique_integer([:positive])}",
      message_type: "text",
      body: body,
      server_seq: seq
    })
    |> Repo.insert!()
  end

  test "quiet conversation has no signal", %{a: a, conv: conv} do
    put_msg(conv, a, "Hope your morning is calm.", 1)
    assert {:ok, []} = ProductSignals.signals_for_conversation(conv.id, a.id)
  end

  test "plan-forming language yields Becoming a plan", %{a: a, conv: conv} do
    put_msg(conv, a, "We should get dinner Thursday.", 1)
    assert {:ok, [sig]} = ProductSignals.signals_for_conversation(conv.id, a.id)
    assert sig["label"] == "Becoming a plan"
    assert sig["kind"] == "plan_forming"
    assert sig["not_identity_label"] == true
    assert sig["privacy_class"] == "shared_progress"
  end

  test "availability advances lifecycle to Still open", %{a: a, b: b, conv: conv} do
    put_msg(conv, a, "We should get dinner Thursday.", 1)
    put_msg(conv, b, "I'm free after 6:30. Does Thursday work?", 2)
    assert {:ok, [sig]} = ProductSignals.signals_for_conversation(conv.id, a.id)
    assert sig["label"] == "Still open"
    assert sig["lifecycle_stage"] == "still_open"
  end

  test "confirmation yields Ready", %{a: a, b: b, conv: conv} do
    put_msg(conv, a, "We should get dinner Thursday.", 1)
    put_msg(conv, b, "I'm free after 6:30.", 2)
    put_msg(conv, a, "It's a plan. See you there.", 3)
    assert {:ok, [sig]} = ProductSignals.signals_for_conversation(conv.id, a.id)
    assert sig["label"] == "Ready"
  end

  test "handled resolves the journey signal", %{a: a, conv: conv} do
    put_msg(conv, a, "We should get dinner Thursday.", 1)
    put_msg(conv, a, "Reservation is confirmed for 7.", 2)
    assert {:ok, [sig]} = ProductSignals.signals_for_conversation(conv.id, a.id)
    assert sig["label"] == "Handled"
    assert sig["status"] == "resolved"
  end

  test "smoke residue never creates signals", %{a: a, conv: conv} do
    put_msg(conv, a, "SF17 live ping 1785790250157", 1)
    put_msg(conv, a, "RT live 1785792744696", 2)
    assert {:ok, []} = ProductSignals.signals_for_conversation(conv.id, a.id)
  end

  test "non-member cannot read signals", %{c: c, conv: conv, a: a} do
    put_msg(conv, a, "We should get dinner Thursday.", 1)
    assert {:error, :not_a_member} = ProductSignals.signals_for_conversation(conv.id, c.id)
  end
end
