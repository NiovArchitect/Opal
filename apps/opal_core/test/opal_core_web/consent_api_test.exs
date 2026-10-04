defmodule OpalCoreWeb.ConsentApiTest do
  @moduledoc "Phase 1D — consent HTTP API list/grant/revoke + auth scoping."
  use OpalCoreWeb.ConnCase

  alias OpalCore.Consent
  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"
  @jordan "+12025550102"

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
        "idempotency_key" => "consent-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp future_expires do
    DateTime.utc_now()
    |> DateTime.add(90 * 24 * 3600, :second)
    |> DateTime.truncate(:microsecond)
    |> DateTime.to_iso8601()
  end

  test "list / grant / revoke + product capability surface", %{conn: conn} do
    {token_a, _user_a} = activate(conn, @alex, "Consent A", "consent_a")

    # LIST empty
    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/consents")
    assert json_response(conn, 200)["consents"] == []

    # GRANT calls_outbound
    expires = future_expires()

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/consents", %{
        "capability" => "calls_outbound",
        "expires_at" => expires
      })

    body = json_response(conn, 201)
    proof_id = body["consent"]["id"]
    assert body["consent"]["capability"] == "calls_outbound"
    assert body["consent"]["status"] == "granted"
    assert is_binary(body["consent"]["granted_at"])
    assert is_binary(body["consent"]["expires_at"])
    assert is_nil(body["consent"]["revoked_at"])

    # LIST shows it
    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/consents")
    list = json_response(conn, 200)["consents"]
    assert Enum.any?(list, &(&1["id"] == proof_id))

    # REVOKE
    conn = build_conn() |> auth(token_a) |> delete("/api/v1/product/consents/#{proof_id}")
    revoked = json_response(conn, 200)["consent"]
    assert revoked["status"] == "revoked"
    assert is_binary(revoked["revoked_at"])

    # Product label mapping accepted
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/consents", %{
        "capability" => "bookings:reserve",
        "expires_at" => future_expires()
      })

    assert json_response(conn, 201)["consent"]["capability"] == "bookings_reserve"
  end

  test "422 on bad capability and missing expires_at", %{conn: conn} do
    {token_a, _} = activate(conn, @alex, "Consent Bad", "consent_bad")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/consents", %{
        "capability" => "ai_echo",
        "expires_at" => future_expires()
      })

    assert json_response(conn, 422)["error_code"] == "invalid_capability"

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/consents", %{
        "capability" => "telepathy",
        "expires_at" => future_expires()
      })

    assert json_response(conn, 422)["error_code"] == "invalid_capability"

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/consents", %{"capability" => "calls_outbound"})

    assert json_response(conn, 422)["error_code"] == "expires_at_required"
  end

  test "404 on foreign proof revoke — no leak", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "Consent Own", "consent_own")
    {token_b, _} = activate(build_conn(), @jordan, "Consent Other", "consent_other")

    expires =
      DateTime.utc_now() |> DateTime.add(3600, :second) |> DateTime.truncate(:microsecond)

    {:ok, proof} = Consent.grant(user_a, "calls_outbound", expires_at: expires)

    conn =
      build_conn()
      |> auth(token_b)
      |> delete("/api/v1/product/consents/#{proof.id}")

    assert json_response(conn, 404)["error_code"] == "not_found"

    # Owner still sees active grant
    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/consents")
    assert Enum.any?(json_response(conn, 200)["consents"], &(&1["id"] == proof.id))
  end

  test "messaging_business grantable via API; execution remains ABSENT", %{conn: conn} do
    {token_a, _} = activate(conn, @alex, "Consent Msg", "consent_msg")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/consents", %{
        "capability" => "messaging_business",
        "expires_at" => future_expires()
      })

    assert json_response(conn, 201)["consent"]["capability"] == "messaging_business"
    assert Consent.execution_status("messaging_business") == :absent
  end
end
