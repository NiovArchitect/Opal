defmodule OpalCore.DecisionIntelligence.CandidateAcquisitionTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.DecisionIntelligence
  alias OpalCore.DecisionIntelligence.CandidateAcquisition
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Physical.Providers.OpenStreetMapOverpass

  defmodule FakeOverpassHTTP do
    def post_form(_url, _ql, _opts) do
      {:ok,
       %{
         "elements" => [
           %{
             "type" => "node",
             "id" => 42,
             "lat" => 32.723,
             "lon" => -117.168,
             "tags" => %{"name" => "OSM Cafe", "amenity" => "cafe"}
           }
         ]
       }}
    end
  end

  setup do
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

    user =
      %User{}
      |> User.changeset(%{handle: "acq-#{System.unique_integer([:positive])}", display_name: "Acq"})
      |> Repo.insert!()

    %{user: user}
  end

  defp restore(k, nil), do: Application.delete_env(:opal_core, k)
  defp restore(k, v), do: Application.put_env(:opal_core, k, v)

  test "fixture mode returns catalog", %{user: user} do
    Application.put_env(:opal_core, :place_provider_mode, "synthetic")

    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(user.id, %{
        "intent" => "date_ideas",
        "budget_context" => %{"max" => 80},
        "preference_context" => %{"vibe" => "quiet"}
      })

    assert {:ok, acq} = CandidateAcquisition.fetch(ctx)
    assert acq.source == "fixture_catalog"
    assert acq.synthetic
    refute acq.real
    assert length(acq.candidates) > 0
  end

  test "connected osm mock returns real_external", %{user: user} do
    Application.put_env(:opal_core, :place_provider_mode, "connected")
    Application.put_env(:opal_core, :place_provider_backend, "openstreetmap")
    Application.put_env(:opal_core, :allow_osm_public, true)
    Application.put_env(:opal_core, :google_places_api_key, nil)
    Application.put_env(:opal_core, :openstreetmap_overpass_http_client, FakeOverpassHTTP)

    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(user.id, %{
        "intent" => "date_ideas",
        "budget_context" => %{"max" => 80},
        "preference_context" => %{"vibe" => "quiet"},
        "location_context" => %{
          "lat" => 32.723,
          "lng" => -117.168,
          "area_label" => "Little Italy"
        }
      })

    assert {:ok, acq} = CandidateAcquisition.fetch(ctx)
    assert acq.real
    assert acq.source == "openstreetmap_overpass"
    assert Enum.any?(acq.candidates, &(&1["name"] == "OSM Cafe" or &1["provider_place_id"] == "osm_node_42"))
  end

  test "normalize element shape" do
    el =
      OpenStreetMapOverpass.normalize_element(
        %{
          "type" => "node",
          "id" => 9,
          "lat" => 1.0,
          "lon" => 2.0,
          "tags" => %{"name" => "X", "amenity" => "bar"}
        },
        %{}
      )

    assert el["provider_place_id"] == "osm_node_9"
    assert el["candidate_source_class"] == "real_external"
  end
end
