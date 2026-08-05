defmodule OpalCoreWeb.OpportunityApiTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.{Fixtures, FixturesHelper, Repo}
  alias OpalCore.Auth.ProductSession
  alias OpalCore.SocialFlow.DeviceSession
  alias OpalCore.SocialFlow.DynamicIntelligence.Fixtures, as: DsiFixtures

  setup %{conn: conn} do
    FixturesHelper.seed!()

    token_a = issue_token!(Fixtures.user_alex_id(), "alex-web")
    token_t = issue_token!(Fixtures.user_taylor_id(), "taylor-web")

    conn =
      conn
      |> put_req_header("content-type", "application/json")
      |> put_req_header("authorization", "Bearer #{token_a}")

    {:ok,
     conn: conn,
     conv: DsiFixtures.conversation_id_for_durable(),
     token_a: token_a,
     token_t: token_t}
  end

  defp issue_token!(user_id, label) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    n = System.unique_integer([:positive])

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user_id,
        device_label: label,
        platform: "web",
        status: "active",
        session_ref: "ref-#{n}",
        refresh_family: "rf-#{n}",
        idempotency_key: "idem-ds-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end

  defp auth(conn, token) do
    conn
    |> put_req_header("content-type", "application/json")
    |> put_req_header("authorization", "Bearer #{token}")
  end

  test "evaluate, show, participate, correct, outsider denied", %{
    conn: conn,
    conv: conv,
    token_a: token_a,
    token_t: token_t
  } do
    conn =
      post(conn, "/api/v1/product/conversations/#{conv}/opportunity/evaluate", %{
        "use_dinner_fixture" => true,
        "member_ids" => DsiFixtures.member_ids(),
        "idempotency_key" => "api-phase2-1"
      })

    body = json_response(conn, 201)
    assert body["origin"] == "created"
    assert body["opportunity"]["primary_option"] == "Quiet bistro fixture"
    assert body["opportunity"]["not_a_chat_participant"] == true
    refute Jason.encode!(body) =~ "budget too high"

    conn =
      build_conn()
      |> auth(token_a)
      |> get("/api/v1/product/conversations/#{conv}/opportunity")

    shown = json_response(conn, 200)
    assert shown["opportunity"]["opportunity_id"] == body["opportunity"]["opportunity_id"]

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conv}/opportunity/participation", %{
        "action" => "interested"
      })

    part = json_response(conn, 200)
    assert part["opportunity"]["private_participation"]["state"] == "interested"

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conv}/opportunity/correction", %{
        "text" => "Not with this group."
      })

    corr = json_response(conn, 200)
    assert corr["correction"]["kind"] == "suppress_group_context"
    assert corr["opportunity"]["quiet"] == true

    conn =
      build_conn()
      |> auth(token_t)
      |> get("/api/v1/product/conversations/#{conv}/opportunity")

    assert json_response(conn, 403)["error"]["code"] == "not_a_member"
  end

  test "quiet ordinary conversation evaluate returns quiet", %{conn: conn, conv: conv} do
    conn =
      post(conn, "/api/v1/product/conversations/#{conv}/opportunity/evaluate", %{
        "use_dinner_fixture" => false,
        "member_ids" => DsiFixtures.member_ids(),
        "messages" => DsiFixtures.quiet_ordinary_messages(),
        "participants" => DsiFixtures.participants(),
        "venues" => DsiFixtures.venues(),
        "time_window" => DsiFixtures.time_window(),
        "idempotency_key" => "api-quiet-1"
      })

    body = json_response(conn, 200)
    assert body["opportunity"]["quiet"] == true
  end
end
