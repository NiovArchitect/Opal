defmodule OpalCore.CallsTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
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

    %{a: a, b: b}
  end

  test "invite → answer → hangup emits outbox call events", %{a: a, b: b} do
    assert {:ok, call} = Calls.invite(a.id, %{"callee_user_id" => b.id})
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

  test "callee can decline; stranger forbidden", %{a: a, b: b} do
    {:ok, call} = Calls.invite(a.id, %{"callee_user_id" => b.id})

    stranger =
      %User{}
      |> User.changeset(%{handle: "x-#{System.unique_integer([:positive])}", display_name: "X"})
      |> Repo.insert!()

    assert {:error, :forbidden} = Calls.answer(call.id, stranger.id)
    assert {:ok, declined} = Calls.decline(call.id, b.id)
    assert declined.status == "ended"
    assert declined.ended_reason == "declined"
  end

  test "cannot call self", %{a: a} do
    assert {:error, :cannot_call_self} = Calls.invite(a.id, %{"callee_user_id" => a.id})
  end

  test "a conversation call uses the other member and ignores a forged callee", %{a: a, b: b} do
    conv = dyad(a, b)

    assert {:error, :callee_rejected} =
             Calls.invite_in_conversation(a.id, conv.id, %{"callee_user_id" => a.id})

    assert {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert call.conversation_id == conv.id
    assert call.callee_user_id == b.id
    assert call.status == "ringing"

    assert {:ok, again} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert again.id == call.id

    assert {:ok, crossed} = Calls.invite_in_conversation(b.id, conv.id, %{})
    assert crossed.id == call.id

    stranger =
      %User{}
      |> User.changeset(%{handle: "out-#{System.unique_integer([:positive])}", display_name: "Out"})
      |> Repo.insert!()

    assert {:error, :not_a_member} = Calls.invite_in_conversation(stranger.id, conv.id, %{})
  end

  test "an answered call is busy and a second accept loses", %{a: a, b: b} do
    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert {:ok, _} = Calls.answer(call.id, b.id)
    assert {:error, :invalid_state} = Calls.answer(call.id, b.id)
    assert {:error, :busy} = Calls.invite_in_conversation(a.id, conv.id, %{})
  end

  test "an unanswered call can be marked missed", %{a: a, b: b} do
    conv = dyad(a, b)
    {:ok, call} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert {:ok, missed} = Calls.expire_if_ringing(call.id)
    assert missed.status == "missed"
    assert missed.ended_reason == "missed"
    assert {:ok, still} = Calls.expire_if_ringing(call.id)
    assert still.status == "missed"
  end

  test "history keeps a failed media call and times only a connected one", %{a: a, b: b} do
    conv = dyad(a, b)
    {:ok, failed} = Calls.invite_in_conversation(a.id, conv.id, %{})
    {:ok, _} = Calls.answer(failed.id, b.id)
    {:ok, _} = Calls.end_call_session(failed.id, a.id, "hangup")

    [failed_row] = Enum.filter(Calls.list_for(a.id), &(&1["id"] == failed.id))
    assert failed_row["history_label"] == "Call couldn't connect"
    assert failed_row["direction"] == "outgoing"
    assert failed_row["conversation_id"] == conv.id

    {:ok, live} = Calls.invite_in_conversation(b.id, conv.id, %{})
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

  test "call copy is viewer-relative and one session is one row", %{a: a, b: b} do
    conv = dyad(a, b)

    {:ok, canceled} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert {:ok, _} = Calls.cancel(canceled.id, a.id)
    assert caller_label(canceled.id, a.id) == "Canceled call"
    assert callee_label(canceled.id, b.id) == "Missed call"
    assert caller_row(canceled.id, a.id)["missed"] == false
    assert callee_row(canceled.id, b.id)["missed"] == true
    assert length(Enum.filter(Calls.list_for(a.id), &(&1["id"] == canceled.id))) == 1

    {:ok, declined} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert {:ok, _} = Calls.decline(declined.id, b.id)
    assert caller_label(declined.id, a.id) == "Call declined"
    assert callee_label(declined.id, b.id) == "Declined call"
    refute callee_row(declined.id, b.id)["missed"]

    {:ok, timed_out} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert {:ok, _} = Calls.expire_if_ringing(timed_out.id)
    assert caller_label(timed_out.id, a.id) == "No answer"
    assert callee_label(timed_out.id, b.id) == "Missed call"

    {:ok, failed} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert {:ok, _} = Calls.answer(failed.id, b.id)
    assert {:ok, _} = Calls.end_call_session(failed.id, a.id, "media_failed")
    assert caller_label(failed.id, a.id) == "Call couldn't connect"
    assert callee_label(failed.id, b.id) == "Call couldn't connect"
    refute caller_row(failed.id, a.id)["history_label"] =~ ~r/\d+s/

    {:ok, live} = Calls.invite_in_conversation(a.id, conv.id, %{})
    assert {:ok, _} = Calls.answer(live.id, b.id)
    assert {:ok, _} = Calls.mark_media_connected(live.id, a.id)
    assert {:ok, _} = Calls.end_call_session(live.id, b.id, "hangup")
    assert caller_label(live.id, a.id) =~ "Audio call ·"
    assert callee_label(live.id, b.id) == caller_label(live.id, a.id)
  end

  defp caller_label(id, user_id), do: caller_row(id, user_id)["history_label"]
  defp callee_label(id, user_id), do: callee_row(id, user_id)["history_label"]
  defp caller_row(id, user_id), do: Enum.find(Calls.list_for(user_id), &(&1["id"] == id))
  defp callee_row(id, user_id), do: Enum.find(Calls.list_for(user_id), &(&1["id"] == id))

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
