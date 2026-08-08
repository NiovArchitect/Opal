defmodule OpalCore.SocialFlow.AlignmentNegativeMatrixTest do
  @moduledoc """
  Negative authority matrix: no false Set, no private leak, no outsider Set.
  """

  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AlignmentState,
    AlignmentParticipation,
    PrivateParticipation,
    ProductSignals,
    Onboarding
  }

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "neg-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "neg-b-#{uid}"})
      |> Repo.insert()

    {:ok, c} =
      %User{}
      |> User.changeset(%{display_name: "C", handle: "neg-c-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "neg-#{uid}"})
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
      client_message_id: "neg-#{seq}-#{System.unique_integer([:positive])}",
      message_type: "text",
      body: body,
      server_seq: seq
    })
    |> Repo.insert!()
  end

  defp labels(conv, user) do
    {:ok, sigs} = ProductSignals.signals_for_conversation(conv.id, user.id)
    Enum.map(sigs, & &1["label"])
  end

  test "ordinary conversation remains quiet", %{a: a, conv: conv} do
    put_msg(conv, a, "Hope your morning is calm.", 1)
    assert labels(conv, a) == []
  end

  test "one affirmative remains Still open", %{a: a, b: b, conv: conv} do
    put_msg(conv, a, "We should study together this week.", 1)
    put_msg(conv, b, "Wednesday works, but not too late.", 2)
    put_msg(conv, a, "I'm in", 3)
    labs = labels(conv, a)
    assert "Still open" in labs
    refute "Set" in labs
  end

  test "need another time language stays open or deferred", %{a: a, b: b, conv: conv} do
    put_msg(conv, a, "We should study together this week.", 1)
    put_msg(conv, b, "Need another time.", 2)
    labs = labels(conv, a)
    refute "Set" in labs
    assert "Will know later" in labs or "Still open" in labs or "Becoming a plan" in labs
  end

  test "private decline invalidates set_gate", %{a: a, b: b, conv: conv} do
    put_msg(conv, a, "We should study together this week.", 1)
    put_msg(conv, a, "I'm in", 2)
    put_msg(conv, b, "Works for me", 3)

    assert {:ok, _} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: a.id,
               response_key: "not_this_time",
               proposal_key: "default"
             })

    assert PrivateParticipation.invalidates_set?(conv.id, "default")

    refute AlignmentState.set_gate_satisfied?(%{
             member_user_ids: [a.id, b.id],
             affirmative_user_ids: [a.id, b.id],
             plan_evidence?: true,
             private_invalidates?: true
           })
  end

  test "cancel language yields Not happening", %{a: a, b: b, conv: conv} do
    put_msg(conv, a, "We should study together this week.", 1)
    put_msg(conv, b, "Not this time.", 2)
    assert "Not happening" in labels(conv, a)
    refute "Set" in labels(conv, a)
  end

  test "duplicate ready messages from one user do not create Set", %{a: a, b: b, conv: conv} do
    put_msg(conv, a, "We should study together this week.", 1)
    put_msg(conv, a, "I'm in", 2)
    put_msg(conv, a, "I'm in", 3)
    put_msg(conv, a, "Works for me", 4)
    refute "Set" in labels(conv, a)
    assert "Still open" in labels(conv, a)
    _ = b
  end

  test "outsider cannot read signals", %{a: a, c: c, conv: conv} do
    put_msg(conv, a, "We should study together this week.", 1)
    put_msg(conv, a, "I'm in", 2)
    assert {:error, :not_a_member} = ProductSignals.signals_for_conversation(conv.id, c.id)
  end

  test "non-member private participation rejected", %{a: a, c: c, conv: conv} do
    put_msg(conv, a, "We should study together this week.", 1)

    assert {:error, :not_a_member} =
             PrivateParticipation.record(%{
               conversation_id: conv.id,
               user_id: c.id,
               response_key: "im_in",
               proposal_key: "default"
             })
  end

  test "set_gate rejects single affirmative and time-only", %{a: a, b: b} do
    refute AlignmentState.set_gate_satisfied?(%{
             member_user_ids: [a.id, b.id],
             affirmative_user_ids: [a.id],
             plan_evidence?: true
           })

    refute AlignmentState.set_gate_satisfied?(%{
             member_user_ids: [a.id, b.id],
             affirmative_user_ids: [],
             plan_evidence?: true
           })

    refute AlignmentState.set_gate_satisfied?(%{
             member_user_ids: [a.id, b.id],
             affirmative_user_ids: [a.id, b.id],
             plan_evidence?: false
           })
  end

  test "shared-safe projection never leaks keys", _ do
    for {key, _} <- AlignmentParticipation.public_action_labels() do
      p = AlignmentParticipation.shared_safe_projection(key)
      PrivateParticipation.assert_shared_safe!(p)
    end
  end

  test "wrong-user continuation resume forbidden" do
    a =
      activate!("+12025550301", "NegA")

    b = activate!("+12025550302", "NegB")
    c = activate!("+12025550303", "NegC")

    assert {:ok, _inv, share, _} =
             Onboarding.create_invitation(%{
               inviter_user_id: a,
               intended_recipient_user_id: b,
               purpose: "connect",
               bounded_message: "Join for study.",
               invite_source: "share_link",
               source_device_label: "Test",
               idempotency_key: "neg-inv-#{System.unique_integer()}"
             })

    if is_map(share) and is_binary(share["share_token"]) do
      assert {:ok, preview} = Onboarding.preview_share_token(share["share_token"])

      assert {:error, reason} =
               Onboarding.resume_invitation_continuation(preview["continuation_id"], c)

      assert reason in [:forbidden, :wrong_user, :not_bound]
    end
  end

  defp activate!(e164, name) do
    {:ok, started, _} =
      Onboarding.start_verification(%{
        identifier_raw: e164,
        purpose: "account_create",
        device_label: "Test",
        idempotency_key: "neg-#{e164}-#{System.unique_integer()}",
        otp_consent_accepted: true
      })

    {:ok, done, _} =
      Onboarding.complete_verification(%{
        challenge_id: started["id"],
        code: started["synthetic_provider_code"],
        display_name: name,
        device_label: "Test",
        platform: "test"
      })

    done.account_id
  end
end
