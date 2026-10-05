defmodule OpalCoreWeb.TrustApiTest do
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
        "idempotency_key" => "ru2-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "GET returns tier info; POST grants inner_circle after progression", %{conn: conn} do
    {tok, user_id} = activate(conn, @alex, "RU2 A", "ru2_a")

    conn = build_conn() |> auth(tok) |> get("/api/v1/product/trust/tier")
    body = json_response(conn, 200)
    assert body["tier"] in ~w(new known trusted inner_circle)
    assert is_list(body["can_access"])
    assert "basic" in body["can_access"]
    assert is_binary(body["friendly_name"])

    # Cannot grant inner_circle from new
    conn =
      build_conn()
      |> auth(tok)
      |> post("/api/v1/product/trust/tier/grant", %{"tier" => "inner_circle"})

    assert json_response(conn, 422)["error_code"] in ["cannot_skip", "invalid"]

    # Progress to trusted then grant
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "trusted", "system")

    conn =
      build_conn()
      |> auth(tok)
      |> post("/api/v1/product/trust/tier/grant", %{"tier" => "inner_circle"})

    granted = json_response(conn, 200)
    assert granted["tier"] == "inner_circle"
    assert granted["info"]["tier"] == "inner_circle"

    # Reject non-inner_circle grant via API
    conn =
      build_conn()
      |> auth(tok)
      |> post("/api/v1/product/trust/tier/grant", %{"tier" => "trusted"})

    assert json_response(conn, 422)["error_code"] == "invalid"
  end
end
