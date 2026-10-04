defmodule OpalCoreWeb.DeviceTokenApiTest do
  @moduledoc "Phase 2A — POST/DELETE /api/v1/product/devices/tokens"
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Push.DeviceToken
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider

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
        "idempotency_key" => "push-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "POST upserts token; DELETE soft-disables (row remains)", %{conn: conn} do
    {token, user_id} = activate(conn, @alex, "Push Walk", "push_walk_a")
    device_token = "api-token-ios-#{System.unique_integer([:positive])}"

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/devices/tokens", %{
        "platform" => "ios",
        "token" => device_token,
        "env" => "sandbox"
      })

    body = json_response(conn, 200)
    assert body["token"]["user_id"] == user_id
    assert body["token"]["platform"] == "ios"
    assert body["token"]["token"] == device_token
    assert body["token"]["active"] == true
    assert is_nil(body["token"]["disabled_at"])

    conn =
      build_conn()
      |> auth(token)
      |> delete("/api/v1/product/devices/tokens", %{"token" => device_token})

    body = json_response(conn, 200)
    assert body["token"]["active"] == false
    assert is_binary(body["token"]["disabled_at"])

    row = Repo.get_by(DeviceToken, token: device_token)
    assert row
    assert row.disabled_at
  end

  test "POST without auth is rejected", %{conn: conn} do
    conn =
      post(conn, "/api/v1/product/devices/tokens", %{
        "platform" => "ios",
        "token" => "noauth-token-12345678",
        "env" => "sandbox"
      })

    assert conn.status in [401, 403]
  end
end
