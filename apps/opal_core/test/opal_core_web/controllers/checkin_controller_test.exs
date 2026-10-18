defmodule OpalCoreWeb.CheckinControllerTest do
  @moduledoc """
  Repair #18 B3 - the check-in sweep over the real product HTTP path:
  synthetic-activated sessions (the same activation the regression
  harness uses), session-scoped authorship, cross-account isolation,
  and the quiet-window contract. Context-level depth lives in
  checkin_test.exs / checkin_suggestion_test.exs.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @phones %{
    org: "+12025550101",
    m1: "+12025550102",
    m2: "+12025550103",
    m3: "+12025550104",
    outsider: "+12025550105"
  }

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

    sessions =
      Map.new(@phones, fn {role, phone} ->
        {token, user_id} = activate(phone, "B3 #{role}", "b3_#{role}")
        {role, %{token: token, user_id: user_id}}
      end)

    {:ok, sessions: sessions}
  end

  defp activate(phone, name, handle) do
    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "b3-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(build_conn(), "/api/v1/product/activation/verify", %{
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

  defp auth(session), do: put_req_header(build_conn(), "authorization", "Bearer #{session.token}")

  # ConnTest verbs are macros, so dispatch is by literal clause, not apply/3.
  defp call(session, :get, path) do
    conn = session |> auth() |> get(path)
    {conn.status, json_response(conn, conn.status)}
  end

  defp call(session, :post, path), do: call(session, :post, path, %{})

  defp call(session, :post, path, params) do
    conn = session |> auth() |> post(path, params)
    {conn.status, json_response(conn, conn.status)}
  end

  defp call(session, :put, path, params) do
    conn = session |> auth() |> put(path, params)
    {conn.status, json_response(conn, conn.status)}
  end

  defp setup_family_circle(sessions) do
    org = sessions.org

    for role <- [:m1, :m2, :m3] do
      {status, _} =
        call(org, :put, "/api/v1/product/relationships/#{sessions[role].user_id}", %{
          "type" => "family"
        })

      assert status == 200
    end

    {status, body} =
      call(org, :post, "/api/v1/product/checkins", %{
        "source_kind" => "relationship_set",
        "source_filter" => %{"type" => "family"},
        "prompt_theme" => "with the power out",
        "idempotency_key" => "b3-http-#{System.unique_integer([:positive])}"
      })

    assert status == 201
    body["checkin"]["sweep"]["id"]
  end

  test "full sweep over HTTP: create, member views, answers, rollup, close, quiet window", %{
    sessions: sessions
  } do
    sweep_id = setup_family_circle(sessions)
    org = sessions.org

    {200, summary} = call(org, :get, "/api/v1/product/checkins/#{sweep_id}")
    assert summary["checkin"]["counts"]["asked_total"] == 3
    assert summary["checkin"]["counts"]["still_waiting"] == 3
    assert summary["view"] == "organizer"

    # Member view: own ask only, verbatim consent copy, no rollup.
    {200, view} = call(sessions.m1, :get, "/api/v1/product/checkins/#{sweep_id}")
    assert view["view"] == "member"
    assert view["checkin"]["ask"]["body"] =~ "go only to"
    assert view["checkin"]["ask"]["theme_line"] == "They said: with the power out"
    refute Map.has_key?(view["checkin"], "members")

    # Outsider: existence does not leak.
    {404, _} = call(sessions.outsider, :get, "/api/v1/product/checkins/#{sweep_id}")

    {404, _} =
      call(sessions.outsider, :post, "/api/v1/product/checkins/#{sweep_id}/respond", %{
        "okay" => "ok"
      })

    # Answers roll up; spoofed author field is ignored.
    {200, _} =
      call(sessions.m1, :post, "/api/v1/product/checkins/#{sweep_id}/respond", %{
        "okay" => "ok",
        "where_text" => "home",
        "member_user_id" => sessions.m2.user_id
      })

    {200, summary} = call(org, :get, "/api/v1/product/checkins/#{sweep_id}")
    rows = Map.new(summary["checkin"]["members"], &{&1["user_id"], &1})
    assert rows[sessions.m1.user_id]["where_text"] == "home"
    assert rows[sessions.m2.user_id]["response_status"] == "asked"
    assert summary["checkin"]["counts"]["still_waiting"] == 2

    {200, _} =
      call(sessions.m2, :post, "/api/v1/product/checkins/#{sweep_id}/respond", %{
        "decline" => true
      })

    # Close, then: late answer refused with the named reason, and the
    # quiet window blocks an immediate re-sweep with the contract
    # field the client renders as a disabled action.
    {200, _} = call(org, :post, "/api/v1/product/checkins/#{sweep_id}/close")

    {422, late} =
      call(sessions.m3, :post, "/api/v1/product/checkins/#{sweep_id}/respond", %{"okay" => "ok"})

    assert late["reason"] == "sweep_closed"

    {422, too_soon} =
      call(org, :post, "/api/v1/product/checkins", %{
        "source_kind" => "relationship_set",
        "source_filter" => %{"type" => "family"},
        "idempotency_key" => "b3-http-second-#{System.unique_integer([:positive])}"
      })

    assert too_soon["reason"] == "sweep_quiet_window"
    assert is_binary(too_soon["next_sweep_allowed_at"])

    {200, fs} =
      call(org, :get, "/api/v1/product/checkins/for-source?source_kind=relationship_set")

    assert fs["checkin"]["sweep"]["id"] == sweep_id
    assert fs["suggestion"] == nil
  end

  test "invalid input is a 422 that stores nothing", %{sessions: sessions} do
    org = sessions.org

    {422, _} =
      call(org, :post, "/api/v1/product/checkins", %{
        "source_kind" => "conversation",
        "source_ref_id" => "not-a-uuid",
        "idempotency_key" => "b3-bad-#{System.unique_integer([:positive])}"
      })

    {422, _} =
      call(org, :post, "/api/v1/product/checkins", %{
        "source_kind" => "relationship_set",
        "source_filter" => %{"type" => "family"}
      })

    {200, fs} =
      call(org, :get, "/api/v1/product/checkins/for-source?source_kind=relationship_set")

    assert fs["checkin"] == nil
  end

  test "a member cannot close another organizer's sweep; organizer close is session-scoped", %{
    sessions: sessions
  } do
    sweep_id = setup_family_circle(sessions)

    {404, _} = call(sessions.m1, :post, "/api/v1/product/checkins/#{sweep_id}/close")
    {200, summary} = call(sessions.org, :get, "/api/v1/product/checkins/#{sweep_id}")
    assert summary["checkin"]["sweep"]["status"] == "open"
  end
end
