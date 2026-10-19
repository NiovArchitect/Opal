defmodule OpalCore.Calls.GraphingTest do
  @moduledoc """
  Repair #19 W12 (scope item 16): the graphing light's state machine,
  the per-call pause actually halting ingestion, the consent lineage,
  and the call-channel broadcast — all against the real Assist gate
  (`Assist.accept_transcript/3` is the only ingestion path).
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
  alias OpalCore.Calls.Assist
  alias OpalCore.Calls.Graphing
  alias OpalCore.Calls.GraphingEvent
  alias OpalCore.Calls.TranscriptSegment
  alias OpalCore.Repo

  test "state machine: off -> waiting_for_other -> graphing, one state for every viewer" do
    {a, b, call} = connected_call()

    assert Graphing.graphing_state(call) == :off
    assert {:ok, %{graphing: :off}} = Assist.state(call.id, a.id)

    assert {:ok, %{graphing: :waiting_for_other}} = Assist.set_allowed(call.id, a.id, true)
    assert {:ok, %{graphing: :waiting_for_other}} = Assist.state(call.id, b.id)

    assert {:ok, %{graphing: :graphing}} = Assist.set_allowed(call.id, b.id, true)
    assert {:ok, %{graphing: :graphing}} = Assist.state(call.id, a.id)
    assert Graphing.graphing_state(call.id) == :graphing
  end

  test "pause halts ingestion: no transcript segment and no graph record from the pause window" do
    {a, b, call} = connected_call()
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    assert {:ok, %{persisted: true}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Dinner tomorrow at seven.",
               "final" => true,
               "provider_segment_id" => "g-before-pause",
               "confidence" => 0.9
             })

    assert Repo.aggregate(TranscriptSegment, :count) == 1

    # ANY participant can pause: b pauses, a's surface agrees.
    assert {:ok, %{graphing: :paused}} = Assist.set_allowed(call.id, b.id, false)
    assert {:ok, %{graphing: :paused, assist: :off}} = Assist.state(call.id, a.id)
    assert Graphing.graphing_state(call) == :paused

    assert {:error, :assist_inactive} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "This sentence is spoken while paused.",
               "final" => true,
               "provider_segment_id" => "g-during-pause",
               "confidence" => 0.95
             })

    assert {:error, :assist_inactive} =
             Assist.accept_transcript(call.id, b.id, %{
               "text" => "Also spoken while paused.",
               "final" => true,
               "provider_segment_id" => "g-during-pause-2",
               "confidence" => 0.95
             })

    # Nothing from the pause window exists anywhere.
    assert Repo.aggregate(TranscriptSegment, :count) == 1

    # Resume is equally real: ingestion flows again.
    assert {:ok, %{graphing: :graphing}} = Assist.set_allowed(call.id, b.id, true)

    assert {:ok, %{persisted: true}} =
             Assist.accept_transcript(call.id, a.id, %{
               "text" => "Back to dinner at seven.",
               "final" => true,
               "provider_segment_id" => "g-after-resume",
               "confidence" => 0.9
             })

    assert Repo.aggregate(TranscriptSegment, :count) == 2
  end

  test "paused is visibly distinct from off and from a first-run decline" do
    {a, b, call} = connected_call()

    # A first-run "Not now" (never allowed) is a decline: graphing :off,
    # never :paused.
    assert {:ok, %{graphing: :off}} = Assist.set_allowed(call.id, a.id, false, "account")
    assert Graphing.graphing_state(call) == :off

    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)
    assert Graphing.graphing_state(call) == :graphing

    Assist.set_allowed(call.id, a.id, false)
    assert Graphing.graphing_state(call) == :paused
    refute Graphing.graphing_state(call) == :off
  end

  test "every transition writes consent lineage with actor, action, and resulting state" do
    {a, b, call} = connected_call()

    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)
    Assist.set_allowed(call.id, a.id, false)
    Assist.set_allowed(call.id, a.id, true)

    lineage = Graphing.lineage(call.id)
    actions = Enum.map(lineage, &{&1.action, &1.resulting_state, &1.actor_user_id})

    assert actions == [
             {"graphing_on", "waiting_for_other", a.id},
             {"graphing_on", "graphing", b.id},
             {"graphing_paused", "paused", a.id},
             {"graphing_resumed", "graphing", a.id}
           ]

    assert Repo.aggregate(GraphingEvent, :count) == 4
  end

  test "transitions broadcast the one payload on the call channel topic" do
    {a, b, call} = connected_call()
    assert :ok = OpalCoreWeb.Endpoint.subscribe("call:" <> call.id)

    Assist.set_allowed(call.id, a.id, true)
    assert_receive %Phoenix.Socket.Broadcast{event: "graphing", payload: p1}
    assert p1["call_id"] == call.id
    assert p1["graphing"] == "waiting_for_other"
    assert p1["by_user_id"] == a.id

    Assist.set_allowed(call.id, b.id, true)
    assert_receive %Phoenix.Socket.Broadcast{event: "graphing", payload: p2}
    assert p2["graphing"] == "graphing"

    Assist.set_allowed(call.id, b.id, false)
    assert_receive %Phoenix.Socket.Broadcast{event: "graphing", payload: p3}
    assert p3["graphing"] == "paused"
    assert p3["by_user_id"] == b.id
  end

  test "the channel graphing control delegates to the same gate and replies with the payload" do
    {a, b, call} = connected_call()
    Assist.set_allowed(call.id, a.id, true)
    Assist.set_allowed(call.id, b.id, true)

    socket = %Phoenix.Socket{assigns: %{call_id: call.id, user_id: b.id}}

    assert {:reply, {:ok, payload}, %Phoenix.Socket{}} =
             OpalCoreWeb.CallChannel.handle_in("graphing", %{"allowed" => false}, socket)

    assert payload["graphing"] == "paused"
    assert payload["call_id"] == call.id
    assert Graphing.graphing_state(call) == :paused

    assert [%GraphingEvent{action: "graphing_paused", actor_user_id: actor}] =
             Graphing.lineage(call.id) |> Enum.filter(&(&1.action == "graphing_paused"))

    assert actor == b.id

    assert {:reply, {:error, %{reason: "invalid_graphing"}}, %Phoenix.Socket{}} =
             OpalCoreWeb.CallChannel.handle_in("graphing", %{"allowed" => "yes"}, socket)
  end

  test "standing account default seeds new calls and the per-call pause never rewrites it" do
    {a, b, call} = connected_call()
    Repo.update!(User.changeset(a, %{assist_calls_enabled: true}))
    Repo.update!(User.changeset(b, %{assist_calls_enabled: true}))

    assert {:ok, %{graphing: :graphing, account_default: true}} = Assist.state(call.id, a.id)

    assert {:ok, %{graphing: :paused}} = Assist.set_allowed(call.id, a.id, false, "call")
    assert Repo.get!(User, a.id).assist_calls_enabled == true
  end

  defp connected_call do
    a = user("graph-a")
    b = user("graph-b")

    {:ok, call} =
      Calls.invite(a.id, %{
        "callee_user_id" => b.id,
        "consent_proof_id" => grant_act_on_behalf!(a.id, "calls_outbound")
      })

    {:ok, _} = Calls.answer(call.id, b.id)
    {:ok, live} = Calls.mark_media_connected(call.id, a.id)
    {a, b, live}
  end

  defp user(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end
end
