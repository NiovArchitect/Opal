defmodule OpalCoreWeb.FinancialApiTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.TrustTiers

  @alex "+12025550101"

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
        "idempotency_key" => "ru3-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "PUT returns 403 for known-tier user", %{conn: conn} do
    {tok, user_id} = activate(conn, @alex, "RU3 A", "ru3_a")
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "known", "system")

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/financial/profile", %{"comfort_level" => "moderate"})

    assert json_response(conn, 403)["error_code"] == "forbidden"
  end

  test "PUT/GET/DELETE profile for trusted user", %{conn: conn} do
    {tok, user_id} = activate(conn, @alex, "RU3 B", "ru3_b")
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "trusted", "system")

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/financial/profile", %{
        "comfort_level" => "budget",
        "dining_range" => %{"min" => 10, "max" => 25},
        "notes" => "saving for wedding"
      })

    body = json_response(conn, 200)
    assert body["profile"]["comfort_level"] == "budget"
    assert body["profile"]["dining_range"]["max"] == 25
    assert body["profile"]["notes"] == "saving for wedding"

    conn = build_conn() |> auth(tok) |> get("/api/v1/product/financial/profile")
    got = json_response(conn, 200)
    assert got["profile"]["comfort_level"] == "budget"

    conn = build_conn() |> auth(tok) |> delete("/api/v1/product/financial/profile")
    assert json_response(conn, 200)["deleted"] == true

    conn = build_conn() |> auth(tok) |> get("/api/v1/product/financial/profile")
    assert json_response(conn, 404)["error_code"] == "not_found"
  end

  test "PUT validates comfort_level", %{conn: conn} do
    {tok, user_id} = activate(conn, @alex, "RU3 C", "ru3_c")
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "trusted", "system")

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/financial/profile", %{"comfort_level" => "nope"})

    assert json_response(conn, 422)["error_code"] == "invalid"
  end
end
