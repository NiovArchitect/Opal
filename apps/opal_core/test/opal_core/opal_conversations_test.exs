defmodule OpalCore.OpalConversationsTest do
  use OpalCore.DataCase

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()

  test "get_or_create creates once then returns existing" do
    assert {:ok, c1} = OpalConversations.get_or_create_conversation(alex())
    assert {:ok, c2} = OpalConversations.get_or_create_conversation(alex())
    assert c1.id == c2.id
  end

  test "foreign conversation lookup returns not_found" do
    assert {:ok, c_a} = OpalConversations.get_or_create_conversation(alex())

    assert {:error, :not_found} = OpalConversations.get_conversation_for_user(jordan(), c_a.id)
    assert {:ok, ^c_a} = OpalConversations.get_conversation_for_user(alex(), c_a.id)
  end

  test "create_user_message validates empty and length; posts OC-4 response" do
    assert {:error, :empty_body} = OpalConversations.create_user_message(alex(), "   ")

    assert {:error, :body_too_long} =
             OpalConversations.create_user_message(alex(), String.duplicate("x", 2001))

    assert {:ok, {conv, user_msg, opal_msg}} =
             OpalConversations.create_user_message(alex(), "hello")

    assert user_msg.role == "user"
    assert user_msg.body == "hello"
    assert opal_msg.role == "opal"
    assert is_binary(opal_msg.body) and opal_msg.body != ""
    assert opal_msg.body != OpalMessage.oc1_placeholder_body()
    assert is_binary(opal_msg.metadata["generated_at"])
    assert conv.title == "hello"

    msgs = OpalConversations.list_messages(conv.id)
    assert length(msgs) == 2
    assert Enum.map(msgs, & &1.role) == ["user", "opal"]
  end

  test "list_messages returns ascending and caps at 50" do
    assert {:ok, conv} = OpalConversations.get_or_create_conversation(alex())

    for i <- 1..55 do
      assert {:ok, _} = OpalConversations.create_user_message(alex(), "msg-#{i}")
    end

    msgs = OpalConversations.list_messages(conv.id)
    assert length(msgs) == 50
    # Ascending: first of window is older than last
    assert DateTime.compare(hd(msgs).inserted_at, List.last(msgs).inserted_at) in [:lt, :eq]
    # Newest pair ends with placeholder for msg-55
    assert List.last(msgs).role == "opal"
    assert Enum.at(msgs, -2).body == "msg-55"
  end

  test "OC-2 stores context_snapshot on Opal reply metadata" do
    assert {:ok, {_conv, _user_msg, opal_msg}} =
             OpalConversations.create_user_message(alex(), "context please")

    assert is_map(opal_msg.metadata)
    snap = opal_msg.metadata["context_snapshot"]
    assert is_map(snap)

    for key <- ~w(user taste temporal social message relationships trust_tier) do
      assert Map.has_key?(snap, key), "missing context key #{key}"
    end
    assert is_map(snap["relationships"])
    assert snap["trust_tier"] in ~w(new known trusted inner_circle)

    assert snap["message"]["text"] == "context please"
    assert is_binary(opal_msg.metadata["generated_at"])
  end

  test "OC-3 stores intent; OC-4 generates response from intent + context" do
    assert {:ok, {_conv, _user_msg, opal_msg}} =
             OpalConversations.create_user_message(alex(), "Plan dinner with Maya Friday")

    assert is_map(opal_msg.metadata)
    intent = opal_msg.metadata["intent"]
    assert is_map(intent)
    assert intent["intent"] == "plan_create"
    assert intent["confidence"] in ["high", "medium", "low"]
    assert is_map(intent["entities"])
    assert intent["raw_text"] == "Plan dinner with Maya Friday"
    assert is_binary(opal_msg.metadata["generated_at"])
    assert opal_msg.body =~ "Got it —"
    assert opal_msg.body =~ "Want me to set this up?"
    assert opal_msg.body != OpalMessage.oc1_placeholder_body()
  end
end
