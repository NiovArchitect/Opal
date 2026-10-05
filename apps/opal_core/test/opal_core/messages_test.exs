defmodule OpalCore.MessagesTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper, Messages, Repo}
  alias OpalCore.Messaging.Message

  setup do
    FixturesHelper.seed!()
    :ok
  end

  test "accepts message and assigns server_seq" do
    assert {:ok, msg, :created} =
             Messages.accept_message(%{
               conversation_id: Fixtures.conv_alex_jordan_id(),
               sender_user_id: Fixtures.user_alex_id(),
               client_message_id: "cm-1",
               message_type: "text",
               body: "hello"
             })

    assert msg.server_seq == 1
    assert msg.delivery_state == "persisted"

    assert :ok = OpalCore.Contracts.validate_message(Message.to_contract(msg))
  end

  test "duplicate client_message_id is idempotent" do
    attrs = %{
      conversation_id: Fixtures.conv_alex_jordan_id(),
      sender_user_id: Fixtures.user_alex_id(),
      client_message_id: "cm-dup",
      message_type: "text",
      body: "once"
    }

    assert {:ok, m1, :created} = Messages.accept_message(attrs)
    assert {:ok, m2, :idempotent} = Messages.accept_message(attrs)
    assert m1.id == m2.id
    assert Repo.aggregate(Message, :count) == 1
  end

  test "server_seq increments per conversation" do
    base = %{
      conversation_id: Fixtures.conv_alex_jordan_id(),
      sender_user_id: Fixtures.user_alex_id(),
      message_type: "text",
      body: "x"
    }

    assert {:ok, a, :created} = Messages.accept_message(Map.put(base, :client_message_id, "s1"))
    assert {:ok, b, :created} = Messages.accept_message(Map.put(base, :client_message_id, "s2"))
    assert a.server_seq == 1
    assert b.server_seq == 2
  end

  test "concurrent duplicate client_message_id remains single record" do
    attrs = %{
      conversation_id: Fixtures.conv_alex_jordan_id(),
      sender_user_id: Fixtures.user_alex_id(),
      client_message_id: "cm-race",
      message_type: "text",
      body: "race"
    }

    tasks =
      for _ <- 1..8 do
        Task.async(fn -> Messages.accept_message(attrs) end)
      end

    results = Enum.map(tasks, &Task.await(&1, 15_000))
    oks = for {:ok, m, _origin} <- results, do: m.id
    assert length(oks) == 8
    assert length(Enum.uniq(oks)) == 1
    assert Repo.aggregate(Message, :count) == 1
  end

  test "create_group_conversation requires 3–8 unique members" do
    assert {:error, :group_too_small} =
             Messages.create_group_conversation(Fixtures.user_alex_id(), [Fixtures.user_jordan_id()])

    assert {:ok, result} =
             Messages.create_group_conversation(
               Fixtures.user_alex_id(),
               [
                 Fixtures.user_jordan_id(),
                 Fixtures.user_maya_id(),
                 Fixtures.user_chris_id()
               ],
               label: "test-friends-4"
             )

    assert result.member_count == 4
    assert length(Messages.member_user_ids(result.conversation_id)) == 4

    assert {:ok, _m, :created} =
             Messages.add_conversation_member(
               result.conversation_id,
               Fixtures.user_alex_id(),
               Fixtures.user_taylor_id()
             )

    assert length(Messages.member_user_ids(result.conversation_id)) == 5

    assert {:ok, _m, :idempotent} =
             Messages.add_conversation_member(
               result.conversation_id,
               Fixtures.user_alex_id(),
               Fixtures.user_taylor_id()
             )
  end

  test "non-member cannot send" do
    assert {:error, :not_a_member} =
             Messages.accept_message(%{
               conversation_id: Fixtures.conv_alex_jordan_id(),
               sender_user_id: Fixtures.user_taylor_id(),
               client_message_id: "cm-x",
               body: "nope"
             })
  end

  test "list_conversations tolerates multiple SharedPlans on one conversation" do
    alias OpalCore.SocialFlow
    cid = Fixtures.conv_alex_jordan_id()
    alex = Fixtures.user_alex_id()

    assert {:ok, _p1, _} =
             SocialFlow.create_tentative_plan_from_conversation(cid, alex, %{
               "title" => "First place"
             })

    assert {:ok, _p2, _} =
             SocialFlow.create_tentative_plan_from_conversation(cid, alex, %{
               "title" => "Second place"
             })

    # Must not raise Ecto.MultipleResultsError (Chats list 500).
    rows = Messages.list_conversations(alex)
    assert Enum.any?(rows, &(&1["id"] == cid))
  end
end
