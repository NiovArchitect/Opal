defmodule OpalCoreWeb.ArtifactApiTest do
  @moduledoc "Paste G Phase 9 — product + share routes."
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.Trips

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
        "idempotency_key" => "art-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "POST artifacts → preview card; GET share HTML", %{conn: conn} do
    {token, user_id} = activate(conn, @alex, "Art A", "art_walk_a")

    assert {:ok, trip} =
             Trips.create_trip(user_id, %{
               title: "CDMX long weekend",
               destination_label: "Mexico City",
               starts_on: ~D[2026-12-01],
               ends_on: ~D[2026-12-04]
             })

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/artifacts", %{
        "kind" => "trip_itinerary",
        "plan_id" => trip.id
      })

    body = json_response(conn, 201)
    assert body["title"] == "CDMX long weekend"
    assert body["preview_card"]["footer"] == "Made with Opal"
    assert is_binary(body["share_url"])

    token_path = body["share_url"] |> URI.parse() |> Map.get(:path)
    share_token = token_path |> Path.basename()

    conn = get(build_conn(), "/share/artifacts/#{share_token}")
    assert response(conn, 200) =~ "CDMX long weekend"
    assert response(conn, 200) =~ "Mexico City"
    assert response(conn, 200) =~ "Made with Opal"
    assert get_resp_header(conn, "x-robots-tag") == ["noindex, nofollow"]
  end
end
