defmodule OpalCoreWeb.TripCurateApiTest do
  @moduledoc "Phase 4G — trip destination curation API."
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.Trips.DestinationPacks

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
        "idempotency_key" => "tcurate-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp create_trip(token, attrs) do
    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/trips", attrs)

    json_response(conn, 201)["trip"]
  end

  test "Joshua Tree returns 7 suggestions across lodging/activity/meal", %{conn: conn} do
    {token_a, _user_a} = activate(conn, @alex, "Curate A", "tcurate_a")

    trip =
      create_trip(token_a, %{
        "title" => "Desert weekend",
        "destination_label" => "Joshua Tree"
      })

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip["id"]}/curate")

    body = json_response(conn, 200)
    assert body["destination"] == "Joshua Tree"
    assert body["commits_legs"] == false
    suggestions = body["suggestions"]
    assert length(suggestions) == 7

    by_type = Enum.group_by(suggestions, & &1["leg_type"])
    assert length(by_type["lodging"]) == 2
    assert length(by_type["activity"]) == 3
    assert length(by_type["meal"]) == 2

    Enum.each(suggestions, fn s ->
      assert is_binary(s["name"]) and s["name"] != ""
      assert is_binary(s["description"]) and s["description"] != ""
      assert s["leg_type"] in ~w(lodging activity meal)
      # Never San Diego outing fixtures
      refute s["name"] in ["Juniper & Ivy", "Campfire", "Neon Bar", "Harbor Table"]
    end)
  end

  test "each curated destination returns a pack (no San Diego fallback)", %{conn: conn} do
    {token_a, _} = activate(conn, @alex, "Curate Packs", "tcurate_packs")

    for label <- DestinationPacks.labels() do
      trip =
        create_trip(token_a, %{
          "title" => "#{label} trip",
          "destination_label" => label
        })

      conn =
        build_conn()
        |> auth(token_a)
        |> post("/api/v1/product/trips/#{trip["id"]}/curate")

      body = json_response(conn, 200)
      assert body["destination"] == label
      assert length(body["suggestions"]) == 7
      refute Enum.any?(body["suggestions"], &(&1["name"] == "Campfire"))
    end
  end

  test "unknown destination → 404 no_curated_destination (not San Diego)", %{conn: conn} do
    {token_a, _} = activate(conn, @alex, "Curate Miss", "tcurate_miss")

    trip =
      create_trip(token_a, %{
        "title" => "Unknown dest",
        "destination_label" => "Reykjavik"
      })

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip["id"]}/curate")

    body = json_response(conn, 404)
    assert body["error_code"] == "no_curated_destination"
    assert body["error"] == "no_curated_destination"
    assert body["destination"] == "Reykjavik"
    refute Map.has_key?(body, "suggestions")
  end

  test "non-participant → 404", %{conn: conn} do
    {token_a, _} = activate(conn, @alex, "Curate Owner", "tcurate_owner")
    {token_b, _} = activate(build_conn(), @jordan, "Curate Stranger", "tcurate_stranger")

    trip =
      create_trip(token_a, %{
        "title" => "Private scout",
        "destination_label" => "Palm Springs"
      })

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/trips/#{trip["id"]}/curate")

    assert json_response(conn, 404)["error_code"] == "not_found"
  end

  test "Italian durable preference ranks Italian meal first (5C taste)", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "Italian Taste", "tcurate_italian")

    assert {:ok, _mem, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => "italian",
               "polarity" => "prefer",
               "weight_class" => "explicit"
             })

    trip =
      create_trip(token_a, %{
        "title" => "Palm Springs food",
        "destination_label" => "Palm Springs"
      })

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip["id"]}/curate")

    body = json_response(conn, 200)
    meals = Enum.filter(body["suggestions"], &(&1["leg_type"] == "meal"))
    assert length(meals) == 2
    # Birba is the Italian entry; Cheeky's is american brunch
    assert hd(meals)["name"] == "Birba"
    assert hd(meals)["cuisine"] == "italian"
  end
end
