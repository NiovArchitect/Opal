defmodule OpalCoreWeb.PolishIncallNextPlanTest do
  @moduledoc """
  Repair #19 polish, Cluster F (P10a): the LIVE call projection
  (POST /calls and GET /calls/:id) carries the call's
  plan-in-context - the ONE DIR-1 NextPlan fact for the call's
  conversation - or null when there is no shared upcoming plan.
  The connected surface renders it verbatim.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @a "+12025550401"
  @b "+12025550402"

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
        "idempotency_key" => "polish-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp direct(token, peer_id) do
    body =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => peer_id})
      |> json_response(201)

    body["conversation_id"]
  end

  test "live call projection carries the shared upcoming plan, and null without one" do
    {token_a, user_a} = activate(@a, "Polish A", "polish_a")
    {token_b, user_b} = activate(@b, "Polish B", "polish_b")
    _ = user_a
    conv = direct(token_a, user_b)

    # A call with no shared plan: next_plan is present and null.
    call1 =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/calls", %{"conversation_id" => conv})
      |> json_response(201)

    assert Map.has_key?(call1["call"], "next_plan")
    assert call1["call"]["next_plan"] == nil

    # Create the shared upcoming plan in that conversation.
    plan =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conv}/plans", %{
        "title" => "Dinner at Juniper",
        "place" => "Juniper and Ivy",
        "location" => "Juniper and Ivy",
        "time_label" => "Saturday 7:30 PM"
      })
      |> json_response(201)

    plan_id = plan["plan"]["id"]

    # The SAME live call now projects the plan on GET /calls/:id,
    # for both participants, from the one derivation.
    for token <- [token_a, token_b] do
      body =
        build_conn()
        |> auth(token)
        |> get("/api/v1/product/calls/#{call1["call"]["id"]}")
        |> json_response(200)

      assert body["call"]["next_plan"]["plan_id"] == plan_id
      assert body["call"]["next_plan"]["title"] == "Dinner at Juniper"
      assert body["call"]["next_plan"]["when_label"] == "Saturday 7:30 PM"
    end
  end
end
