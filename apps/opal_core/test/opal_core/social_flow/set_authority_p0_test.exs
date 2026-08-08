defmodule OpalCore.SocialFlow.SetAuthorityP0Test do
  @moduledoc """
  P0: Set is not a linguistic inference from ProductSignals alone.
  Production path must honor AlignmentAuthority + private invalidation.
  """

  use OpalCore.DataCase

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AlignmentAuthority,
    PrivateParticipation,
    ProductSignals,
    TrustSafety
  }

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "p0-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "p0-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "p0-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  defp put_msg(conv, user, body, seq) do
    %Message{}
    |> Message.create_changeset(%{
      conversation_id: conv.id,
      sender_user_id: user.id,
      client_message_id: "p0-#{seq}-#{System.unique_integer([:positive])}",
      message_type: "text",
      body: body,
      server_seq: seq
    })
    |> Repo.insert!()
  end

  defp seed_loose_set_evidence(a, b, conv) do
    # Enough for old ProductSignals classify_stage to say :set via mutual ready + plan.
    # Single plan-forming body only — avoid second plan-pattern hits (days, free after)
    # so private participation keys match AlignmentAuthority's active proposal.
    put_msg(conv, a, "We should study together.", 1)
    put_msg(conv, b, "I can do 5:30, not too late.", 2)
    put_msg(conv, a, "I'm in", 3)
    put_msg(conv, b, "Works for me", 4)
  end

  test "production caller: AlignmentAuthority.authorize_set? is invoked for Set", %{
    a: a,
    b: b,
    conv: conv
  } do
    seed_loose_set_evidence(a, b, conv)

    assert AlignmentAuthority.authorize_set?(
             conv.id,
             Repo.all(Message) |> Enum.sort_by(& &1.server_seq)
           )

    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, a.id)
    assert Enum.any?(signals, &(&1["label"] == "Set"))
  end

  test "REGRESSION c0b09df: private Not this time blocks Set on live ProductSignals path", %{
    a: a,
    b: b,
    conv: conv
  } do
    seed_loose_set_evidence(a, b, conv)

    # Without private invalidation, authority would allow Set
    assert AlignmentAuthority.authorize_set?(
             conv.id,
             from_msgs(conv)
           )

    # Use the same proposal_id the live ProductSignals path exposes to clients.
    assert {:ok, pre} = ProductSignals.signals_for_conversation(conv.id, a.id)
    assert Enum.any?(pre, &(&1["label"] == "Set"))
    proposal_key = Enum.find(pre, & &1["proposal_id"])["proposal_id"]
    assert is_binary(proposal_key)

    assert {:ok, shared} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: b.id,
               response_key: "not_this_time",
               proposal_key: proposal_key
             })

    PrivateParticipation.assert_shared_safe!(shared)
    assert PrivateParticipation.invalidates_set?(conv.id, proposal_key)
    refute AlignmentAuthority.authorize_set?(conv.id, from_msgs(conv), proposal_key)

    # Live product path — must NOT show Set
    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, a.id)
    refute Enum.any?(signals, &(&1["label"] == "Set"))

    assert Enum.any?(
             signals,
             &(&1["label"] in ["Still open", "Becoming a plan", "This could work"])
           )

    encoded = Jason.encode!(signals)
    refute encoded =~ "not_this_time"
    refute encoded =~ "response_key"
    # Shared surface must not attribute private answer to B
    refute encoded =~ "not this time"
  end

  test "block between members prevents Set", %{a: a, b: b, conv: conv} do
    seed_loose_set_evidence(a, b, conv)

    assert {:ok, _payload, _} =
             TrustSafety.create_block(%{
               blocker_user_id: a.id,
               blocked_user_id: b.id,
               conversation_id: conv.id,
               scope: "relationship",
               idempotency_key: "p0-blk-#{System.unique_integer()}"
             })

    refute AlignmentAuthority.authorize_set?(conv.id, from_msgs(conv))
    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, a.id)
    refute Enum.any?(signals, &(&1["label"] == "Set"))
  end

  test "removed member affirmatives do not create Set", %{a: a, b: b, conv: conv} do
    {:ok, c} =
      %User{}
      |> User.changeset(%{
        display_name: "C",
        handle: "p0-c-#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: c.id})
    |> Repo.insert!()

    put_msg(conv, a, "We should study together this week.", 1)
    put_msg(conv, b, "I'm in", 2)
    put_msg(conv, c, "Works for me", 3)

    # Remove C — only A remains affirmative among members if B has no ready yet alone
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conv.id and cm.user_id == ^c.id
    )
    |> Repo.delete_all()

    # Only one eligible affirmative (B) after C removed — A said plan not ready alone
    # A has plan msg, B has I'm in, C removed with works for me
    # affirmatives among members: B only (unless A also ready)
    refute AlignmentAuthority.authorize_set?(conv.id, from_msgs(conv))
  end

  test "private im_in replacement clears invalidation", %{a: a, b: b, conv: conv} do
    seed_loose_set_evidence(a, b, conv)
    plan_msg = Enum.find(from_msgs(conv), &String.contains?(&1.body || "", "study"))
    proposal_key = "prop-" <> plan_msg.id

    assert {:ok, _} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: b.id,
               response_key: "not_this_time",
               proposal_key: proposal_key
             })

    refute AlignmentAuthority.authorize_set?(conv.id, from_msgs(conv), proposal_key)

    assert {:ok, _} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: b.id,
               response_key: "im_in",
               proposal_key: proposal_key
             })

    refute PrivateParticipation.invalidates_set?(conv.id, proposal_key)
    assert AlignmentAuthority.authorize_set?(conv.id, from_msgs(conv), proposal_key)
  end

  test "stale proposal: P1 affirmative cannot mix with P2 affirmative for Set", %{
    a: a,
    b: b,
    conv: conv
  } do
    put_msg(conv, a, "We should study together Wednesday.", 1)
    put_msg(conv, a, "I'm in", 2)
    # Superseding plan (active proposal becomes P2)
    put_msg(conv, b, "We should study together Thursday instead.", 3)
    put_msg(conv, b, "Works for me", 4)

    msgs = from_msgs(conv)
    # Active proposal is Thursday (latest plan). Only B affirmed after it.
    refute AlignmentAuthority.authorize_set?(conv.id, msgs)

    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, a.id)
    refute Enum.any?(signals, &(&1["label"] == "Set"))

    # Private affirmatives on different proposal keys also cannot combine
    p1 = Enum.find(msgs, &String.contains?(&1.body || "", "Wednesday"))
    p2 = Enum.find(msgs, &String.contains?(&1.body || "", "Thursday"))

    assert {:ok, _} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: a.id,
               response_key: "im_in",
               proposal_key: "prop-" <> p1.id
             })

    assert {:ok, _} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: b.id,
               response_key: "im_in",
               proposal_key: "prop-" <> p2.id
             })

    # Gate evaluates active (P2) only — A never affirmed P2 privately on active key alone
    # B has message + private on P2; A only private on P1 → still need second eligible on P2
    # A has no post-P2 message affirmative; A private is on P1 → only B counts for P2
    refute AlignmentAuthority.authorize_set?(conv.id, msgs, "prop-" <> p2.id)
  end

  test "private responses on same active proposal can produce Set without raw leak", %{
    a: a,
    b: b,
    conv: conv
  } do
    plan = put_msg(conv, a, "We should study together this week.", 1)
    proposal_key = "prop-" <> plan.id

    assert {:ok, _} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: a.id,
               response_key: "im_in",
               proposal_key: proposal_key
             })

    assert {:ok, shared_b} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: b.id,
               response_key: "im_in",
               proposal_key: proposal_key
             })

    PrivateParticipation.assert_shared_safe!(shared_b)
    assert AlignmentAuthority.authorize_set?(conv.id, from_msgs(conv), proposal_key)

    assert {:ok, signals} = ProductSignals.signals_for_conversation(conv.id, a.id)
    assert Enum.any?(signals, &(&1["label"] == "Set"))
    encoded = Jason.encode!(signals)
    refute encoded =~ "im_in"
    refute encoded =~ "response_key"
  end

  test "set_gate_satisfied? has production caller AlignmentAuthority", _ do
    # Static proof: source wiring
    path =
      Path.join([
        File.cwd!(),
        "lib/opal_core/social_flow/alignment_authority.ex"
      ])

    src = File.read!(path)
    assert src =~ "AlignmentState.set_gate_satisfied?"
    assert src =~ "PrivateParticipation.invalidates_set?"

    ps =
      File.read!(Path.join([File.cwd!(), "lib/opal_core/social_flow/product_signals.ex"]))

    # Production path elevates only via AlignmentAuthority (moduledoc may name the gate).
    assert ps =~ "AlignmentAuthority.authorize_set?"
    refute ps =~ "AlignmentState.set_gate_satisfied?"
  end

  defp from_msgs(conv) do
    from(m in Message,
      where: m.conversation_id == ^conv.id,
      order_by: [asc: m.server_seq]
    )
    |> Repo.all()
  end
end
