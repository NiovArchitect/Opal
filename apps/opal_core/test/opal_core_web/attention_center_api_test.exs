defmodule OpalCoreWeb.AttentionCenterApiTest do
  @moduledoc "Track A6.1 — GET /api/v1/product/attention + ingest/resolve/seen."
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"
  @jordan "+12025550102"

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

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "ac-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
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
    {body["session"]["access_token"], body["user"]["id"], body}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "ATTENTION_CENTER_API — ingest proposal, badge 1 for responder, 0 for proposer", %{
    conn: conn
  } do
    {token_a, user_a, _} = activate(conn, @alex, "Walk A", "ac_walk_a")
    {token_b, user_b, _} = activate(build_conn(), @jordan, "Walk B", "ac_walk_b")

    event = %{
      "source_type" => "proposal",
      "source_id" => "p-8pm-api",
      "proposal_key" => "8pm-api",
      "conversation_id" => "conv-fort-oak-api",
      "title" => "Fort Oak",
      "proposer_user_id" => user_a,
      "required_responder_ids" => [user_b],
      "participants" => [user_a, user_b],
      "waiting_on_display" => "Walk B",
      "copy" => "8:00 PM instead?"
    }

    # Ingest as Walk A (proposer) — still routes correctly via AA
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/attention/ingest", %{"event" => event})

    body_a = json_response(conn, 200)
    assert body_a["actionable_count"] == 0
    assert body_a["needs_you"] == []
    assert length(body_a["waiting"]) >= 1

    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/attention")

    body_b = json_response(conn, 200)
    assert body_b["actionable_count"] == 1
    assert length(body_b["needs_you"]) == 1
    row = hd(body_b["needs_you"])
    assert row["title"] == "Fort Oak"
    assert row["deep_link"]["kind"] == "proposal"
    assert row["deep_link"]["focus"] == "change_proposal"

    # Resolve
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/attention/resolve", %{"id" => row["id"]})

    resolved = json_response(conn, 200)
    assert resolved["actionable_count"] == 0
    assert resolved["needs_you"] == []

    # Relaunch truth: GET again
    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/attention")

    relaunch = json_response(conn, 200)
    assert relaunch["actionable_count"] == 0
  end

  test "GET attention requires auth", %{conn: conn} do
    conn = get(conn, "/api/v1/product/attention")
    assert json_response(conn, 401)["error_code"] == "auth_required"
  end
end
