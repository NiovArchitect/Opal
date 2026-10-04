defmodule OpalCore.CallsTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
  alias OpalCore.Calls.ChannelPresence
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo
  import Ecto.Query

  setup do
    a =
      %User{}
      |> User.changeset(%{handle: "caller-#{System.unique_integer([:positive])}", display_name: "Caller"})
      |> Repo.insert!()

    b =
      %User{}
      |> User.changeset(%{handle: "callee-#{System.unique_integer([:positive])}", display_name: "Callee"})
      |> Repo.insert!()

    consent_a = grant_act_on_behalf!(a.id, "calls_outbound")
    consent_b = grant_act_on_behalf!(b.id, "calls_outbound")

    %{a: a, b: b, consent_a: consent_a, consent_b: consent_b}
  end

  defp call_attrs(proof_id, extra \\ %{}) do
    Map.merge(%{"consent_proof_id" => proof_id}, stringify_extra(extra))
  end

  defp stringify_extra(extra) when is_map(extra), do: extra
  defp stringify_extra(_), do: %{}

  test "invite → answer → hangup emits outbox call events", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    assert {:ok, call} = Calls.invite(a.id, call_attrs(consent_a, %{"callee_user_id" => b.id}))
    assert call.status == "ringing"
    assert call.caller_user_id == a.id
    assert call.callee_user_id == b.id

    assert Repo.exists?(
             from o in EventOutbox, where: o.event_type == "call.invited" and o.aggregate_id == ^call.id
           )

    assert {:ok, answered} = Calls.answer(call.id, b.id)
    assert answered.status == "answered"

    assert {:ok, ended} = Calls.end_call_session(call.id, a.id, "hangup")
    assert ended.status == "ended"
    assert ended.ended_reason == "hangup"

    assert Repo.exists?(
             from o in EventOutbox, where: o.event_type == "call.ended" and o.aggregate_id == ^call.id
           )
  end

  test "callee can decline; stranger forbidden", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    {:ok, call} = Calls.invite(a.id, call_attrs(consent_a, %{"callee_user_id" => b.id}))

    stranger =
      %User{}
      |> User.changeset(%{handle: "x-#{System.unique_integer([:positive])}", display_name: "X"})
      |> Repo.insert!()

    assert {:error, :forbidden} = Calls.answer(call.id, stranger.id)
    assert {:ok, declined} = Calls.decline(call.id, b.id)
    assert declined.status == "ended"
    assert declined.ended_reason == "declined"
  end

  test "decline ends the session and the next call is a new id", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    assert {:ok, first} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert {:ok, declined} = Calls.decline(first.id, b.id)
    assert declined.status == "ended"
    assert declined.ended_reason == "declined"

    assert {:ok, second} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert second.id != first.id
    assert second.status == "ringing"
  end

  test "cannot call self", %{a: a, consent_a: consent_a} do
    assert {:error, :cannot_call_self} = Calls.invite(a.id, call_attrs(consent_a, %{"callee_user_id" => a.id}))
  end

  test "a conversation call uses the other member and ignores a forged callee", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)

    assert {:error, :callee_rejected} =
             Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a, %{"callee_user_id" => a.id}))

    assert {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert call.conversation_id == conv.id
    assert call.callee_user_id == b.id
    assert call.status == "ringing"

    assert {:ok, again} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert again.id == call.id

    assert {:ok, crossed} = Calls.invite_in_conversation(b.id, conv.id, call_attrs(consent_b))
    assert crossed.id == call.id

    stranger =
      %User{}
      |> User.changeset(%{handle: "out-#{System.unique_integer([:positive])}", display_name: "Out"})
      |> Repo.insert!()

    assert {:error, :not_a_member} = Calls.invite_in_conversation(stranger.id, conv.id, call_attrs(grant_act_on_behalf!(stranger.id, "calls_outbound")))
  end

  test "an answered call is busy and a second accept loses", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert {:ok, _} = Calls.answer(call.id, b.id)
    assert {:error, :invalid_state} = Calls.answer(call.id, b.id)
    assert {:error, :busy} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
  end

  test "an unanswered call can be marked missed", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert {:ok, missed} = Calls.expire_if_ringing(call.id)
    assert missed.status == "missed"
    assert missed.ended_reason == "missed"
    assert {:ok, still} = Calls.expire_if_ringing(call.id)
    assert still.status == "missed"
  end

  test "history keeps a failed media call and times only a connected one", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    {:ok, failed} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    {:ok, _} = Calls.answer(failed.id, b.id)
    {:ok, _} = Calls.end_call_session(failed.id, a.id, "hangup")

    [failed_row] = Enum.filter(Calls.list_for(a.id), &(&1["id"] == failed.id))
    assert failed_row["history_label"] == "Call couldn't connect"
    assert failed_row["direction"] == "outgoing"
    assert failed_row["conversation_id"] == conv.id

    {:ok, live} = Calls.invite_in_conversation(b.id, conv.id, call_attrs(consent_b))
    {:ok, _} = Calls.answer(live.id, a.id)
    {:ok, connected} = Calls.mark_media_connected(live.id, a.id)
    assert connected.media_connected_at
    {:ok, _} = Calls.end_call_session(live.id, b.id, "hangup")

    [live_row] = Enum.filter(Calls.list_for(b.id), &(&1["id"] == live.id))
    assert live_row["direction"] == "outgoing"
    assert live_row["history_label"] =~ "Audio call ·"
    refute live_row["history_label"] =~ "call:"
    refute failed_row["history_label"] =~ "call:"
    assert failed_row["peer_name"] != failed.id
    refute failed_row["missed"]
  end

  test "call copy is viewer-relative and one session is one row", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)

    {:ok, canceled} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert {:ok, _} = Calls.cancel(canceled.id, a.id)
    assert caller_label(canceled.id, a.id) == "Canceled call"
    assert callee_label(canceled.id, b.id) == "Missed call"
    assert caller_row(canceled.id, a.id)["missed"] == false
    assert callee_row(canceled.id, b.id)["missed"] == true
    assert length(Enum.filter(Calls.list_for(a.id), &(&1["id"] == canceled.id))) == 1

    {:ok, declined} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert {:ok, _} = Calls.decline(declined.id, b.id)
    assert caller_label(declined.id, a.id) == "Call declined"
    assert callee_label(declined.id, b.id) == "Declined call"
    refute callee_row(declined.id, b.id)["missed"]

    {:ok, timed_out} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert {:ok, _} = Calls.expire_if_ringing(timed_out.id)
    assert caller_label(timed_out.id, a.id) == "No answer"
    assert callee_label(timed_out.id, b.id) == "Missed call"

    {:ok, failed} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert {:ok, _} = Calls.answer(failed.id, b.id)
    assert {:ok, _} = Calls.end_call_session(failed.id, a.id, "media_failed")
    assert caller_label(failed.id, a.id) == "Call couldn't connect"
    assert callee_label(failed.id, b.id) == "Call couldn't connect"
    refute caller_row(failed.id, a.id)["history_label"] =~ ~r/\d+s/

    {:ok, live} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert {:ok, _} = Calls.answer(live.id, b.id)
    assert {:ok, _} = Calls.mark_media_connected(live.id, a.id)
    assert {:ok, _} = Calls.end_call_session(live.id, b.id, "hangup")
    assert caller_label(live.id, a.id) =~ "Audio call ·"
    assert callee_label(live.id, b.id) == caller_label(live.id, a.id)
  end

  test "CONNECTED_REMOTE_HANGUP_PROPAGATES and REMOTE_HANGUP_B_TO_A", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    {:ok, _} = Calls.answer(call.id, b.id)
    {:ok, _} = Calls.mark_media_connected(call.id, a.id)

    {:ok, ended} = Calls.end_call_session(call.id, b.id, "hangup")
    assert ended.status == "ended"
    assert ended.ended_reason == "hangup"
    assert ended.ended_at
    assert caller_label(call.id, a.id) == callee_label(call.id, b.id)
    assert caller_label(call.id, a.id) =~ "Audio call ·"
    assert length(Enum.filter(Calls.list_for(a.id), &(&1["id"] == call.id))) == 1
    assert length(Enum.filter(Calls.list_for(b.id), &(&1["id"] == call.id))) == 1

    {:ok, again} = Calls.end_call_session(call.id, a.id, "hangup")
    assert again.status == "ended"
    assert again.ended_at == ended.ended_at
    assert {:error, :invalid_state} = Calls.mark_media_connected(call.id, a.id)
    assert caller_label(call.id, a.id) == callee_label(call.id, b.id)
  end

  test "REMOTE_HANGUP_A_TO_B", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    {:ok, _} = Calls.answer(call.id, b.id)
    {:ok, _} = Calls.mark_media_connected(call.id, b.id)
    {:ok, ended} = Calls.end_call_session(call.id, a.id, "hangup")
    assert ended.status == "ended"
    assert caller_label(call.id, a.id) == callee_label(call.id, b.id)
    assert {:ok, again} = Calls.end_call_session(call.id, b.id, "hangup")
    assert again.ended_at == ended.ended_at
  end

  test "CONNECTED_REMOTE_HANGUP_WITH_ASSIST_ACTIVE", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    for user <- [a, b] do
      user |> Ecto.Changeset.change(%{assist_calls_enabled: true}) |> Repo.update!()
    end

    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    {:ok, _} = Calls.answer(call.id, b.id)
    {:ok, connected} = Calls.mark_media_connected(call.id, a.id)
    assert connected.status == "answered"

    assert {:ok, %{assist: :active, account_default: true}} =
             OpalCore.Calls.Assist.state(call.id, a.id)

    {:ok, ended} = Calls.end_call_session(call.id, b.id, "hangup")
    assert ended.status == "ended"
    assert ended.ended_at
    assert caller_label(call.id, a.id) == callee_label(call.id, b.id)

    assert {:error, :not_connected} =
             OpalCore.Calls.Assist.grant(call.id, a.id, fn -> {:ok, %{access_token: "x", expires_in: 30}} end)

    assert {:error, :not_connected} =
             OpalCore.Calls.Assist.accept_transcript(call.id, a.id, %{
               "text" => "Actually, let's make it eight.",
               "final" => true,
               "provider_segment_id" => "after-end"
             })

    assert Repo.get!(User, a.id).assist_calls_enabled == true
    assert Repo.get!(User, b.id).assist_calls_enabled == true
    assert {:error, :invalid_state} = Calls.mark_media_connected(call.id, a.id)
  end

  test "CALL_CREATE_A_TO_B and CALL_CREATE_AFTER_RECONNECT", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    orphan = connected_call(a, b, conv)
    refute ChannelPresence.live?(orphan.id)

    assert {:ok, created} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert created.id != orphan.id
    assert created.status == "ringing"
    assert created.caller_user_id == a.id
    assert created.callee_user_id == b.id
    assert Calls.get(orphan.id, a.id) |> elem(1) |> Map.get(:status) == "ended"

    assert {:ok, same} = Calls.invite_in_conversation(a.id, conv.id, call_attrs(consent_a))
    assert same.id == created.id
    assert same.status == "ringing"
  end

  test "CALL_CREATE_B_TO_A", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    _orphan = connected_call(b, a, conv)

    assert {:ok, created} = Calls.invite_in_conversation(b.id, conv.id, call_attrs(consent_b))
    assert created.status == "ringing"
    assert created.caller_user_id == b.id
    assert created.callee_user_id == a.id
  end

  test "a connected call with someone still in it stays busy", %{a: a, b: b, consent_a: consent_a, consent_b: consent_b} do
    conv = dyad(a, b)
    live = connected_call(a, b, conv)
    :ok = ChannelPresence.track(live.id, self())

    assert {:error, :busy} = Calls.invite_in_conversation(b.id, conv.id, call_attrs(consent_b))
    assert Calls.get(live.id, a.id) |> elem(1) |> Map.get(:status) == "answered"

    :ok = ChannelPresence.untrack(live.id, self())
    assert {:ok, created} = Calls.invite_in_conversation(b.id, conv.id, call_attrs(consent_b))
    assert created.id != live.id
    assert created.status == "ringing"
  end

  defp caller_label(id, user_id), do: caller_row(id, user_id)["history_label"]
  defp callee_label(id, user_id), do: callee_row(id, user_id)["history_label"]
  defp caller_row(id, user_id), do: Enum.find(Calls.list_for(user_id), &(&1["id"] == id))
  defp callee_row(id, user_id), do: Enum.find(Calls.list_for(user_id), &(&1["id"] == id))

  defp connected_call(caller, callee, conv) do
    proof_id = grant_act_on_behalf!(caller.id, "calls_outbound", conversation_id: conv.id)
    {:ok, call} = Calls.invite_in_conversation(caller.id, conv.id, call_attrs(proof_id))
    {:ok, _} = Calls.answer(call.id, callee.id)
    {:ok, connected} = Calls.mark_media_connected(call.id, caller.id)
    connected
  end

  defp dyad(a, b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "call-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    for user <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
      |> Repo.insert!()
    end

    conv
  end
end
