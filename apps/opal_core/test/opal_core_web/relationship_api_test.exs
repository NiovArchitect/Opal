defmodule OpalCoreWeb.RelationshipApiTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"
  @jordan_phone "+12025550102"

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
        "idempotency_key" => "ru1-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "GET returns list; PUT sets type; invalid type → 422", %{conn: conn} do
    {tok, _user_id} = activate(conn, @alex, "RU1 A", "ru1_a")
    jordan_id = Fixtures.user_jordan_id()

    # GET empty-ish
    conn = build_conn() |> auth(tok) |> get("/api/v1/product/relationships")
    body = json_response(conn, 200)
    assert is_list(body["relationships"])
    assert is_list(body["contacts"])
    assert body["allowed_types"] == ~w(spouse partner family close_friend friend business acquaintance)

    # PUT valid
    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{
        "type" => "close_friend",
        "bounds" => %{"frequency" => "weekly", "style" => "casual", "planning" => "spontaneous"}
      })

    put_body = json_response(conn, 200)
    assert put_body["relationship"]["type"] == "close_friend"
    assert put_body["relationship"]["contact_user_id"] == jordan_id
    assert put_body["relationship"]["communication_bounds"]["frequency"] == "weekly"

    # GET confirms
    conn = build_conn() |> auth(tok) |> get("/api/v1/product/relationships")
    body2 = json_response(conn, 200)
    assert Enum.any?(body2["relationships"], &(&1["type"] == "close_friend"))

    # PUT invalid type → 422
    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{"type" => "nemesis"})

    err = json_response(conn, 422)
    assert err["error_code"] == "invalid"
  end

  test "PUT upserts without duplicating", %{conn: conn} do
    {tok, _} = activate(conn, @alex, "RU1 B", "ru1_b")
    jordan_id = Fixtures.user_jordan_id()

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{"type" => "friend"})

    id1 = json_response(conn, 200)["relationship"]["id"]

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{"type" => "business"})

    body = json_response(conn, 200)
    assert body["relationship"]["id"] == id1
    assert body["relationship"]["type"] == "business"
  end

  # silence unused
  test "jordan fixture phone is available" do
    assert is_binary(@jordan_phone)
  end
end
