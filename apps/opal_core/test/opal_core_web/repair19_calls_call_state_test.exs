defmodule OpalCoreWeb.Repair19CallsCallStateTest do
  @moduledoc """
  Repair #19 W2 - the call log's ONE call-state fact
  (Calls.CallState, riding GET /calls as `call_state`):

  - a completed call with no shared plan is settled ("past");
  - an incoming missed call the viewer has not since connected
    with that peer over is "action" / "missed_unresolved";
  - STATE CHANGE: a later CONNECTED call with the same peer
    resolves the miss - the same row reads back "past" / "settled";
  - a shared upcoming plan drives the row from the DIR-1 fact:
    "action" / "plan_action" for the invited viewer, "forming" /
    "plan_forming" for the lead; cancelling the plan (the action
    resolved) reads back "past" / "settled";
  - an agreed plan is "ready" / "plan_ready"; moving its start
    into the live window reads back "happening" / "plan_happening".
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Calls.CallSession
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.SharedPlan

  @a "+12025550301"
  @b "+12025550302"
  @c "+12025550303"

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp activate(phone, name, handle) do
    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "r19-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(build_conn(), "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp get_json(token, path) do
    build_conn() |> auth(token) |> get(path) |> json_response(200)
  end

  defp direct(token, peer_id) do
    body =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => peer_id})
      |> json_response(201)

    body["conversation_id"]
  end

  defp create_plan(token, conversation_id, attrs) do
    body =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", attrs)
      |> json_response(201)

    body["plan"]
  end

  defp call_row(token, call_id) do
    body = get_json(token, "/api/v1/product/calls")
    Enum.find(body["calls"], &(&1["id"] == call_id))
  end

  defp insert_call!(caller_id, callee_id, attrs) do
    at = Keyword.fetch!(attrs, :at)

    %CallSession{
      caller_user_id: caller_id,
      callee_user_id: callee_id,
      conversation_id: Keyword.get(attrs, :conversation_id),
      status: Keyword.fetch!(attrs, :status),
      ended_reason: Keyword.get(attrs, :ended_reason),
      correlation_id: "r19-#{System.unique_integer([:positive])}",
      ringing_at: at,
      answered_at: Keyword.get(attrs, :answered_at),
      media_connected_at: Keyword.get(attrs, :media_connected_at),
      ended_at: Keyword.get(attrs, :ended_at),
      inserted_at: at,
      updated_at: at
    }
    |> Repo.insert!()
  end

  test "missed call is action until a later connected call with the peer resolves it" do
    {token_a, user_a} = activate(@a, "R19 A", "r19_a")
    {token_b, user_b} = activate(@b, "R19 B", "r19_b")
    conv_ab = direct(token_a, user_b)

    base = DateTime.utc_now() |> DateTime.add(-7200, :second) |> DateTime.truncate(:microsecond)

    missed =
      insert_call!(user_a, user_b,
        at: base,
        conversation_id: conv_ab,
        status: "missed",
        ended_reason: "missed",
        ended_at: DateTime.add(base, 30, :second)
      )

    # The callee's row: an unresolved miss - action, with its reason.
    row_b = call_row(token_b, missed.id)
    assert row_b["missed"] == true
    assert row_b["call_state"] == %{
             "state" => "action",
             "reason" => "missed_unresolved",
             "label" => "Call back"
           }

    # The caller's row for the same record: "No answer" is not the
    # caller's open business - settled, no plan in play.
    row_a = call_row(token_a, missed.id)
    assert row_a["missed"] == false
    assert row_a["call_state"]["state"] == "past"
    assert row_a["call_state"]["reason"] == "settled"

    # STATE CHANGE: a later call with the same peer connects.
    later_at = DateTime.add(base, 3600, :second)

    connected =
      insert_call!(user_b, user_a,
        at: later_at,
        conversation_id: conv_ab,
        status: "ended",
        ended_reason: "hangup",
        answered_at: later_at,
        media_connected_at: later_at,
        ended_at: DateTime.add(later_at, 600, :second)
      )

    # The connected row itself is settled history.
    assert call_row(token_b, connected.id)["call_state"]["state"] == "past"

    # ...and the SAME missed row now reads back settled for the callee.
    resolved_b = call_row(token_b, missed.id)
    assert resolved_b["call_state"] == %{
             "state" => "past",
             "reason" => "settled",
             "label" => "Settled"
           }
  end

  test "plan states drive the row; cancelling the plan resolves action back to settled" do
    {token_a, user_a} = activate(@a, "R19 A2", "r19_a2")
    {token_b, user_b} = activate(@b, "R19 B2", "r19_b2")
    conv_ab = direct(token_a, user_b)

    at = DateTime.utc_now() |> DateTime.add(-3600, :second) |> DateTime.truncate(:microsecond)

    call =
      insert_call!(user_a, user_b,
        at: at,
        conversation_id: conv_ab,
        status: "ended",
        ended_reason: "hangup",
        answered_at: at,
        media_connected_at: at,
        ended_at: DateTime.add(at, 300, :second)
      )

    # No plan: settled on both sides.
    assert call_row(token_a, call.id)["call_state"]["state"] == "past"
    assert call_row(token_b, call.id)["call_state"]["state"] == "past"

    plan =
      create_plan(token_a, conv_ab, %{
        "title" => "Dinner at Juniper",
        "place" => "Juniper and Ivy",
        "location" => "Juniper and Ivy",
        "time_label" => "Saturday 7:30 PM"
      })

    # The invited viewer's row is driven by the plan fact: action.
    row_b = call_row(token_b, call.id)
    assert row_b["next_plan"]["plan_id"] == plan["id"]
    assert row_b["call_state"] == %{
             "state" => "action",
             "reason" => "plan_action",
             "label" => "Needs your answer"
           }

    # The lead's row: the same plan, still forming.
    row_a = call_row(token_a, call.id)
    assert row_a["call_state"] == %{
             "state" => "forming",
             "reason" => "plan_forming",
             "label" => "Taking shape"
           }

    # STATE CHANGE: the plan is cancelled - the action is gone and
    # both rows read back settled on the next read.
    build_conn()
    |> auth(token_a)
    |> post("/api/v1/product/opal/plans/#{plan["id"]}/cancel", %{})
    |> json_response(200)

    assert call_row(token_b, call.id)["call_state"]["state"] == "past"
    assert call_row(token_b, call.id)["call_state"]["reason"] == "settled"
    assert call_row(token_a, call.id)["call_state"]["state"] == "past"
  end

  test "an agreed plan is ready; its live window is happening" do
    {token_a, user_a} = activate(@a, "R19 A3", "r19_a3")
    {_token_c, user_c} = activate(@c, "R19 C3", "r19_c3")
    conv_ac = direct(token_a, user_c)

    at = DateTime.utc_now() |> DateTime.add(-3600, :second) |> DateTime.truncate(:microsecond)

    call =
      insert_call!(user_a, user_c,
        at: at,
        conversation_id: conv_ac,
        status: "ended",
        ended_reason: "hangup",
        answered_at: at,
        media_connected_at: at,
        ended_at: DateTime.add(at, 300, :second)
      )

    plan =
      create_plan(token_a, conv_ac, %{
        "title" => "Market run",
        "place" => "Oceanside Farmers Market",
        "location" => "Oceanside Farmers Market",
        "time_label" => "Saturday 9:00 AM"
      })

    Repo.get!(SharedPlan, plan["id"])
    |> Ecto.Changeset.change(status: "agreed")
    |> Repo.update!()

    row_a = call_row(token_a, call.id)
    assert row_a["next_plan"]["state"] == "ready"
    assert row_a["call_state"] == %{
             "state" => "ready",
             "reason" => "plan_ready",
             "label" => "Ready"
           }

    # STATE CHANGE: the plan's start enters the live window.
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    Repo.get!(SharedPlan, plan["id"])
    |> Ecto.Changeset.change(
      start_at: DateTime.add(now, -600, :second),
      end_at: DateTime.add(now, 3600, :second)
    )
    |> Repo.update!()

    row_a = call_row(token_a, call.id)
    assert row_a["next_plan"]["state"] == "happening"
    assert row_a["call_state"] == %{
             "state" => "happening",
             "reason" => "plan_happening",
             "label" => "Happening now"
           }
  end
end
