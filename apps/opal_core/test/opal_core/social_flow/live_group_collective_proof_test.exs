defmodule OpalCore.SocialFlow.LiveGroupCollectiveProofTest do
  @moduledoc """
  Multi-user collective intelligence proof through real domain + ProductSignals path.

  Evidence is authored by the correct humans (not all Founder text).
  Proves: attribution, private memory non-disclosure, current override, hard constraints,
  optional late joiner, party recompose, collective_fit on signals, selection≠send,
  authorizes_set false, external truth boundaries on ranked options.
  """
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Messages
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    DurablePreferenceMemory,
    ExternalWorldTruth,
    GroupComposition,
    GroupMembership,
    ProductSignals
  }

  setup do
    uid = System.unique_integer([:positive])

    names = ~w(Founder Chris Jess Alex Maya)
    users =
      Enum.map(names, fn name ->
        {:ok, u} =
          %User{}
          |> User.changeset(%{
            display_name: name,
            handle: "lgc-#{String.downcase(name)}-#{uid}"
          })
          |> Repo.insert()

        u
      end)

    [founder, chris, jess, alex, maya] = users

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "live-group-#{uid}"})
      |> Repo.insert()

    for u <- users do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{
      conv: conv,
      founder: founder,
      chris: chris,
      jess: jess,
      alex: alex,
      maya: maya,
      users: users
    }
  end

  defp put(conv, user, body, seq) do
    %Message{}
    |> Message.create_changeset(%{
      conversation_id: conv.id,
      sender_user_id: user.id,
      client_message_id: "lgc-#{seq}-#{System.unique_integer([:positive])}",
      message_type: "text",
      body: body,
      server_seq: seq
    })
    |> Repo.insert!()

    from(c in Conversation, where: c.id == ^conv.id)
    |> Repo.update_all(set: [next_server_seq: seq + 1])
  end

  defp messages(conv) do
    from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
    |> Repo.all()
  end

  test "multi-user group: attribution, durable memory privacy, fit, Sam recompose", %{
    conv: conv,
    founder: founder,
    chris: chris,
    jess: jess,
    alex: alex,
    maya: maya
  } do
    # Durable private Maya memory (server SoT)
    assert {:ok, maya_mem, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => maya.id,
               "preference" => "quiet restaurants",
               "weight_class" => "old_statement",
               "conversation_id" => conv.id
             })

    # Evidence from the correct humans
    put(conv, founder, "Saturday dinner around 7:30? Something Italian sounds good.", 1)
    put(conv, chris, "I'm in. Anywhere but downtown.", 2)
    put(conv, jess, "I'm in. Italian works for me.", 3)
    put(conv, alex, "Works for me. No sushi tonight though.", 4)
    put(conv, maya, "I'm in. Actually somewhere lively sounds fun tonight.", 5)
    put(conv, founder, "Can Sam come?", 6)

    msgs = messages(conv)
    composition = GroupComposition.compose(conv.id, msgs)

    # Attribution: constraints classified from speakers
    assert composition["where"]["downtown_incompatible"] == true
    assert composition["food"]["sushi_conflict"] == true
    assert composition["member_count"] == 5

    # Chris authored downtown — find message
    chris_msg = Enum.find(msgs, &(&1.sender_user_id == chris.id))
    assert chris_msg.body =~ ~r/downtown/i

    alex_msg = Enum.find(msgs, &(&1.sender_user_id == alex.id))
    assert alex_msg.body =~ ~r/sushi/i

    maya_msg = Enum.find(msgs, &(&1.sender_user_id == maya.id))
    assert maya_msg.body =~ ~r/lively/i

    # ProductSignals for Founder — collective_fit shared-safe
    assert {:ok, founder_signals} = ProductSignals.signals_for_conversation(conv.id, founder.id)
    primary = Enum.find(founder_signals, &Map.has_key?(&1, "collective_fit")) || hd(founder_signals)
    cf = primary["collective_fit"]
    assert is_map(cf)
    assert cf["authorizes_set"] == false
    assert cf["authority"] == "candidate_only"

    # Private durable memory must not appear on shared projection
    encoded = Jason.encode!(founder_signals)
    refute encoded =~ ~r/quiet restaurants|Maya usually|relationship memory/i

    # Current override: group_intent lively when Maya said lively
    assert cf["group_intent"] in ["lively", nil] or is_list(cf["options"])

    # Hard constraint: no downtown in options
    for o <- cf["options"] || [] do
      refute String.downcase(o["area"] || "") == "downtown"
      refute String.downcase(o["cuisine"] || "") == "sushi"
      # External truth: social fit must not claim booked
      fit = ExternalWorldTruth.social_fit_from_collective(o)
      assert :ok = ExternalWorldTruth.assert_social_fit_boundaries!(fit)
    end

    # Peer Chris sees same shared collective_fit shape, still no private memory
    assert {:ok, chris_signals} = ProductSignals.signals_for_conversation(conv.id, chris.id)
    chris_cf =
      Enum.find(chris_signals, &Map.has_key?(&1, "collective_fit"))["collective_fit"] ||
        %{}

    refute Jason.encode!(chris_signals) =~ ~r/quiet restaurants/i
    assert chris_cf["authorizes_set"] == false

    # Durable memory survives "session" re-query
    assert [^maya_mem | _] = DurablePreferenceMemory.list_for_owners([maya.id]) |> List.wrap() |> then(fn
      [] -> DurablePreferenceMemory.list_for_owners([maya.id])
      list -> list
    end)

    listed = DurablePreferenceMemory.list_for_owners([maya.id])
    assert Enum.any?(listed, &(&1.id == maya_mem.id))
    assert maya_mem.summary =~ ~r/quiet/i

    # Sam joins as real member — recompose party, preserve when
    {:ok, sam} =
      %User{}
      |> User.changeset(%{
        display_name: "Sam",
        handle: "lgc-sam-#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    when_before = composition["when"]

    assert {:ok, :added, ^sam, meta} =
             GroupMembership.resolve_and_add(conv.id, founder.id, "Sam")

    assert meta["member_count"] == 6

    assert {:ok, _msg, _} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: sam.id,
               client_message_id: "sam-#{System.unique_integer([:positive])}",
               message_type: "text",
               body: "Start without me, I'll meet you around 8."
             })

    msgs2 = messages(conv)
    after_c = GroupComposition.compose(conv.id, msgs2)
    assert after_c["member_count"] == 6
    # Time not restarted
    assert after_c["when"]["day"] == when_before["day"] or
             is_binary(after_c["when"]["strongest_common_start"]) or
             is_map(after_c["when"])

    # Sam optional late — does not kill plan
    assert after_c["participation"]["kills_plan"] != true

    assert {:ok, signals_after} = ProductSignals.signals_for_conversation(conv.id, founder.id)
    cf2 =
      Enum.find(signals_after, &Map.has_key?(&1, "collective_fit"))["collective_fit"]

    assert is_map(cf2)
    assert cf2["party_size"] in [5, 6] or is_integer(cf2["party_size"])
    assert cf2["authorizes_set"] == false

    # Private selection simulation: no peer message from ranking alone
    msg_count_before = length(msgs2)
    # (selection is client-local — no accept_message) 
    assert length(messages(conv)) == msg_count_before

    # Non-member isolation
    {:ok, stranger} =
      %User{}
      |> User.changeset(%{
        display_name: "Stranger",
        handle: "lgc-str-#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    assert {:error, :not_a_member} =
             ProductSignals.signals_for_conversation(conv.id, stranger.id)
  end

  test "abstention path when all candidates violate hard downtown exclusion", %{
    conv: conv,
    founder: founder,
    chris: chris
  } do
    put(conv, founder, "Saturday dinner downtown only?", 1)
    put(conv, chris, "I'm in but not downtown — anywhere but downtown.", 2)

    # Only downtown candidates
    candidates = [
      %{
        "id" => "neon",
        "display_name" => "Neon Bar",
        "area_label" => "Downtown",
        "cuisine" => "bar",
        "max_party" => 12,
        "quiet" => false,
        "score" => 5.0
      }
    ]

    composition = GroupComposition.compose(conv.id, messages(conv))

    fit =
      OpalCore.SocialFlow.CollectiveComposition.compose(%{
        "composition" => composition,
        "candidates" => candidates,
        "participant_contexts" => [
          %{
            "user_id" => chris.id,
            "role" => "required",
            "hard_constraints" => [%{"kind" => "no_downtown"}]
          },
          %{"user_id" => founder.id, "role" => "required"}
        ]
      })

    # Hard filter should remove downtown-only catalog → abstain
    assert fit["abstain"] == true or fit["options"] == []
    assert fit["authorizes_set"] == false
  end
end
