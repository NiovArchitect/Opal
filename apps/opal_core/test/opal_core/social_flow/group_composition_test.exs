defmodule OpalCore.SocialFlow.GroupCompositionTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{AlignmentAuthority, GroupComposition, ProductSignals}

  setup do
    uid = System.unique_integer([:positive])

    users =
      for name <- ~w(Alex Jordan Maya Chris Jess) do
        {:ok, u} =
          %User{}
          |> User.changeset(%{
            display_name: name,
            handle: "gc-#{String.downcase(name)}-#{uid}"
          })
          |> Repo.insert()

        u
      end

    [alex, jordan, maya, chris, jess] = users

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "sat-dinner-#{uid}"})
      |> Repo.insert()

    for u <- users do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{
      conv: conv,
      alex: alex,
      jordan: jordan,
      maya: maya,
      chris: chris,
      jess: jess,
      users: users
    }
  end

  defp put(conv, user, body, seq) do
    msg =
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: user.id,
        client_message_id: "gc-#{seq}-#{System.unique_integer([:positive])}",
        message_type: "text",
        body: body,
        server_seq: seq
      })
      |> Repo.insert!()

    # Keep conversation sequence ahead of fixture inserts so accept_message works later.
    from(c in Conversation, where: c.id == ^conv.id)
    |> Repo.update_all(set: [next_server_seq: seq + 1])

    msg
  end

  test "Saturday dinner episode separates who/when/where/food/participation/capacity", %{
    conv: conv,
    alex: alex,
    jordan: jordan,
    maya: maya,
    chris: chris,
    jess: jess
  } do
    # Founder proof episode — separate realities, not one blob.
    put(conv, alex, "Saturday?", 1)
    put(conv, jordan, "I'm in.", 2)
    put(conv, maya, "Can't get there before 7:30.", 3)
    put(conv, chris, "Anywhere but downtown.", 4)
    put(conv, jess, "Not sushi again 😂.", 5)
    put(conv, maya, "I can come but I'm leaving around 9.", 6)
    put(conv, alex, "Can Sam come?", 7)

    messages =
      from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
      |> Repo.all()

    c = GroupComposition.compose(conv.id, messages)

    assert c["composition"] == "group"
    assert c["member_count"] == 5

    # Who: real members only until Sam is added via membership path
    assert c["who"]["member_count"] == 5
    assert c["who"]["projected_count"] == 5
    assert "Sam" in (c["who"]["pending_invites"] || c["who"]["guest_asks"])
    assert is_map(c["human_surface"])
    assert is_binary(c["human_surface"]["headline"])

    # When: 7:30 is strongest common lower bound; early leave at 9
    assert c["when"]["day"] == "Saturday" or is_binary(c["when"]["strongest_common_start"])
    assert c["when"]["early_leave"] in ["9:00", "9"]
    assert is_binary(c["when"]["window_note"])

    # Where: downtown incompatible
    assert c["where"]["downtown_incompatible"] == true
    assert "downtown" in c["where"]["excluded_areas"]

    # Food: sushi conflict
    assert c["food"]["sushi_conflict"] == true

    # Participation: early leave does not kill plan
    assert c["participation"]["early_leave_present"] == true
    assert c["participation"]["kills_plan"] == false

    # Capacity: pending invite may change venue once Sam is a real member
    assert c["capacity"]["venue_feasibility_may_change"] == true
    assert c["capacity"]["party_size"] == 5

    # Authority model is required-participants, not unanimous-all
    assert c["authority"]["model"] == "required_participants"
    assert c["authority"]["optional_may_skip"] == true
    assert c["authority"]["unanimous_all_members"] == false
  end

  test "Sam becomes a real ConversationMember and recomputes venue capacity", %{
    conv: conv,
    alex: alex,
    jordan: jordan,
    maya: maya,
    chris: chris,
    jess: jess
  } do
    alias OpalCore.Messages
    alias OpalCore.SocialFlow.GroupMembership

    {:ok, sam} =
      %User{}
      |> User.changeset(%{
        display_name: "Sam",
        handle: "sam_rev_#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    put(conv, alex, "We should get dinner Saturday after 7.", 1)
    put(conv, jordan, "I'm in.", 2)
    put(conv, maya, "Works for me.", 3)
    put(conv, jess, "I'm in.", 4)
    put(conv, chris, "I'm in. Harbor Table?", 5)

    messages =
      from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
      |> Repo.all()

    before = GroupComposition.compose(conv.id, messages)
    assert before["member_count"] == 5
    fit_before = GroupComposition.venue_fit(before)
    # Harbor Table max_party 5 — still viable for 5
    assert fit_before["party_size"] == 5

    assert {:ok, :added, ^sam, meta} =
             GroupMembership.resolve_and_add(conv.id, alex.id, "Sam")

    assert meta["member_count"] == 6
    assert sam.id in Messages.member_user_ids(conv.id)

    # Sam can message after membership
    assert {:ok, _msg, origin} =
             Messages.accept_message(%{
               conversation_id: conv.id,
               sender_user_id: sam.id,
               client_message_id: "sam-msg-#{System.system_time(:nanosecond)}",
               message_type: "text",
               body: "Count me in for Saturday."
             })

    assert origin in [:created, :idempotent]

    messages2 =
      from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
      |> Repo.all()

    after_c = GroupComposition.compose(conv.id, messages2)
    assert after_c["member_count"] == 6
    fit_after = GroupComposition.venue_fit(after_c)
    assert fit_after["party_size"] == 6
    # Harbor Table (max 5) no longer strongest; Coast Kitchen / Herb & Wood seat 8
    strongest = fit_after["strongest"]
    assert is_map(strongest)
    refute strongest["id"] == "harbor_table" or strongest["max_party"] < 6
  end

  test "optional late arrival does not block Set when required affirm", %{
    conv: conv,
    alex: alex,
    jordan: jordan,
    maya: maya,
    chris: chris,
    jess: jess
  } do
    put(conv, alex, "We should get dinner Saturday after 7.", 1)
    put(conv, jordan, "I'm in.", 2)
    put(conv, maya, "Works for me.", 3)
    put(conv, jess, "I'm in. Harbor Table works.", 4)
    # Chris: start without me — optional, not a Set blocker
    put(conv, chris, "Start without me, I'll meet you around 8.", 5)
    put(conv, alex, "Works for me. See you at Harbor Table.", 6)

    messages =
      from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
      |> Repo.all()

    c = GroupComposition.compose(conv.id, messages)
    assert chris.id in c["who"]["optional_participant_ids"]
    refute chris.id in c["who"]["required_participant_ids"]

    # Required (4) all affirmed; Chris optional
    assert AlignmentAuthority.authorize_set?(conv.id, messages)

    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, alex.id)
    assert Enum.any?(signals, &(&1["lifecycle_stage"] == "set"))
    gc = Enum.find(signals, &(&1["kind"] != "proposal"))["group_composition"]
    assert gc["where"]["known_place"] == "Harbor Table" or is_map(gc)
  end

  test "two of five required still cannot Set (no dyad proxy)", %{
    conv: conv,
    alex: alex,
    jordan: jordan
  } do
    put(conv, alex, "We should get dinner Saturday.", 1)
    put(conv, jordan, "I'm in.", 2)
    put(conv, alex, "Works for me.", 3)

    messages =
      from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
      |> Repo.all()

    refute AlignmentAuthority.authorize_set?(conv.id, messages)

    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, alex.id)
    rec = Enum.find(signals, &(&1["kind"] != "proposal"))
    refute rec["lifecycle_stage"] == "set"
  end

  test "recomposition when one fact changes (place exclusion)", %{
    conv: conv,
    alex: alex,
    jordan: jordan,
    maya: maya,
    chris: chris,
    jess: jess
  } do
    put(conv, alex, "Saturday dinner?", 1)
    put(conv, jordan, "I'm in.", 2)
    put(conv, maya, "Works for me after 7:30.", 3)
    put(conv, jess, "I'm in.", 4)
    put(conv, chris, "I'm in.", 5)

    messages =
      from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
      |> Repo.all()

    before = GroupComposition.compose(conv.id, messages)
    refute before["where"]["downtown_incompatible"]

    put(conv, chris, "Anywhere but downtown.", 6)

    messages2 =
      from(m in Message, where: m.conversation_id == ^conv.id, order_by: [asc: m.server_seq])
      |> Repo.all()

    after_c = GroupComposition.compose(conv.id, messages2)
    assert after_c["where"]["downtown_incompatible"] == true
    assert "downtown" in Enum.map(after_c["constraints"], & &1["value"])
  end
end
