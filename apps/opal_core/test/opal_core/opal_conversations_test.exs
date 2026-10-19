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

  test "rename_conversation: owner renames, non-owner and invalid titles rejected" do
    assert {:ok, c} = OpalConversations.get_or_create_conversation(alex())

    # Owner renames: title is trimmed and persisted; the sessions list
    # (the shape the rename response mirrors) reflects it.
    assert {:ok, renamed} =
             OpalConversations.rename_conversation(alex(), c.id, "  Weekend plans  ")

    assert renamed.title == "Weekend plans"
    assert {:ok, reloaded} = OpalConversations.get_conversation_for_user(alex(), c.id)
    assert reloaded.title == "Weekend plans"

    summary = OpalConversations.session_summary(alex(), c.id)
    assert summary["id"] == c.id
    assert summary["title"] == "Weekend plans"
    assert summary["active"] == true
    assert summary["message_count"] == 0
    refute Map.has_key?(summary, "messages")
    assert Enum.find(OpalConversations.list_sessions(alex()), &(&1["id"] == c.id)) == summary

    # Non-owner cannot rename, and existence is not revealed.
    assert {:error, :not_found} =
             OpalConversations.rename_conversation(jordan(), c.id, "Stolen")

    assert {:ok, still} = OpalConversations.get_conversation_for_user(alex(), c.id)
    assert still.title == "Weekend plans"

    # Empty / whitespace-only, overlong, and non-string titles rejected.
    assert {:error, :empty_title} = OpalConversations.rename_conversation(alex(), c.id, "   ")
    assert {:error, :empty_title} = OpalConversations.rename_conversation(alex(), c.id, "")

    assert {:error, :title_too_long} =
             OpalConversations.rename_conversation(
               alex(),
               c.id,
               String.duplicate("x", OpalCore.OpalConversations.OpalConversation.max_title() + 1)
             )

    assert {:error, :invalid_title} = OpalConversations.rename_conversation(alex(), c.id, nil)
    assert {:error, :invalid_title} = OpalConversations.rename_conversation(alex(), c.id, 42)

    # Unknown id handled as not_found; a rejected rename never writes.
    assert {:error, :not_found} =
             OpalConversations.rename_conversation(alex(), Ecto.UUID.generate(), "Nope")

    assert {:ok, unchanged} = OpalConversations.get_conversation_for_user(alex(), c.id)
    assert unchanged.title == "Weekend plans"
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

    for key <- ~w(user taste temporal social message relationships trust_tier financial fit) do
      assert Map.has_key?(snap, key), "missing context key #{key}"
    end

    assert is_map(snap["relationships"])
    assert snap["trust_tier"] in ~w(new known trusted inner_circle)
    assert snap["fit"] == nil

    assert snap["message"]["text"] == "context please"
    assert is_binary(opal_msg.metadata["generated_at"])
  end

  test "client_context Fit influences activity recommend on Center chat path" do
    assert {:ok, {_conv, _user_msg, opal_msg}} =
             OpalConversations.create_user_message(
               alex(),
               "suggest an activity",
               client_context: %{
                 "fit" => %{"activities" => ["walk", "outdoors"], "goal" => "move_more"}
               }
             )

    assert opal_msg.body =~ "outdoor walk"
    refute opal_msg.body =~ "Fit"
    refute opal_msg.body =~ "move_more"
    snap = opal_msg.metadata["context_snapshot"]
    assert snap["fit"]["activities"] == ["walk", "outdoors"]
    assert snap["fit"]["goal"] == "move_more"
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
    assert opal_msg.body =~ "Got it:"
    assert opal_msg.body =~ "Want me to set this up?"
    assert opal_msg.body != OpalMessage.oc1_placeholder_body()
  end

  test "Yes after plan_create creates SharedPlan (screenshot bug 4)" do
    import Ecto.Query
    alias OpalCore.SocialFlow.SharedPlan

    assert {:ok, {_conv, _u1, ask}} =
             OpalConversations.create_user_message(alex(), "Plan dinner with Maya Friday")

    assert ask.body =~ "Want me to set this up?"

    before =
      from(sp in SharedPlan, where: sp.created_by_user_id == ^alex())
      |> Repo.aggregate(:count, :id)

    assert {:ok, {_conv2, _u2, confirm}} =
             OpalConversations.create_user_message(alex(), "Yes")

    assert confirm.metadata["intent"]["intent"] == "plan_confirm"
    assert confirm.body =~ "Done"
    assert confirm.body =~ "dinner"
    refute confirm.body =~ "I'm listening"

    after_count =
      from(sp in SharedPlan, where: sp.created_by_user_id == ^alex())
      |> Repo.aggregate(:count, :id)

    assert after_count == before + 1
  end

  describe "BS-09 bounded sessions list" do
    alias OpalCore.OpalConversations.OpalConversation
    alias OpalCore.OpalConversations.OpalMessage
    alias OpalCore.Repo

    @scale_sessions 205
    @scale_messages 50

    defp seed_scale_user! do
      user_id = Ecto.UUID.generate()

      %OpalCore.Accounts.User{}
      |> OpalCore.Accounts.User.changeset(%{
        id: user_id,
        handle: "scale-#{String.slice(user_id, 0, 8)}",
        display_name: "Scale"
      })
      |> Repo.insert!()

      base = ~U[2026-06-01 00:00:00.000000Z]

      session_rows =
        for i <- 0..(@scale_sessions - 1) do
          at = DateTime.add(base, i * 60, :second)

          %{
            id: Ecto.UUID.generate(),
            user_id: user_id,
            title: "scale-#{i}",
            archived_at: at,
            inserted_at: at,
            updated_at: at
          }
        end

      Repo.insert_all(OpalConversation, session_rows)

      # One conversation carries a long history of long bodies; its
      # LAST message is the only body the preview may ever ship.
      big = Enum.max_by(session_rows, & &1.updated_at, DateTime)

      long_body = fn tag -> "#{tag} " <> String.duplicate("x", 400) end

      message_rows =
        for i <- 1..@scale_messages do
          at = DateTime.add(base, i * 60, :second)

          body =
            if i == @scale_messages,
              do: "  latest preview " <> String.duplicate("y", 200),
              else: long_body.("body-#{i}")

          %{
            id: Ecto.UUID.generate(),
            conversation_id: big.id,
            role: "user",
            body: body,
            inserted_at: at
          }
        end

      Repo.insert_all(OpalMessage, message_rows)
      {user_id, big}
    end

    test "default page is bounded at 200, total is exact, pages tile the whole set" do
      {user_id, _big} = seed_scale_user!()

      assert OpalConversations.count_sessions(user_id) == @scale_sessions

      page1 = OpalConversations.list_sessions(user_id)
      assert length(page1) == 200

      page2 = OpalConversations.list_sessions(user_id, offset: 200)
      assert length(page2) == @scale_sessions - 200

      ids = Enum.map(page1 ++ page2, & &1["id"])
      assert length(Enum.uniq(ids)) == @scale_sessions

      # Explicit limit/offset paging works and clamps.
      assert length(OpalConversations.list_sessions(user_id, limit: 10)) == 10
      assert length(OpalConversations.list_sessions(user_id, limit: 10, offset: 10)) == 10
      assert length(OpalConversations.list_sessions(user_id, limit: 99_999)) == 205
    end

    test "preview is the last message only, truncated, and the payload does not ship the corpus" do
      {user_id, big} = seed_scale_user!()

      page = OpalConversations.list_sessions(user_id, limit: 500)
      row = Enum.find(page, &(&1["id"] == big.id))
      assert row["message_count"] == @scale_messages

      # session_preview semantics preserved: trimmed, 80 chars + ellipsis.
      assert row["last_message_preview"] ==
               "latest preview " <> String.duplicate("y", 65) <> "…"

      assert String.length(row["last_message_preview"]) == 81

      # Payload bound: 205 sessions exist and one history alone holds
      # ~20KB of bodies, yet a page of summaries stays small — full
      # bodies never cross the wire.
      encoded = Jason.encode!(OpalConversations.list_sessions(user_id))
      assert byte_size(encoded) < 100_000
    end

    test "session_summary finds a session beyond the default page bound" do
      {user_id, _big} = seed_scale_user!()

      all_ids =
        OpalConversations.list_sessions(user_id, limit: 500) |> Enum.map(& &1["id"])

      beyond = List.last(all_ids)
      summary = OpalConversations.session_summary(user_id, beyond)
      assert summary["id"] == beyond
    end
  end

  test "chat hello never returns OC-1 placeholder (screenshot bug 5)" do
    assert {:ok, {_conv, _user_msg, opal_msg}} =
             OpalConversations.create_user_message(alex(), "Hello")

    assert opal_msg.body != OpalMessage.oc1_placeholder_body()
    refute opal_msg.body =~ "I'm listening. I can help you plan, remember, or figure things out."
    assert opal_msg.body =~ ~r/Hey|mind|plan|remember/i
  end
end
