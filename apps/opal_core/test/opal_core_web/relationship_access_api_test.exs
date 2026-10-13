defmodule OpalCoreWeb.RelationshipAccessApiTest do
  @moduledoc "Relationship Access Model HTTP API — standing Graphing + use≠disclose."
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
        "idempotency_key" => "ra-ch-#{handle}-#{System.unique_integer([:positive])}"
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
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "graphing policy get/patch + decide respects pause", %{conn: conn} do
    {token_a, _a} = activate(conn, @alex, "RA A", "ra_a")
    {_token_b, jordan} = activate(conn, @jordan, "RA B", "ra_b")

    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/relationship-access/graphing")
    assert json_response(conn, 200)["graphing"]["call_mode"] in ~w(never ask_each auto_eligible selected_only)

    conn =
      build_conn()
      |> auth(token_a)
      |> patch("/api/v1/product/relationship-access/graphing", %{
        "call_mode" => "auto_eligible",
        "global_paused" => false
      })

    assert json_response(conn, 200)["graphing"]["call_mode"] == "auto_eligible"

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/relationship-access/grants", %{
        "scope_kind" => "contact",
        "contact_user_id" => jordan,
        "data_category" => "call_signals",
        "access_level" => "observe",
        "action_ceiling" => "suggest",
        "visibility" => "self_only"
      })

    assert json_response(conn, 201)["grant"]["data_category"] == "call_signals"

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/relationship-access/graphing/decide", %{
        "channel" => "call",
        "contact_user_id" => jordan
      })

    body = json_response(conn, 200)
    assert body["allowed"] == true
    assert body["understanding_candidates_active"] == false

    _ =
      build_conn()
      |> auth(token_a)
      |> patch("/api/v1/product/relationship-access/graphing", %{"global_paused" => true})

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/relationship-access/graphing/decide", %{
        "channel" => "call",
        "contact_user_id" => jordan
      })

    body = json_response(conn, 200)
    assert body["allowed"] == false
    assert body["reason"] == "global_paused"
  end

  test "authorize separates use from disclose", %{conn: conn} do
    {token_a, _a} = activate(conn, @alex, "RA Use", "ra_use")
    {_token_b, jordan} = activate(conn, @jordan, "RA Peer", "ra_peer")

    _ =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/relationship-access/grants", %{
        "scope_kind" => "contact",
        "contact_user_id" => jordan,
        "data_category" => "financial_context",
        "access_level" => "use",
        "action_ceiling" => "suggest",
        "visibility" => "self_only"
      })

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/relationship-access/authorize", %{
        "data_category" => "financial_context",
        "action_ceiling" => "suggest",
        "contact_user_id" => jordan,
        "disclose" => false
      })

    body = json_response(conn, 200)
    assert body["allowed"] == true
    assert body["may_use"] == true
    assert body["may_disclose"] == false

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/relationship-access/authorize", %{
        "data_category" => "financial_context",
        "action_ceiling" => "suggest",
        "contact_user_id" => jordan,
        "disclose" => true
      })

    body = json_response(conn, 200)
    assert body["allowed"] == false
    assert body["may_disclose"] == false
  end

  test "template diff never auto-applies", %{conn: conn} do
    {token_a, _a} = activate(conn, @alex, "RA Diff", "ra_diff")
    {_token_b, jordan} = activate(conn, @jordan, "RA DiffB", "ra_diff_b")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/relationship-access/templates/diff", %{
        "contact_user_id" => jordan,
        "relationship_type" => "partner"
      })

    body = json_response(conn, 200)
    assert body["auto_applied"] == false
    assert body["requires_user_accept"] == true
  end
end
