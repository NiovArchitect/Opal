defmodule OpalCoreWeb.Tranche2SessionProviderHonestyTest do
  @moduledoc """
  Tranche #2 — GET /session must report live phone-verify mode, not a hardcoded synthetic label.
  """
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)

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
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "t2-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    %{"challenge" => %{"id" => challenge_id}, "development_code" => code} =
      json_response(conn, 201)

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
    body["session"]["access_token"]
  end

  test "session show reports production_sms when mode is production_sms", %{conn: conn} do
    token = activate(conn, "+12025550101", "T2 Honesty", "t2_honesty")

    Application.put_env(:opal_core, :phone_verify_mode, :production_sms)
    assert Provider.production_mode?()

    conn =
      build_conn()
      |> put_req_header("authorization", "Bearer #{token}")
      |> get("/api/v1/product/session")

    body = json_response(conn, 200)
    assert body["provider"] == "production_sms"
    assert body["not_production_sms"] == false
  end

  test "session show reports synthetic_development in synthetic mode", %{conn: conn} do
    token = activate(conn, "+12025550102", "T2 Synth", "t2_synth")
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    conn =
      build_conn()
      |> put_req_header("authorization", "Bearer #{token}")
      |> get("/api/v1/product/session")

    body = json_response(conn, 200)
    assert body["provider"] == "synthetic_development"
    assert body["not_production_sms"] == true
  end
end
