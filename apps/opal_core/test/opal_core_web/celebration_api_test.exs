defmodule OpalCoreWeb.CelebrationApiTest do
  use OpalCoreWeb.ConnCase

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
        "idempotency_key" => "p10a-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "CRUD + validation + foreign 404", %{conn: conn} do
    {tok_a, _user_a} = activate(conn, @alex, "P10A A", "p10a_a")
    {tok_b, _user_b} = activate(build_conn(), @jordan, "P10A B", "p10a_b")

    # empty list
    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/celebrations")
    assert json_response(conn, 200)["celebrations"] == []

    # create
    conn =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/celebrations", %{
        "person_name" => "Maya",
        "kind" => "birthday",
        "month" => 6,
        "day" => 15
      })

    body = json_response(conn, 201)
    id = body["celebration"]["id"]
    assert body["celebration"]["person_name"] == "Maya"
    assert body["celebration"]["kind"] == "birthday"
    assert body["celebration"]["date_label"] == "Jun 15"
    assert is_nil(body["celebration"]["year"])

    # list
    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/celebrations")
    assert length(json_response(conn, 200)["celebrations"]) == 1

    # Feb 30 → 422
    conn =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/celebrations", %{
        "person_name" => "Bad",
        "kind" => "birthday",
        "month" => 2,
        "day" => 30
      })

    assert json_response(conn, 422)["error_code"] == "invalid"

    # foreign delete → 404
    conn = build_conn() |> auth(tok_b) |> delete("/api/v1/product/celebrations/#{id}")
    assert json_response(conn, 404)["error_code"] == "not_found"

    # owner delete
    conn = build_conn() |> auth(tok_a) |> delete("/api/v1/product/celebrations/#{id}")
    assert json_response(conn, 200)["deleted"] == true

    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/celebrations")
    assert json_response(conn, 200)["celebrations"] == []
  end
end
