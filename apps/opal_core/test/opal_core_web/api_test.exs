defmodule OpalCoreWeb.ApiTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.AI.TestClient

  setup %{conn: conn} do
    FixturesHelper.seed!()
    TestClient.reset()

    conn =
      conn
      |> put_req_header("content-type", "application/json")
      |> put_req_header("x-opal-dev-user-id", Fixtures.user_alex_id())

    {:ok, conn: conn}
  end

  test "health", %{conn: conn} do
    conn = get(conn, "/health")
    assert json_response(conn, 200)["status"] == "ok"
  end

  test "message create and ai job round trip", %{conn: conn} do
    conn =
      post(conn, "/api/v1/messages", %{
        "conversation_id" => Fixtures.conv_alex_jordan_id(),
        "client_message_id" => "api-msg-1",
        "message_type" => "text",
        "body" => "api hello"
      })

    body = json_response(conn, 201)
    message_id = body["message"]["id"]
    assert body["message"]["server_seq"] == 1

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> put_req_header("x-opal-dev-user-id", Fixtures.user_alex_id())
      |> post("/api/v1/messages/#{message_id}/ai-jobs", %{
        "capability" => "ai_echo",
        "consent_proof_id" => Fixtures.consent_alex_jordan_granted_id(),
        "idempotency_key" => "api-idem-1",
        "trace_id" => "trace-api-000000000001"
      })

    job_body = json_response(conn, 202)
    assert job_body["job"]["status"] == "completed"
    job_id = job_body["job"]["id"]

    conn =
      build_conn()
      |> put_req_header("x-opal-dev-user-id", Fixtures.user_alex_id())
      |> get("/api/v1/ai-jobs/#{job_id}")

    assert json_response(conn, 200)["job"]["id"] == job_id
  end

  test "jordan cannot read alex job", %{conn: conn} do
    conn =
      post(conn, "/api/v1/messages", %{
        "conversation_id" => Fixtures.conv_alex_jordan_id(),
        "client_message_id" => "api-msg-2",
        "body" => "private"
      })

    message_id = json_response(conn, 201)["message"]["id"]

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> put_req_header("x-opal-dev-user-id", Fixtures.user_alex_id())
      |> post("/api/v1/messages/#{message_id}/ai-jobs", %{
        "capability" => "ai_echo",
        "consent_proof_id" => Fixtures.consent_alex_jordan_granted_id(),
        "idempotency_key" => "api-idem-2",
        "trace_id" => "trace-api-000000000002"
      })

    job_id = json_response(conn, 202)["job"]["id"]

    conn =
      build_conn()
      |> put_req_header("x-opal-dev-user-id", Fixtures.user_jordan_id())
      |> get("/api/v1/ai-jobs/#{job_id}")

    assert json_response(conn, 404)
  end
end
