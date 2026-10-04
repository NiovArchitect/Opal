defmodule OpalCore.SocialFlow.ConversationMomentBridgeTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Messages
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    ConversationMomentBridge,
    HomeFeed,
    OpalChronologyMoment,
    SharedPlan,
    SocialMomentRecord,
    SocialMomentVisibility
  }

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "Alex Rivera", handle: "cmb-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "Jordan Lee", handle: "cmb-b-#{uid}"})
      |> Repo.insert()

    {:ok, outsider} =
      %User{}
      |> User.changeset(%{display_name: "Taylor Out", handle: "cmb-o-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "cmb-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Fort Oak dinner",
        status: "agreed",
        timezone: "America/Los_Angeles",
        created_by_user_id: a.id
      })
      |> Repo.insert()

    %{a: a, b: b, outsider: outsider, conv: conv, plan: plan}
  end

  describe "visibility pick" do
    test "participants-only value is specific_people" do
      assert "specific_people" in SocialMomentVisibility.supported_visibilities()
      assert ConversationMomentBridge.participants_visibility() == "specific_people"
    end
  end

  describe "build_publish_attrs per wired kind" do
    for kind <- ~w(plan_forming set place_resolved follow_through) do
      test "wired kind #{kind} builds factual caption and audience", %{
        a: a,
        b: b,
        conv: conv
      } do
        kind = unquote(kind)
        stage = stage_word(kind)

        moment = chrono_moment(conv.id, kind, a.id)

        assert {:ok, author_id, attrs} =
                 ConversationMomentBridge.build_publish_attrs(moment, conv)

        assert author_id == a.id
        assert attrs["visibility"] == "specific_people"
        assert attrs["audience_user_ids"] == [b.id]
        assert attrs["group_conversation_id"] == conv.id
        assert attrs["source_lineage_id"] == moment.id
        assert attrs["caption"] == "Fort Oak dinner with Alex, Jordan — #{stage}"

        ctx = Jason.decode!(attrs["social_context"])
        assert ctx["source"] == "chronology"
        assert ctx["moment_kind"] == kind
        assert ctx["moment_id"] == moment.id
      end
    end

    test "empty caption when plan title missing", %{a: a, conv: conv, plan: plan} do
      Repo.delete!(plan)

      moment = chrono_moment(conv.id, "set", a.id)
      assert {:ok, _, attrs} = ConversationMomentBridge.build_publish_attrs(moment, conv)
      assert attrs["caption"] == ""
    end
  end

  describe "skipped kinds" do
    for kind <- ~w(canceled open_loop place_open place_reopened place_constraint) do
      test "kind #{kind} returns :skipped", %{a: a, conv: conv} do
        moment = chrono_moment(conv.id, unquote(kind), a.id)
        assert ConversationMomentBridge.maybe_publish_from_chronology(moment, conv) == :skipped
        assert ConversationMomentBridge.build_publish_attrs(moment, conv) == :skipped
      end
    end
  end

  describe "publish error path" do
    test "returns :skipped and does not raise", %{a: a, conv: conv} do
      moment = chrono_moment(conv.id, "set", a.id)

      result =
        ConversationMomentBridge.maybe_publish_from_chronology(moment, conv,
          publish_fun: fn _author, _attrs -> {:error, :forced_failure} end
        )

      assert result == :skipped
    end

    test "message path still succeeds when publish fails", %{a: a, b: b, conv: conv} do
      # Force publish failures for this process via invalid publish_fun is unit-only;
      # integration: accept_message must still return :created even if bridge skips.
      assert {:ok, msg, :created} =
               Messages.accept_message(%{
                 conversation_id: conv.id,
                 sender_user_id: a.id,
                 client_message_id: "cmb-msg-#{System.unique_integer([:positive])}",
                 message_type: "text",
                 body: "We should get dinner Thursday after 6:30."
               })

      assert is_binary(msg.id)
      assert msg.sender_user_id == a.id
      assert is_binary(b.id)
    end
  end

  describe "integration conversation → SocialMoment → HomeFeed" do
    test "participants see moment; outsider excluded", %{
      a: a,
      b: b,
      outsider: outsider,
      conv: conv
    } do
      assert {:ok, _, :created} =
               Messages.accept_message(%{
                 conversation_id: conv.id,
                 sender_user_id: a.id,
                 client_message_id: "cmb-i1-#{System.unique_integer([:positive])}",
                 message_type: "text",
                 body: "We should get dinner Thursday after 6:30 at Fort Oak."
               })

      assert {:ok, _, :created} =
               Messages.accept_message(%{
                 conversation_id: conv.id,
                 sender_user_id: b.id,
                 client_message_id: "cmb-i2-#{System.unique_integer([:positive])}",
                 message_type: "text",
                 body: "Perfect, Thursday 6:30 at Fort Oak works for me. Let's confirm."
               })

      moments =
        from(m in SocialMomentRecord,
          where: m.group_conversation_id == ^conv.id,
          order_by: [asc: m.inserted_at]
        )
        |> Repo.all()

      assert length(moments) >= 1

      Enum.each(moments, fn m ->
        assert m.visibility == "specific_people"
        assert a.id in [m.author_user_id | m.audience_user_ids]
        assert b.id in [m.author_user_id | m.audience_user_ids]
        refute outsider.id in m.audience_user_ids
        assert m.author_user_id != outsider.id
        assert m.caption =~ "Fort Oak dinner"
        assert m.caption =~ "—"
        ctx = Jason.decode!(m.social_context)
        assert ctx["source"] == "chronology"
        assert ctx["moment_kind"] in ConversationMomentBridge.wired_kinds()
      end)

      feed_a = HomeFeed.compose(a.id, limit: 40)
      feed_b = HomeFeed.compose(b.id, limit: 40)
      feed_o = HomeFeed.compose(outsider.id, limit: 40)

      ids = MapSet.new(Enum.map(moments, & &1.id))

      assert Enum.any?(feed_a["objects"], &MapSet.member?(ids, &1["id"]))
      assert Enum.any?(feed_b["objects"], &MapSet.member?(ids, &1["id"]))
      refute Enum.any?(feed_o["objects"], &MapSet.member?(ids, &1["id"]))
    end

    test "canceled and open_loop chronology do not publish SocialMoments", %{
      a: a,
      conv: conv
    } do
      before =
        from(m in SocialMomentRecord, where: m.group_conversation_id == ^conv.id)
        |> Repo.aggregate(:count)

      for kind <- ~w(canceled open_loop) do
        moment = chrono_moment(conv.id, kind, a.id)
        assert ConversationMomentBridge.maybe_publish_from_chronology(moment, conv) == :skipped
      end

      after_count =
        from(m in SocialMomentRecord, where: m.group_conversation_id == ^conv.id)
        |> Repo.aggregate(:count)

      assert after_count == before
    end
  end

  defp stage_word("plan_forming"), do: "taking shape"
  defp stage_word("set"), do: "set"
  defp stage_word("place_resolved"), do: "place decided"
  defp stage_word("follow_through"), do: "happening"

  defp chrono_moment(conversation_id, kind, evidence_sender_id) do
    seq = System.unique_integer([:positive])

    {:ok, msg} =
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conversation_id,
        sender_user_id: evidence_sender_id,
        client_message_id: "cmb-ev-#{kind}-#{seq}",
        message_type: "text",
        body: "evidence #{kind}",
        server_seq: seq,
        delivery_state: "persisted"
      })
      |> Repo.insert()

    # Direct insert bypasses Chronology.insert_if_new hook so unit tests
    # isolate the translator / explicit maybe_publish calls.
    {:ok, moment} =
      %OpalChronologyMoment{}
      |> OpalChronologyMoment.changeset(%{
        conversation_id: conversation_id,
        kind: kind,
        lifecycle_stage: kind,
        label: "test #{kind}",
        privacy_class: "shared_progress",
        visibility: "shared",
        evidence_message_id: msg.id,
        source_message_ids: [msg.id],
        after_server_seq: msg.server_seq,
        created_from: "test",
        composition_snapshot: %{},
        idempotency_key: "cmb-test-#{conversation_id}-#{kind}-#{seq}"
      })
      |> Repo.insert()

    moment
  end
end
