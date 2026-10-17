defmodule OpalCoreWeb.Repair17W4ApiTest do
  @moduledoc """
  Repair #17 (W4) — HTTP surface for items 6/7: Opal chat sessions API and
  the Center now-strip data path (live plans, not sample fixtures).
  """

  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.SharedPlan

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
        "idempotency_key" => "r17w4-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    assert Provider.synthetic_mode?()
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "sessions: list/new/switch/clear over HTTP, cross-account 404", %{conn: conn} do
    {tok_a, _a} = activate(conn, "+12025550171", "R17 A", "r17w4_a")
    {tok_b, _b} = activate(build_conn(), "+12025550172", "R17 B", "r17w4_b")

    conn =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/opal/conversation/messages", %{
        "body" => "Plan dinner with Maya Friday"
      })

    assert json_response(conn, 201)

    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/opal/conversation")
    first_id = json_response(conn, 200)["conversation"]["id"]

    # New chat: fresh session, prior retained.
    conn = build_conn() |> auth(tok_a) |> post("/api/v1/product/opal/conversation/new", %{})
    new_body = json_response(conn, 200)
    fresh_id = new_body["conversation"]["id"]
    assert fresh_id != first_id
    assert new_body["conversation"]["messages"] == []

    # List: both sessions, active first.
    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/opal/conversations")
    sessions = json_response(conn, 200)["conversations"]
    assert length(sessions) == 2
    assert hd(sessions)["id"] == fresh_id
    assert Enum.find(sessions, &(&1["id"] == first_id))["message_count"] >= 2

    # Session rows carry a last-message preview so untitled sessions can be
    # labeled by their own content (Repair #17 integration contract). The
    # latest message in the first session is Opal's reply to the dinner
    # request; the fresh session has no messages and a nil preview.
    assert Enum.find(sessions, &(&1["id"] == first_id))["last_message_preview"] =~
             "dinner Friday with Maya"

    assert Enum.find(sessions, &(&1["id"] == fresh_id))["last_message_preview"] == nil

    # The other account lists only its own (none yet) and cannot switch to
    # or clear A's session.
    conn = build_conn() |> auth(tok_b) |> get("/api/v1/product/opal/conversations")
    assert json_response(conn, 200)["conversations"] == []

    conn =
      build_conn()
      |> auth(tok_b)
      |> post("/api/v1/product/opal/conversations/#{first_id}/switch", %{})

    assert json_response(conn, 404)

    conn =
      build_conn()
      |> auth(tok_b)
      |> post("/api/v1/product/opal/conversation/clear", %{"conversation_id" => first_id})

    assert json_response(conn, 404)

    # Switch back to the first session: its messages are still there.
    conn =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/opal/conversations/#{first_id}/switch", %{})

    switched = json_response(conn, 200)["conversation"]
    assert switched["id"] == first_id
    assert length(switched["messages"]) >= 2

    # Clear that session for real.
    conn =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/opal/conversation/clear", %{"conversation_id" => first_id})

    cleared = json_response(conn, 200)
    assert cleared["deleted_messages"] >= 2

    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/opal/conversation")
    assert json_response(conn, 200)["conversation"]["messages"] == []
  end

  test "calendar/today serves live plan events without a linked calendar", %{conn: conn} do
    {tok_a, user_a} = activate(conn, "+12025550173", "R17 C", "r17w4_c")

    # Empty state is honest: no events, source none.
    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/calendar/today")
    empty = json_response(conn, 200)
    assert empty["events"] == []
    assert empty["source"] == "none"

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_center(user_a, %{
        "title" => "Juniper and Ivy",
        "place" => "Oceanside",
        "time_label" => "Sat 7:30 PM"
      })

    now = DateTime.utc_now() |> DateTime.truncate(:second)
    start = DateTime.add(now, 2 * 3600, :second)

    plan
    |> SharedPlan.changeset(%{
      "start_at" => start,
      "end_at" => DateTime.add(start, 3600, :second)
    })
    |> Repo.update!()

    {:ok, _} =
      OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(Repo.get!(SharedPlan, plan.id))

    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/calendar/today")
    body = json_response(conn, 200)
    assert body["source"] == "plans"
    assert [%{"title" => "Juniper and Ivy", "source" => "plan"}] = body["events"]
    refute Enum.any?(body["events"], fn e -> e["title"] in ["Appointment", "Dinner"] end)
  end
end
