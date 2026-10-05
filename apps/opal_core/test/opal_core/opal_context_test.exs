defmodule OpalCore.OpalContextTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messaging.Message
  alias OpalCore.OpalContext
  alias OpalCore.OpalConversations
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.TrustTiers

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp taylor, do: Fixtures.user_taylor_id()
  defp maya, do: Fixtures.user_maya_id()

  defp fresh_user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}_#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp insert_plan!(title, creator_id, member_ids, opts \\ []) do
    conv_id = Keyword.get(opts, :conversation_id, Fixtures.conv_alex_jordan_id())
    inserted_at = Keyword.get(opts, :inserted_at, DateTime.utc_now())

    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        title: title,
        status: "tentative",
        timezone: "America/Los_Angeles",
        created_by_user_id: creator_id,
        conversation_id: conv_id,
        source: "conversation",
        start_at: Keyword.get(opts, :start_at)
      })
      |> Repo.insert!()

    # Force inserted_at ordering when needed
    if opts[:inserted_at] do
      from(sp in SharedPlan, where: sp.id == ^plan.id)
      |> Repo.update_all(set: [inserted_at: inserted_at])
    end

    for uid <- Enum.uniq([creator_id | member_ids]) do
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        plan_id: plan.id,
        user_id: uid,
        response_state: "accepted",
        role: if(uid == creator_id, do: "lead", else: "participant")
      })
      |> Repo.insert!()
    end

    Repo.get!(SharedPlan, plan.id)
  end

  defp insert_message!(conversation_id, sender_id, body, seq) do
    %Message{}
    |> Message.create_changeset(%{
      conversation_id: conversation_id,
      sender_user_id: sender_id,
      client_message_id: "oc2-#{sender_id}-#{seq}-#{System.unique_integer([:positive])}",
      message_type: "text",
      body: body,
      server_seq: seq,
      delivery_state: "persisted",
      ai_processing_state: "not_requested"
    })
    |> Repo.insert!()
  end

  test "assemble/2 returns all 5 keys for a user with full data" do
    # RU-2 — trusted so taste/plans/relationships are included
    assert {:ok, _} = TrustTiers.grant_tier(alex(), "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(alex(), "trusted", "system")

    # Taste
    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => alex(),
               "preference" => "taste:cuisine:thai",
               "purpose" => "food_preference",
               "force_durable" => true
             })

    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => alex(),
               "preference" => "taste:vibe:lively",
               "purpose" => "place_vibe",
               "force_durable" => true
             })

    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => alex(),
               "preference" => "taste:price:$$",
               "purpose" => "place_preference",
               "force_durable" => true
             })

    # Celebrations
    assert {:ok, _} =
             Celebrations.create(alex(), %{
               "person_name" => "Maya",
               "kind" => "birthday",
               "month" => Date.utc_today().month,
               "day" => min(Date.utc_today().day + 3, 28)
             })

    # Plans (dyad + group)
    insert_plan!("Fort Oak dinner", alex(), [jordan()])
    insert_plan!("Group brunch", alex(), [jordan(), taylor(), maya()])

    # Opal conversation
    assert {:ok, _} = OpalConversations.get_or_create_conversation(alex())

    # Messages from Jordan in shared conversation
    cid = Fixtures.conv_alex_jordan_id()
    insert_message!(cid, jordan(), "hey", 9001)
    insert_message!(cid, jordan(), "again", 9002)

    assert {:ok, ctx} = OpalContext.assemble(alex(), "  what's good tonight  ")

    assert Map.keys(ctx) |> Enum.sort() == [
             :financial,
             :group_tastes,
             :message,
             :relationships,
             :social,
             :taste,
             :temporal,
             :trust_tier,
             :user
           ]

    assert ctx.user.id == alex()
    assert is_list(ctx.group_tastes)
    assert is_binary(ctx.user.display_name)
    assert is_binary(ctx.user.handle)
    assert ctx.user.timezone == "America/Los_Angeles"

    assert "lively" in ctx.taste.vibes or Enum.any?(ctx.taste.vibes, &String.contains?(&1, "lively"))
    assert "thai" in ctx.taste.cuisines or Enum.any?(ctx.taste.cuisines, &String.contains?(&1, "thai"))
    assert ctx.taste.price_comfort == "$$"

    assert length(ctx.temporal.recent_plans) >= 1
    assert Enum.all?(ctx.temporal.recent_plans, &Map.has_key?(&1, :title))
    assert length(ctx.temporal.upcoming_celebrations) >= 1
    assert hd(ctx.temporal.upcoming_celebrations).name == "Maya"
    assert is_integer(hd(ctx.temporal.upcoming_celebrations).days_until)
    assert ctx.temporal.active_conversation_count >= 1

    assert is_list(ctx.social.frequent_contacts)
    assert Enum.any?(ctx.social.frequent_contacts, &(&1.user_id == jordan()))
    assert is_list(ctx.social.group_patterns)

    assert ctx.message.text == "what's good tonight"
    assert ctx.message.length == String.length("what's good tonight")
    assert is_binary(ctx.message.sent_at)
    assert ctx.trust_tier == "trusted"
  end

  test "assemble/2 returns empty lists for a new user with no data" do
    u = fresh_user!("oc2_empty")

    assert {:ok, ctx} = OpalContext.assemble(u.id, "hello")

    assert Map.keys(ctx) |> Enum.sort() == [
             :financial,
             :group_tastes,
             :message,
             :relationships,
             :social,
             :taste,
             :temporal,
             :trust_tier,
             :user
           ]
    assert ctx.trust_tier == "new"
    assert ctx.financial == nil
    assert ctx.group_tastes == []
    assert ctx.taste.vibes == []
    assert ctx.taste.cuisines == []
    assert ctx.taste.price_comfort == nil
    assert ctx.temporal.recent_plans == []
    assert ctx.temporal.upcoming_celebrations == []
    assert ctx.temporal.active_conversation_count == 0
    assert ctx.social.frequent_contacts == []
    assert ctx.social.group_patterns == []
    assert ctx.relationships == %{}
    assert ctx.message.text == "hello"
  end

  test "assemble/2 returns {:error, :user_not_found} for invalid user_id" do
    assert {:error, :user_not_found} =
             OpalContext.assemble(Ecto.UUID.generate(), "hello")
  end

  test "performance: assemble/2 <500ms with 100 plans, 50 celebrations, 1000 messages" do
    u = fresh_user!("oc2_perf")
    peer = fresh_user!("oc2_perf_peer")
    peer2 = fresh_user!("oc2_perf_peer2")
    peer3 = fresh_user!("oc2_perf_peer3")

    # Conversation + membership for messages
    cid = Fixtures.conv_alex_jordan_id()

    for uid <- [u.id, peer.id] do
      case Repo.get_by(ConversationMember, conversation_id: cid, user_id: uid) do
        nil ->
          %ConversationMember{}
          |> ConversationMember.changeset(%{conversation_id: cid, user_id: uid})
          |> Repo.insert!()

        _ ->
          :ok
      end
    end

    # 100 plans (include a few group compositions)
    for i <- 1..100 do
      members =
        cond do
          rem(i, 10) == 0 -> [peer.id, peer2.id, peer3.id]
          true -> [peer.id]
        end

      insert_plan!("Perf plan #{i}", u.id, members,
        conversation_id: cid,
        inserted_at: DateTime.utc_now() |> DateTime.add(-i, :second)
      )
    end

    # 50 celebrations
    for i <- 1..50 do
      assert {:ok, _} =
               Celebrations.create(u.id, %{
                 "person_name" => "Person#{i}",
                 "kind" => "birthday",
                 "month" => rem(i, 12) + 1,
                 "day" => rem(i, 27) + 1
               })
    end

    # 1000 messages from peer
    base_seq = 50_000

    rows =
      for i <- 1..1000 do
        now = DateTime.utc_now() |> DateTime.add(-i, :second) |> DateTime.truncate(:microsecond)

        %{
          id: Ecto.UUID.generate(),
          conversation_id: cid,
          sender_user_id: peer.id,
          client_message_id: "perf-#{u.id}-#{i}",
          message_type: "text",
          body: "m#{i}",
          server_seq: base_seq + i,
          delivery_state: "persisted",
          ai_processing_state: "not_requested",
          schema_version: "0.1.0",
          inserted_at: now,
          updated_at: now
        }
      end

    Repo.insert_all(Message, rows)

    # RU-2 — known+ required for plans/celebrations/social in context
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")

    {micros, {:ok, ctx}} = :timer.tc(fn -> OpalContext.assemble(u.id, "perf check") end)
    ms = micros / 1000

    assert ms < 500, "assemble took #{ms}ms (limit 500ms)"
    assert length(ctx.temporal.recent_plans) == 5
    assert length(ctx.temporal.upcoming_celebrations) == 5
    assert length(ctx.social.frequent_contacts) >= 1

    # Persist timing evidence for VERIFY
    File.mkdir_p!("../../shots/poc2")
    File.write!("../../shots/poc2/perf_ms.txt", "#{Float.round(ms, 2)}\n")
  end

  test "no N+1 queries — bounded query count with Ecto telemetry" do
    u = fresh_user!("oc2_n1")
    peer = fresh_user!("oc2_n1_peer")
    peer2 = fresh_user!("oc2_n1_peer2")
    peer3 = fresh_user!("oc2_n1_peer3")
    cid = Fixtures.conv_group_friends_id()

    for uid <- [u.id, peer.id, peer2.id, peer3.id] do
      case Repo.get_by(ConversationMember, conversation_id: cid, user_id: uid) do
        nil ->
          %ConversationMember{}
          |> ConversationMember.changeset(%{conversation_id: cid, user_id: uid})
          |> Repo.insert!()

        _ ->
          :ok
      end
    end

    for i <- 1..8 do
      insert_plan!("N1 plan #{i}", u.id, [peer.id, peer2.id, peer3.id], conversation_id: cid)
    end

    for i <- 1..5 do
      insert_message!(cid, peer.id, "hi#{i}", 80_000 + i)
    end

    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")

    parent = self()
    handler_id = "oc2-n1-#{System.unique_integer([:positive])}"

    :ok =
      :telemetry.attach(
        handler_id,
        [:opal_core, :repo, :query],
        fn _event, _meas, _meta, _cfg -> send(parent, :repo_query) end,
        nil
      )

    on_exit(fn -> :telemetry.detach(handler_id) end)

    # Drain
    receive_all = fn rec ->
      receive do
        :repo_query -> rec.(rec)
      after
        0 -> :ok
      end
    end

    receive_all.(receive_all)

    assert {:ok, _} = OpalContext.assemble(u.id, "n1")

    count =
      Stream.repeatedly(fn ->
        receive do
          :repo_query -> 1
        after
          50 -> :done
        end
      end)
      |> Enum.take_while(&(&1 != :done))
      |> Enum.sum()

    # User + taste + plans + celebrations + opal_conv count + contacts + users + group plans + group members
    # Must stay bounded (no per-row queries). Cap at 20.
    assert count > 0
    assert count <= 20, "expected <=20 queries, got #{count}"
  end

end
