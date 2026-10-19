defmodule OpalCoreWeb.Repair18Dir1NextPlanTest do
  @moduledoc """
  Repair #18 DIR-1 (FR-18-DIR1-01 / FR-18-DIR1-02) - EVENT IN
  CONVERSATION: one shared upcoming plan fact, derived in the service
  layer from real plan records, read back identically in
  (i) the chats-list contract, (ii) the thread contract (messages +
  alignment), and (iii) the call-log contract. Negative legs: no plan
  -> the field is null on all three; a plan with a third person does
  not surface in a different person's row (scope); a cancelled plan
  and a past plan exit everywhere (L8 presence discipline).
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.SharedPlan

  @a "+12025550201"
  @b "+12025550202"
  @c "+12025550203"

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
        "idempotency_key" => "dir1-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp conversation_row(token, conversation_id) do
    body = get_json(token, "/api/v1/product/conversations")
    Enum.find(body["conversations"], &(&1["id"] == conversation_id))
  end

  defp thread_next_plan(token, conversation_id) do
    body = get_json(token, "/api/v1/product/conversations/#{conversation_id}/messages")
    body["next_plan"]
  end

  defp alignment_next_plan(token, conversation_id) do
    body = get_json(token, "/api/v1/product/conversations/#{conversation_id}/alignment")
    body["next_plan"]
  end

  defp call_row_for_peer(token, peer_id) do
    body = get_json(token, "/api/v1/product/calls")
    Enum.find(body["calls"], &(&1["peer_user_id"] == peer_id))
  end

  test "FR-18-DIR1-01: one plan fact reads back in chats list, thread, and call log" do
    {token_a, user_a} = activate(@a, "Dir1 A", "dir1_a")
    {token_b, user_b} = activate(@b, "Dir1 B", "dir1_b")
    {_token_c, user_c} = activate(@c, "Dir1 C", "dir1_c")

    conv_ab = direct(token_a, user_b)
    assert is_binary(conv_ab)

    # No plan yet: the fact is absent (null) on all three contracts.
    assert conversation_row(token_a, conv_ab)["next_plan"] == nil
    assert thread_next_plan(token_a, conv_ab) == nil
    assert alignment_next_plan(token_a, conv_ab) == nil

    # A real call A -> B so the call log has a row for the peer.
    call_body =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/calls", %{"conversation_id" => conv_ab})
      |> json_response(201)

    assert is_binary(call_body["call"]["id"])
    assert call_row_for_peer(token_a, user_b)["next_plan"] == nil

    # Create the plan through the real conversation flow.
    plan =
      create_plan(token_a, conv_ab, %{
        "title" => "Dinner at Juniper",
        "place" => "Juniper and Ivy",
        "location" => "Juniper and Ivy",
        "time_label" => "Saturday 7:30 PM"
      })

    assert plan["status"] == "tentative"

    # (i) Chats list contract.
    row_a = conversation_row(token_a, conv_ab)
    fact_a = row_a["next_plan"]
    assert fact_a["plan_id"] == plan["id"]
    assert fact_a["title"] == "Dinner at Juniper"
    assert fact_a["when_label"] == "Saturday 7:30 PM"
    assert fact_a["where_label"] == "Juniper and Ivy"
    assert fact_a["status"] == "tentative"
    # The lead has answered; the plan is still taking shape for them.
    assert fact_a["state"] == "forming"
    # Entity tint rides the row's peers, stable per person.
    peer_b = Enum.find(row_a["peers"], &(&1["id"] == user_b))
    assert peer_b["entity_tint"] in 1..6
    assert row_a["entity_tint"] == peer_b["entity_tint"]

    # The other party sees the SAME plan; for the invited viewer the
    # governed state is action (it needs their answer).
    row_b = conversation_row(token_b, conv_ab)
    assert row_b["next_plan"]["plan_id"] == plan["id"]
    assert row_b["next_plan"]["state"] == "action"

    # (ii) Thread contract - messages and alignment carry the same fact.
    thread_fact = thread_next_plan(token_a, conv_ab)
    assert thread_fact["plan_id"] == plan["id"]
    assert thread_fact["when_label"] == fact_a["when_label"]
    assert thread_fact["where_label"] == fact_a["where_label"]
    assert alignment_next_plan(token_a, conv_ab)["plan_id"] == plan["id"]

    # (iii) Call-log contract - per peer, both directions.
    call_a = call_row_for_peer(token_a, user_b)
    assert call_a["next_plan"]["plan_id"] == plan["id"]
    assert call_a["next_plan"]["title"] == "Dinner at Juniper"
    assert call_a["peer_tint"] == peer_b["entity_tint"]
    call_b = call_row_for_peer(token_b, user_a)
    assert call_b["next_plan"]["plan_id"] == plan["id"]

    # Group leg: a group conversation's plan surfaces on the group row.
    group_body =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/group", %{
        "member_user_ids" => [user_b, user_c],
        "label" => "Dir1 group"
      })
      |> json_response(201)

    group_id = group_body["conversation_id"]

    group_plan =
      create_plan(token_a, group_id, %{
        "title" => "Group hike",
        "place" => "Torrey Pines",
        "location" => "Torrey Pines",
        "time_label" => "Sunday 9:00 AM"
      })

    group_row = conversation_row(token_a, group_id)
    assert group_row["next_plan"]["plan_id"] == group_plan["id"]
    # The dyad row still carries its own plan - exactly one per row.
    assert conversation_row(token_a, conv_ab)["next_plan"]["plan_id"] == plan["id"]
    # A group member reads the group plan in the group thread too.
    assert thread_next_plan(token_b, group_id)["plan_id"] == group_plan["id"]
  end

  test "FR-18-DIR1-02: scope, cancellation, and past plans exit on all three contracts" do
    {token_a, user_a} = activate(@a, "Dir1 A2", "dir1_a2")
    {token_b, user_b} = activate(@b, "Dir1 B2", "dir1_b2")
    {_token_c, user_c} = activate(@c, "Dir1 C2", "dir1_c2")

    conv_ab = direct(token_a, user_b)
    conv_ac = direct(token_a, user_c)

    # A call A -> B so B exists in A's call log and A in B's.
    build_conn()
    |> auth(token_a)
    |> post("/api/v1/product/calls", %{"conversation_id" => conv_ab})
    |> json_response(201)

    # A plan with C only.
    plan_ac =
      create_plan(token_a, conv_ac, %{
        "title" => "Coffee with C",
        "place" => "Bird Rock Coffee",
        "location" => "Bird Rock Coffee",
        "time_label" => "Friday 8:00 AM"
      })

    # It surfaces in the A-C row, and ONLY there.
    assert conversation_row(token_a, conv_ac)["next_plan"]["plan_id"] == plan_ac["id"]
    assert conversation_row(token_a, conv_ab)["next_plan"] == nil
    assert thread_next_plan(token_a, conv_ab) == nil
    # Not in the A<->B call log, for either viewer.
    assert call_row_for_peer(token_a, user_b)["next_plan"] == nil
    assert call_row_for_peer(token_b, user_a)["next_plan"] == nil
    # B is not a party at all: no conversation, nothing leaks.
    assert conversation_row(token_b, conv_ac) == nil

    # Cancellation through the real cancel route exits the fact.
    plan_ab =
      create_plan(token_a, conv_ab, %{
        "title" => "Soon cancelled",
        "place" => "Fort Oak",
        "location" => "Fort Oak",
        "time_label" => "Thursday 6:00 PM"
      })

    assert conversation_row(token_a, conv_ab)["next_plan"]["plan_id"] == plan_ab["id"]

    build_conn()
    |> auth(token_a)
    |> post("/api/v1/product/opal/plans/#{plan_ab["id"]}/cancel", %{})
    |> json_response(200)

    assert conversation_row(token_a, conv_ab)["next_plan"] == nil
    assert thread_next_plan(token_a, conv_ab) == nil
    assert alignment_next_plan(token_a, conv_ab) == nil
    assert call_row_for_peer(token_a, user_b)["next_plan"] == nil

    # A plan whose time has passed exits too (L8): move its instant
    # into the past on the row - the read path must stop surfacing it.
    past =
      create_plan(token_a, conv_ab, %{
        "title" => "Already passed",
        "place" => "Fort Oak",
        "location" => "Fort Oak",
        "time_label" => "Yesterday 6:00 PM"
      })

    assert conversation_row(token_a, conv_ab)["next_plan"]["plan_id"] == past["id"]

    Repo.get!(SharedPlan, past["id"])
    |> SharedPlan.changeset(%{
      start_at: DateTime.utc_now() |> DateTime.add(-2 * 24 * 3600, :second) |> DateTime.truncate(:microsecond)
    })
    |> Repo.update!()

    assert conversation_row(token_a, conv_ab)["next_plan"] == nil
    assert thread_next_plan(token_a, conv_ab) == nil
    assert call_row_for_peer(token_a, user_b)["next_plan"] == nil
  end
end
