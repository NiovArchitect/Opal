defmodule OpalCoreWeb.DecisionIntelligenceApiTest do
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession

  defmodule FakeOverpassHTTP do
    def post_form(_url, _ql, _opts) do
      {:ok,
       %{
         "elements" => [
           %{
             "type" => "node",
             "id" => 9_901,
             "lat" => 32.723,
             "lon" => -117.168,
             "tags" => %{
               "name" => "API Osm Bistro",
               "amenity" => "restaurant",
               "opening_hours" => "Mo-Su 11:00-23:00"
             }
           },
           %{
             "type" => "node",
             "id" => 9_902,
             "lat" => 32.722,
             "lon" => -117.167,
             "tags" => %{"name" => "API Osm Cafe", "amenity" => "cafe"}
           }
         ]
       }}
    end
  end

  setup %{conn: conn} do
    previous = %{
      mode: Application.get_env(:opal_core, :place_provider_mode),
      backend: Application.get_env(:opal_core, :place_provider_backend),
      http: Application.get_env(:opal_core, :openstreetmap_overpass_http_client),
      allow: Application.get_env(:opal_core, :allow_osm_public),
      key: Application.get_env(:opal_core, :google_places_api_key)
    }

    on_exit(fn ->
      restore(:place_provider_mode, previous.mode)
      restore(:place_provider_backend, previous.backend)
      restore(:openstreetmap_overpass_http_client, previous.http)
      restore(:allow_osm_public, previous.allow)
      restore(:google_places_api_key, previous.key)
    end)

    Application.put_env(:opal_core, :place_provider_mode, "synthetic")
    Application.put_env(:opal_core, :openstreetmap_overpass_http_client, FakeOverpassHTTP)
    Application.put_env(:opal_core, :allow_osm_public, true)
    Application.put_env(:opal_core, :google_places_api_key, nil)

    user =
      %User{}
      |> User.changeset(%{
        handle: "di-api-#{System.unique_integer([:positive])}",
        display_name: "DI API"
      })
      |> Repo.insert!()

    token = issue_token!(user.id, "di-web")

    conn =
      conn
      |> put_req_header("content-type", "application/json")
      |> put_req_header("authorization", "Bearer #{token}")

    %{conn: conn, user: user, token: token}
  end

  defp restore(k, nil), do: Application.delete_env(:opal_core, k)
  defp restore(k, v), do: Application.put_env(:opal_core, k, v)

  defp issue_token!(user_id, label) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    n = System.unique_integer([:positive])

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user_id,
        device_label: label,
        platform: "web",
        status: "active",
        session_ref: "ref-#{n}",
        refresh_family: "rf-#{n}",
        idempotency_key: "idem-ds-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end

  test "POST decisions/resolve connected OSM returns shareable HIGH shape", %{conn: conn} do
    conn =
      post(conn, "/api/v1/product/decisions/resolve", %{
        "intent" => "nearby_now",
        "lat" => 32.723,
        "lng" => -117.168,
        "area_label" => "Little Italy",
        "scope_type" => "solo",
        "place_provider_mode" => "connected",
        "budget_context" => %{"max" => 95},
        "preference_context" => %{"vibe" => "quiet"},
        "time_context" => %{"preference" => "now"}
      })

    body = json_response(conn, 200)
    assert body["decision_id"]
    assert body["outcome"] in ["HIGH", "MEDIUM", "LOW", "NO_VALID_CANDIDATE", "NOT_RESOLVED"]
    assert body["candidate_source"] == "openstreetmap_overpass"
    assert body["provisional"] == true
    assert is_map(body["figma"])
    refute Map.has_key?(body, "explanation_private")
    refute Jason.encode!(body) =~ "budget too high"

    if body["outcome"] == "HIGH" do
      assert body["mode"] == "high"
      assert body["confidence_class"] == "high"
      assert body["answer"]["name"]
      assert body["real"] == true
    end
  end

  test "POST decisions/resolve without auth is denied", %{conn: _conn} do
    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> post("/api/v1/product/decisions/resolve", %{
        "intent" => "nearby_now",
        "lat" => 32.723,
        "lng" => -117.168
      })

    assert conn.status in [401, 403]
  end

  test "answer_question and resolve_tradeoff routes exist for authenticated user", %{
    conn: conn,
    token: token
  } do
    conn_q =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> put_req_header("authorization", "Bearer #{token}")
      |> post("/api/v1/product/decisions/#{Ecto.UUID.generate()}/answer_question", %{
        "choice_id" => "earlier"
      })

    assert json_response(conn_q, 404)["error_code"] == "not_found"

    conn_t =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> put_req_header("authorization", "Bearer #{token}")
      |> post("/api/v1/product/decisions/#{Ecto.UUID.generate()}/resolve_tradeoff", %{
        "selected_id" => "closer"
      })

    assert json_response(conn_t, 404)["error_code"] == "not_found"

    _ = conn
  end
end
