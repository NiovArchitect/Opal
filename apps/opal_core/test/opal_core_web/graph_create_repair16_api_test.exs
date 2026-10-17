defmodule OpalCoreWeb.GraphCreateRepair16ApiTest do
  @moduledoc """
  Repair #16 W1 — HTTP layer for durable GraphCreateFlow completion.

  Real authed requests against POST /api/v1/product/opal/plans/graph-create
  and the owner-scoped GET /api/v1/product/opal/plans read-back:
  create persists, owner reads back, the other account never sees it,
  replay with the same idempotency key dedupes, repeating another
  account's plan is forbidden, wider audiences are rejected.
  """
  use OpalCoreWeb.ConnCase, async: false

  setup do
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

  defp activate(conn, name, handle) do
    uniq = rem(System.unique_integer([:positive]), 9000) + 1000
    phone = "+1202555#{uniq}"

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "r16-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => "#{handle}#{uniq}",
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp graph_create(conn, token, attrs) do
    conn
    |> auth(token)
    |> post("/api/v1/product/opal/plans/graph-create", attrs)
  end

  defp list_plans(conn, token) do
    conn
    |> auth(token)
    |> get("/api/v1/product/opal/plans")
    |> json_response(200)
    |> Map.get("plans")
  end

  test "graph-create persists over HTTP and reads back owner-only", %{conn: conn} do
    {tok_a, _user_a} = activate(conn, "R16 Alice", "r16_alice")
    {tok_b, _user_b} = activate(build_conn(), "R16 Bob", "r16_bob")

    created =
      graph_create(build_conn(), tok_a, %{
        "title" => "Alice trail morning",
        "location" => "Fletcher Cove",
        "time_label" => "Sunday - around 8:00 AM",
        "caption" => "Bring coffee.",
        "audience" => "close_circle",
        "entry" => "graphs_plus",
        "idempotency_key" => "r16-api-#{System.unique_integer([:positive])}"
      })
      |> json_response(201)

    plan = created["plan"]
    assert plan["title"] == "Alice trail morning"
    assert plan["caption"] == "Bring coffee."
    assert plan["audience"] == "close_circle"
    assert created["deduplicated"] == false

    # Owner read-back through the list endpoint (fresh request).
    owner_plans = list_plans(build_conn(), tok_a)
    assert Enum.any?(owner_plans, &(&1["id"] == plan["id"]))

    # The other account's list never contains it.
    other_plans = list_plans(build_conn(), tok_b)
    refute Enum.any?(other_plans, &(&1["id"] == plan["id"]))
  end

  test "replay with the same idempotency key dedupes over HTTP", %{conn: conn} do
    {tok_a, _} = activate(conn, "R16 Replay", "r16_replay")
    key = "r16-api-idem-#{System.unique_integer([:positive])}"
    attrs = %{"title" => "Replayed plan", "idempotency_key" => key, "entry" => "chat_plan"}

    first = graph_create(build_conn(), tok_a, attrs) |> json_response(201)
    second = graph_create(build_conn(), tok_a, attrs) |> json_response(201)

    assert first["plan"]["id"] == second["plan"]["id"]
    assert first["deduplicated"] == false
    assert second["deduplicated"] == true

    plans = list_plans(build_conn(), tok_a)
    assert Enum.count(plans, &(&1["title"] == "Replayed plan")) == 1
  end

  test "repeating another account's plan is 403; wider audience is 422; nothing persists", %{
    conn: conn
  } do
    {tok_a, _} = activate(conn, "R16 Owner", "r16_owner")
    {tok_b, _} = activate(build_conn(), "R16 Outsider", "r16_outsider")

    created =
      graph_create(build_conn(), tok_a, %{"title" => "Owner only plan"})
      |> json_response(201)

    plan_id = created["plan"]["id"]

    resp =
      graph_create(build_conn(), tok_b, %{
        "title" => "Copy attempt",
        "source_plan_id" => plan_id,
        "entry" => "repeat"
      })

    assert json_response(resp, 403)["error_code"] == "forbidden"

    resp =
      graph_create(build_conn(), tok_b, %{"title" => "Wide", "audience" => "friends"})

    assert json_response(resp, 422)["error_code"] == "unsupported_audience"

    # Outsider persisted nothing through either attempt.
    assert list_plans(build_conn(), tok_b) == []
  end

  test "unauthenticated graph-create is rejected", %{conn: conn} do
    resp = post(conn, "/api/v1/product/opal/plans/graph-create", %{"title" => "No auth"})
    assert resp.status in [401, 403]
  end
end
