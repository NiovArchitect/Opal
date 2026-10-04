defmodule OpalCoreWeb.ActivationPhoneE164Test do
  @moduledoc """
  Auth fix: FE posts phone_e164; challenge must accept it without 500.
  Also preserves phone / identifier_raw and returns clean 422 when none given.
  """
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper

  @walk_b "+12025550102"

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp challenge_body(extra) do
    Map.merge(
      %{
        "otp_consent_accepted" => true,
        "device_label" => "auth-phone-e164-web",
        "idempotency_key" => "auth-e164-#{System.unique_integer([:positive])}"
      },
      extra
    )
  end

  test "phone_e164 only → challenge starts (no 500)", %{conn: conn} do
    conn =
      post(conn, "/api/v1/product/activation/challenges", challenge_body(%{"phone_e164" => @walk_b}))

    body = json_response(conn, 201)
    assert is_binary(get_in(body, ["challenge", "id"]))
    assert body["provider"] == "synthetic_development"
    refute body["error_code"]
  end

  test "phone only → still works (backward compat)", %{conn: conn} do
    conn =
      post(conn, "/api/v1/product/activation/challenges", challenge_body(%{"phone" => @walk_b}))

    body = json_response(conn, 201)
    assert is_binary(get_in(body, ["challenge", "id"]))
  end

  test "identifier_raw only → still works", %{conn: conn} do
    conn =
      post(
        conn,
        "/api/v1/product/activation/challenges",
        challenge_body(%{"identifier_raw" => @walk_b})
      )

    body = json_response(conn, 201)
    assert is_binary(get_in(body, ["challenge", "id"]))
  end

  test "nil identifier (no phone keys) → clean 422, not 500", %{conn: conn} do
    conn = post(conn, "/api/v1/product/activation/challenges", challenge_body(%{}))

    body = json_response(conn, 422)
    assert body["error_code"] == "invalid_identifier"
    assert body["message"]
    refute conn.status == 500
  end
end
