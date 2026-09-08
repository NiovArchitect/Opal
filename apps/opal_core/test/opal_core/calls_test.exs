defmodule OpalCore.CallsTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
  alias OpalCore.Events.EventOutbox
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
end
