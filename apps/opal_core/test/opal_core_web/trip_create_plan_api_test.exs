defmodule OpalCoreWeb.TripCreatePlanApiTest do
  @moduledoc "Phase 4E — trip leg → SharedPlan creation + accept-going."
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips.TripLeg

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
        "idempotency_key" => "p4e-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "create-plan from leg → 201, fields, pending participants, leg linked; re-create → 200; stranger 404; accept-going",
       %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "P4E A", "p4e_walk_a")
    {token_b, user_b} = activate(build_conn(), @jordan, "P4E B", "p4e_walk_b")
    {token_s, _user_s} = activate(build_conn(), @stranger, "P4E S", "p4e_stranger")

    # CREATE TRIP with B as participant
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips", %{
        "title" => "Weekend in Big Sur",
        "destination_label" => "Big Sur",
        "user_ids" => [user_b]
      })

    trip_id = json_response(conn, 201)["trip"]["id"]

    # ADD LEG — dinner Friday with dates
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs", %{
        "leg_type" => "meal",
        "place_label" => "Dinner Friday",
        "starts_on" => "2026-11-14",
        "ends_on" => "2026-11-14"
      })

    leg = json_response(conn, 201)["leg"]
    leg_id = leg["id"]
    assert is_nil(leg["shared_plan_id"])

    # CREATE-PLAN → 201
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{leg_id}/create-plan")

    body = json_response(conn, 201)
    plan = body["plan"]
    assert plan["title"] == "Dinner Friday"
    assert plan["location"] == "Dinner Friday"
    assert plan["status"] == "tentative"
    assert plan["source"] == "trip_leg"
    assert plan["trip_leg_id"] == leg_id
    assert is_nil(plan["conversation_id"])
    assert plan["created_by_user_id"] == user_a
    assert plan["timezone"] == "UTC"
    assert is_binary(plan["start_at"])
    assert is_binary(plan["end_at"])
    assert String.starts_with?(plan["start_at"], "2026-11-14")

    participants = body["participants"]
    assert length(participants) == 2

    for p <- participants do
      assert p["role"] == "participant"
      assert p["response_state"] == "pending"
      assert p["user_id"] in [user_a, user_b]
    end

    assert body["leg"]["shared_plan_id"] == plan["id"]
    assert Repo.get!(TripLeg, leg_id).shared_plan_id == plan["id"]

    db_plan = Repo.get!(SharedPlan, plan["id"])
    assert is_nil(db_plan.conversation_id)
    assert db_plan.source == "trip_leg"
    assert db_plan.status == "tentative"

    plan_id = plan["id"]

    # IDEMPOTENT re-create → 200, same plan, no duplicate
    before_count = Repo.aggregate(SharedPlan, :count)

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{leg_id}/create-plan")

    body2 = json_response(conn, 200)
    assert body2["plan"]["id"] == plan_id
    assert Repo.aggregate(SharedPlan, :count) == before_count

    # NON-PARTICIPANT → 404
    conn =
      build_conn()
      |> auth(token_s)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{leg_id}/create-plan")

    assert json_response(conn, 404)["error_code"] == "not_found"

    # ACCEPT-GOING on trip-created plan (conversation_id nil)
    assert {:ok, going} = JourneyAuthority.accept_going(plan_id, user_a)
    assert going["response_state"] == "accepted"
    assert going["current_user_accepted"] == true
    assert is_nil(going["conversation_id"])

    pp_a = Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: user_a)
    assert pp_a.response_state == "accepted"

    pp_b = Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: user_b)
    assert pp_b.response_state == "pending"

    # B can also accept-going
    assert {:ok, going_b} = JourneyAuthority.accept_going(plan_id, user_b)
    assert going_b["response_state"] == "accepted"

    # HTTP accept-going path
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/journeys/#{plan_id}/accept-going")

    # Already accepted — still 200
    assert json_response(conn, 200)["response_state"] == "accepted"
  end

  test "create-plan leaves null dates null (never invent)", %{conn: conn} do
    {token_a, _user_a} = activate(conn, @alex, "P4E Null", "p4e_null_a")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips", %{"title" => "Open-ended"})

    trip_id = json_response(conn, 201)["trip"]["id"]

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs", %{
        "leg_type" => "activity",
        "place_label" => "Somewhere eventually"
      })

    leg_id = json_response(conn, 201)["leg"]["id"]

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{leg_id}/create-plan")

    plan = json_response(conn, 201)["plan"]
    assert is_nil(plan["start_at"])
    assert is_nil(plan["end_at"])
    assert plan["status"] == "tentative"
    assert is_nil(plan["conversation_id"])
  end
end
