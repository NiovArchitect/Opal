defmodule OpalCoreWeb.ConversationCreatePlanApiTest do
  @moduledoc "Phase 11A — POST /conversations/:id/plans creates tentative SharedPlan."
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  @alex "+12025550101"
  @jordan "+12025550102"
  @stranger "+12025550199"

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
        "idempotency_key" => "p11a-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "POST plans → 201 tentative + participants; stranger 404; missing title 422; no taste invent",
       %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "P11A A", "p11a_walk_a")
    {_token_b, user_b} = activate(build_conn(), @jordan, "P11A B", "p11a_walk_b")
    {token_s, _user_s} = activate(build_conn(), @stranger, "P11A S", "p11a_stranger")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})

    direct_body = json_response(conn, 201)
    conversation_id = direct_body["conversation_id"] || get_in(direct_body, ["conversation", "id"])
    assert is_binary(conversation_id)

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", %{
        "title" => "Fort Oak",
        "place" => "Fort Oak",
        "location" => "Fort Oak",
        "area" => "North Park",
        "time_label" => "Friday evening"
      })

    body = json_response(conn, 201)
    plan = body["plan"]
    assert plan["title"] == "Fort Oak"
    assert plan["location"] == "Fort Oak"
    assert plan["status"] == "tentative"
    assert plan["source"] == "conversation"
    assert plan["conversation_id"] == conversation_id
    assert plan["created_by_user_id"] == user_a
    assert is_nil(plan["trip_leg_id"])
    assert body["message"] =~ "Plan created"

    participants = body["participants"]
    assert length(participants) == 2

    by_user = Map.new(participants, &{&1["user_id"], &1})
    assert by_user[user_a]["role"] == "lead"
    assert by_user[user_a]["response_state"] == "accepted"
    assert by_user[user_a]["authority_source"] == "plan_this"
    assert by_user[user_b]["role"] == "participant"
    assert by_user[user_b]["response_state"] == "pending"

    db = Repo.get!(SharedPlan, plan["id"])
    assert db.status == "tentative"
    assert db.source == "conversation"
    assert db.alignment["area"] == "North Park"
    refute Map.has_key?(db.alignment || %{}, "cuisine")
    refute Map.has_key?(db.alignment || %{}, "vibe")

    # Non-member → 404
    conn =
      build_conn()
      |> auth(token_s)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", %{
        "title" => "Nope"
      })

    assert json_response(conn, 404)["error_code"] == "not_found"

    # Missing title → 422
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", %{
        "area" => "Somewhere"
      })

    assert json_response(conn, 422)["error_code"] == "invalid_title"

    # Place-name-only body still creates; no cuisine invented
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", %{
        "place" => "Juniper & Ivy"
      })

    body2 = json_response(conn, 201)
    assert body2["plan"]["title"] == "Juniper & Ivy"
    assert body2["plan"]["status"] == "tentative"
    db2 = Repo.get!(SharedPlan, body2["plan"]["id"])
    refute Map.has_key?(db2.alignment || %{}, "cuisine")

    pp_a = Repo.get_by!(PlanParticipant, plan_id: plan["id"], user_id: user_a)
    assert pp_a.response_state == "accepted"
    assert pp_a.authority_source == "plan_this"
  end
end
