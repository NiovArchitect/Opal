defmodule OpalCoreWeb.TripApiTest do
  @moduledoc "Phase 4C — trip HTTP API CRUD, auth scoping, legs, link-plan."
  use OpalCoreWeb.ConnCase

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.SharedPlan

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
        "idempotency_key" => "trip-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "full CRUD + auth scoping + leg reorder + link-plan", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "Trip A", "trip_walk_a")
    {token_b, user_b} = activate(build_conn(), @jordan, "Trip B", "trip_walk_b")

    # CREATE
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips", %{
        "title" => "Big Sur weekend",
        "destination_label" => "Big Sur",
        "starts_on" => "2026-11-14",
        "ends_on" => "2026-11-16",
        "user_ids" => [user_b]
      })

    body = json_response(conn, 201)
    trip_id = body["trip"]["id"]
    assert body["trip"]["title"] == "Big Sur weekend"
    assert body["trip"]["legs"] == []
    assert Enum.any?(body["trip"]["participants"], &(&1["user_id"] == user_a and &1["role"] == "creator"))
    assert Enum.any?(body["trip"]["participants"], &(&1["user_id"] == user_b and &1["role"] == "participant"))

    # LIST — A sees it
    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/trips")
    list_a = json_response(conn, 200)
    assert Enum.any?(list_a["trips"], &(&1["id"] == trip_id))

    # LIST — B sees it as participant
    conn = build_conn() |> auth(token_b) |> get("/api/v1/product/trips")
    list_b = json_response(conn, 200)
    assert Enum.any?(list_b["trips"], &(&1["id"] == trip_id))

    # SHOW
    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/trips/#{trip_id}")
    assert json_response(conn, 200)["trip"]["id"] == trip_id

    # PATCH update
    conn =
      build_conn()
      |> auth(token_a)
      |> patch("/api/v1/product/trips/#{trip_id}", %{
        "title" => "Big Sur long weekend",
        "destination_label" => "Big Sur coast"
      })

    assert json_response(conn, 200)["trip"]["title"] == "Big Sur long weekend"

    # Auth scoping — stranger cannot see (404, no leak)
    # Activate a third user via fixtures user who has no membership — use token_b against a trip
    # only A created without B: create private trip
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips", %{"title" => "Solo scout"})

    solo_id = json_response(conn, 201)["trip"]["id"]

    conn = build_conn() |> auth(token_b) |> get("/api/v1/product/trips/#{solo_id}")
    assert json_response(conn, 404)["error_code"] == "not_found"

    # ADD 3 legs
    leg_ids =
      for {type, label} <- [
            {"transit", "Drive up"},
            {"lodging", "Cabin"},
            {"meal", "Dinner"}
          ] do
        conn =
          build_conn()
          |> auth(token_a)
          |> post("/api/v1/product/trips/#{trip_id}/legs", %{
            "leg_type" => type,
            "place_label" => label
          })

        body = json_response(conn, 201)
        assert is_integer(body["leg"]["position"])
        body["leg"]["id"]
      end

    assert length(leg_ids) == 3
    [l0, l1, l2] = leg_ids

    # REORDER → assert positions 0/1/2 in new order (4B 0-based source of truth)
    conn =
      build_conn()
      |> auth(token_a)
      |> patch("/api/v1/product/trips/#{trip_id}/legs/reorder", %{
        "leg_ids" => [l2, l0, l1]
      })

    trip = json_response(conn, 200)["trip"]
    assert Enum.map(trip["legs"], & &1["id"]) == [l2, l0, l1]
    assert Enum.map(trip["legs"], & &1["position"]) == [0, 1, 2]

    # DELETE leg
    conn =
      build_conn()
      |> auth(token_a)
      |> delete("/api/v1/product/trips/#{trip_id}/legs/#{l1}")

    assert json_response(conn, 200)["removed"] == true

    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/trips/#{trip_id}")
    remaining = json_response(conn, 200)["trip"]["legs"]
    refute Enum.any?(remaining, &(&1["id"] == l1))

    # LINK PLAN — valid
    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: Fixtures.conv_alex_jordan_id(),
        title: "Dinner stop",
        status: "agreed",
        timezone: "America/Los_Angeles",
        created_by_user_id: Fixtures.user_alex_id(),
        location: "Fort Oak"
      })
      |> Repo.insert()

    # Note: activated users may not be fixture alex/jordan UUIDs — create plan on a
    # conversation the activated user_a belongs to via Messages, OR seed membership.
    # Use fixture users for plan visibility by inserting ConversationMember for user_a.
    ensure_member!(Fixtures.conv_alex_jordan_id(), user_a)

    target_leg = hd(remaining)["id"]

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{target_leg}/link-plan", %{
        "shared_plan_id" => plan.id
      })

    linked = json_response(conn, 200)["leg"]
    assert linked["shared_plan_id"] == plan.id
    # Plan unchanged
    assert Repo.get!(SharedPlan, plan.id).title == "Dinner stop"

    # Bogus plan → 404
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{target_leg}/link-plan", %{
        "shared_plan_id" => Ecto.UUID.generate()
      })

    assert json_response(conn, 404)["error_code"] == "not_found"

    # Unauthorized plan (user_b not on conversation) → 404
    ensure_member!(Fixtures.conv_alex_jordan_id(), user_a)
    # Ensure B is NOT a member of a private fixture conv — use family conv with only fixtures
    {:ok, private_plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: Fixtures.conv_family_carter_id(),
        title: "Private family dinner",
        status: "agreed",
        timezone: "America/Los_Angeles",
        created_by_user_id: Fixtures.user_alex_id(),
        location: "Home"
      })
      |> Repo.insert()

    # B is participant on trip but cannot see family plan
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{target_leg}/link-plan", %{
        "shared_plan_id" => private_plan.id
      })

    assert json_response(conn, 404)["error_code"] == "not_found"

    # Invalid create → 422
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips", %{"destination_label" => "Nowhere"})

    assert json_response(conn, 422)["error_code"] == "invalid"
  end

  defp ensure_member!(conversation_id, user_id) do
    alias OpalCore.Messaging.ConversationMember

    case Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id) do
      %ConversationMember{} ->
        :ok

      nil ->
        %ConversationMember{}
        |> ConversationMember.changeset(%{
          conversation_id: conversation_id,
          user_id: user_id
        })
        |> Repo.insert!()

        :ok
    end
  end
end
