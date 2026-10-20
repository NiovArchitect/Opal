defmodule OpalCoreWeb.PlaceCoordinatesWriterApiTest do
  @moduledoc """
  Founder Polish Wave, Cluster G2 - the place-coordinates writer at
  the real HTTP layer (the BS-06 writer gap).

  Pins: creating a plan from a chosen candidate through the real
  API paths (conversation create, Center create, graph create)
  persists place_lat/place_lon and the plan contract in the
  response - and on read-back - carries them; creating without a
  candidate leaves them null; an invalid pair is a 422 and writes
  nothing; the PATCH edit path moves the pair with the place (set
  with a pair, clear without one, refuse a lone coordinate).

  Auth/setup pattern follows graph_create_repair16_api_test.exs.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SharedPlan

  @place_lat 32.7231
  @place_lon -117.1683

  setup do
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

  defp activate(conn, name, handle) do
    uniq = rem(System.unique_integer([:positive]), 9000) + 1000
    phone = "+1202555#{uniq}"

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "g2-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => "#{handle}#{uniq}",
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  # Loaded row values can surface as Decimal or plain float
  # depending on the decode path; both read as floats here.
  defp as_float(%Decimal{} = value), do: Decimal.to_float(value)
  defp as_float(value) when is_number(value), do: value * 1.0
  defp as_float(_), do: nil

  defp list_plans(conn, token) do
    conn
    |> auth(token)
    |> get("/api/v1/product/opal/plans")
    |> json_response(200)
    |> Map.get("plans")
  end

  test "conversation create with a candidate pair: 201 contract + row + read-back carry the coords",
       %{conn: conn} do
    {tok_a, user_a} = activate(conn, "G2 Alice", "g2_alice")
    {_tok_b, user_b} = activate(build_conn(), "G2 Bob", "g2_bob")

    {:ok, %{conversation_id: conversation_id}} =
      Messages.ensure_direct_conversation(user_a, user_b)

    created =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", %{
        "title" => "Dinner at Juniper & Ivy",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday 7 PM",
        "place_lat" => @place_lat,
        "place_lon" => @place_lon
      })
      |> json_response(201)

    plan = created["plan"]
    assert plan["place_lat"] == @place_lat
    assert plan["place_lon"] == @place_lon

    row = Repo.get!(SharedPlan, plan["id"])
    assert as_float(row.place_lat) == @place_lat
    assert as_float(row.place_lon) == @place_lon

    read_back = Enum.find(list_plans(build_conn(), tok_a), &(&1["id"] == plan["id"]))
    assert read_back["place_lat"] == @place_lat
    assert read_back["place_lon"] == @place_lon
  end

  test "conversation create without a candidate: coords null; invalid pair is 422 and writes nothing",
       %{conn: conn} do
    {tok_a, user_a} = activate(conn, "G2 Carol", "g2_carol")
    {_tok_b, user_b} = activate(build_conn(), "G2 Dan", "g2_dan")

    {:ok, %{conversation_id: conversation_id}} =
      Messages.ensure_direct_conversation(user_a, user_b)

    created =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", %{
        "title" => "Dinner somewhere",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday 7 PM"
      })
      |> json_response(201)

    assert created["plan"]["place_lat"] == nil
    assert created["plan"]["place_lon"] == nil

    before = Repo.aggregate(SharedPlan, :count)

    resp =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", %{
        "title" => "Dinner at Juniper & Ivy",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday 7 PM",
        "place_lat" => 91.0,
        "place_lon" => @place_lon
      })

    assert json_response(resp, 422)["error_code"] == "invalid_place_coordinates"
    assert Repo.aggregate(SharedPlan, :count) == before
  end

  test "center create + graph create carry the pair; PATCH moves it with the place", %{conn: conn} do
    {tok_a, _user_a} = activate(conn, "G2 Erin", "g2_erin")

    center =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/opal/plans", %{
        "title" => "Center dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday 7 PM",
        "place_lat" => @place_lat,
        "place_lon" => @place_lon
      })
      |> json_response(201)

    assert center["plan"]["place_lat"] == @place_lat
    assert center["plan"]["place_lon"] == @place_lon
    plan_id = center["plan"]["id"]

    graph =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/opal/plans/graph-create", %{
        "title" => "Graph dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday 8 PM",
        "place_lat" => @place_lat,
        "place_lon" => @place_lon
      })
      |> json_response(201)

    assert graph["plan"]["place_lat"] == @place_lat
    assert graph["plan"]["place_lon"] == @place_lon

    # PATCH: move the place WITH the new candidate's pair.
    moved =
      build_conn()
      |> auth(tok_a)
      |> patch("/api/v1/product/opal/plans/#{plan_id}", %{
        "location" => "Harbor Table",
        "place_lat" => 32.7157,
        "place_lon" => -117.1611
      })
      |> json_response(200)

    assert moved["plan"]["place_lat"] == 32.7157
    assert moved["plan"]["place_lon"] == -117.1611

    # PATCH: move the place WITHOUT a pair - the old pair clears.
    cleared =
      build_conn()
      |> auth(tok_a)
      |> patch("/api/v1/product/opal/plans/#{plan_id}", %{"location" => "Campfire"})
      |> json_response(200)

    assert cleared["plan"]["place_lat"] == nil
    assert cleared["plan"]["place_lon"] == nil

    # PATCH: a lone coordinate is a 422 field error; nothing changes.
    resp =
      build_conn()
      |> auth(tok_a)
      |> patch("/api/v1/product/opal/plans/#{plan_id}", %{"place_lat" => 32.7})

    body = json_response(resp, 422)
    assert body["errors"]["place_lat"] != nil

    row = Repo.get!(SharedPlan, plan_id)
    assert row.location == "Campfire"
    assert row.place_lat == nil
    assert row.place_lon == nil
  end
end
