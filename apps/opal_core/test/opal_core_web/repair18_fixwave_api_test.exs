defmodule OpalCoreWeb.Repair18FixwaveApiTest do
  @moduledoc """
  Repair #18 fix wave — HTTP-level proofs:

  * RF-1 (FR-12-11): GET /plans/:id/execution serves a Center-born,
    conversation-less plan (200) instead of 500ing in
    Messages.member_user_ids/1; a non-participant still gets 403.
  * HTTP cancel route: POST /opal/plans/:id/cancel — lead/co_lead
    authority (creator fallback), participant 403, non-participant
    404, gate state legality (already-cancelled 409, terminal 422),
    and identical read-back on the plans list for both parties.
  """

  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SharedPlan

  @product "/api/v1/product"

  defp activate(name) do
    uniq = rem(System.unique_integer([:positive]), 9000) + 1000
    phone = "+1202555#{uniq}"
    handle = "fw#{uniq}"

    challenge =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> post("#{@product}/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "fw-ch-#{System.unique_integer([:positive])}"
      })

    assert challenge.status == 201
    challenge_body = json_body(challenge)

    verify =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> post("#{@product}/activation/verify", %{
        "challenge_id" => challenge_body["challenge"]["id"],
        "code" => challenge_body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    assert verify.status == 200
    body = json_body(verify)
    %{token: body["session"]["access_token"], user_id: body["user"]["id"]}
  end

  defp authed(token) do
    build_conn()
    |> put_req_header("content-type", "application/json")
    |> put_req_header("authorization", "Bearer #{token}")
  end

  defp json_body(conn), do: Jason.decode!(conn.resp_body)

  defp create_center_plan(token, attrs) do
    conn = authed(token) |> post("#{@product}/opal/plans", attrs)
    assert conn.status in [200, 201]
    json_body(conn)["plan"]
  end

  defp dinner_plan(a, b) do
    direct =
      authed(a.token)
      |> post("#{@product}/conversations/direct", %{"peer_user_id" => b.user_id})

    assert direct.status in [200, 201]
    conv_id = json_body(direct)["conversation_id"]
    assert is_binary(conv_id)

    for {who, body} <- [
          {a, "Let's do dinner at Juniper and Ivy on Saturday at 7:30 PM"},
          {b, "Sounds good, 7:30 PM works for me"}
        ] do
      sent =
        authed(who.token)
        |> post("#{@product}/conversations/#{conv_id}/messages", %{"body" => body})

      assert sent.status == 201
    end

    _ = authed(a.token) |> get("#{@product}/conversations/#{conv_id}/alignment")

    plans = json_body(authed(a.token) |> get("#{@product}/opal/plans"))["plans"]

    plan =
      Enum.find(plans, fn p ->
        p["conversation_id"] == conv_id and String.contains?(p["time_label"] || "", "7:30")
      end)

    assert plan,
           "setup dinner plan must exist; got #{inspect(Enum.map(plans, & &1["time_label"]))}"

    {conv_id, plan}
  end

  # --- RF-1 -----------------------------------------------------------------

  test "RF-1: execution projection serves a Center-born conversation-less plan" do
    a = activate("Fixwave One")

    plan =
      create_center_plan(a.token, %{
        "title" => "Dinner Saturday",
        "time_label" => "Saturday 7 PM",
        "location" => "Juniper and Ivy"
      })

    assert plan["conversation_id"] == nil

    conn = authed(a.token) |> get("#{@product}/plans/#{plan["id"]}/execution")
    assert conn.status == 200
    body = json_body(conn)
    assert body["plan_id"] == plan["id"]
    assert is_binary(body["status"])

    stranger = activate("Fixwave Stranger")
    denied = authed(stranger.token) |> get("#{@product}/plans/#{plan["id"]}/execution")
    assert denied.status == 403

    missing = authed(a.token) |> get("#{@product}/plans/#{Ecto.UUID.generate()}/execution")
    assert missing.status == 404
  end

  # --- Cancel route -----------------------------------------------------------

  test "cancel: the lead cancels a thread plan and every list reads it back cancelled" do
    a = activate("Fixwave Lead")
    b = activate("Fixwave Partner")
    {_conv_id, plan} = dinner_plan(a, b)

    conn = authed(a.token) |> post("#{@product}/opal/plans/#{plan["id"]}/cancel", %{})
    assert conn.status == 200
    body = json_body(conn)
    assert body["ok"] == true
    assert body["plan"]["id"] == plan["id"]
    assert body["plan"]["status"] == "cancelled"

    # One row, landed once.
    row = Repo.get!(SharedPlan, plan["id"])
    assert row.status == "cancelled"
    assert row.cancelled_at != nil

    # Read-back: the default lists drop it for BOTH parties; the
    # status=all read shows the same cancelled row to both.
    for who <- [a, b] do
      active = json_body(authed(who.token) |> get("#{@product}/opal/plans"))["plans"]
      refute Enum.any?(active, &(&1["id"] == plan["id"]))

      all = json_body(authed(who.token) |> get("#{@product}/opal/plans?status=all"))["plans"]
      found = Enum.find(all, &(&1["id"] == plan["id"]))
      assert found && found["status"] == "cancelled"
    end
  end

  test "cancel: a participant without lead rights gets an honest 403 and the plan survives" do
    a = activate("Fixwave Lead2")
    b = activate("Fixwave Partner2")
    {_conv_id, plan} = dinner_plan(a, b)

    conn = authed(b.token) |> post("#{@product}/opal/plans/#{plan["id"]}/cancel", %{})
    assert conn.status == 403
    assert json_body(conn)["error_code"] == "not_authorized"

    row = Repo.get!(SharedPlan, plan["id"])
    assert row.status != "cancelled"
  end

  test "cancel: a non-participant gets 404 (existence never revealed)" do
    a = activate("Fixwave Lead3")
    b = activate("Fixwave Partner3")
    {_conv_id, plan} = dinner_plan(a, b)

    stranger = activate("Fixwave Outsider")
    conn = authed(stranger.token) |> post("#{@product}/opal/plans/#{plan["id"]}/cancel", %{})
    assert conn.status == 404

    missing =
      authed(a.token) |> post("#{@product}/opal/plans/#{Ecto.UUID.generate()}/cancel", %{})

    assert missing.status == 404
  end

  test "cancel: state legality — already cancelled reads 409, a completed plan reads 422" do
    a = activate("Fixwave Lead4")
    b = activate("Fixwave Partner4")
    {_conv_id, plan} = dinner_plan(a, b)

    first = authed(a.token) |> post("#{@product}/opal/plans/#{plan["id"]}/cancel", %{})
    assert first.status == 200

    second = authed(a.token) |> post("#{@product}/opal/plans/#{plan["id"]}/cancel", %{})
    assert second.status == 409
    assert json_body(second)["error_code"] == "already_cancelled"

    done_plan =
      create_center_plan(a.token, %{
        "title" => "Finished thing",
        "time_label" => "Yesterday 6 PM"
      })

    Repo.get!(SharedPlan, done_plan["id"])
    |> SharedPlan.changeset(%{status: "completed"})
    |> Repo.update!()

    refused = authed(a.token) |> post("#{@product}/opal/plans/#{done_plan["id"]}/cancel", %{})
    assert refused.status == 422
    assert json_body(refused)["error_code"] == "illegal_transition"
    assert Repo.get!(SharedPlan, done_plan["id"]).status == "completed"
  end

  test "cancel: a conversation-less Center plan cancels through the creator fallback" do
    a = activate("Fixwave Solo")

    plan =
      create_center_plan(a.token, %{
        "title" => "Solo plan",
        "time_label" => "Sunday 10 AM",
        "location" => "The Henry"
      })

    assert plan["conversation_id"] == nil

    conn = authed(a.token) |> post("#{@product}/opal/plans/#{plan["id"]}/cancel", %{})
    assert conn.status == 200
    assert json_body(conn)["plan"]["status"] == "cancelled"
    assert Repo.get!(SharedPlan, plan["id"]).status == "cancelled"
  end
end
