defmodule OpalCore.SocialFlow.OpenStreetMapOverpassTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Physical.Providers.{Mode, OpenStreetMapOverpass}

  defmodule FakeOverpassHTTP do
    def post_form(_url, _ql, _opts) do
      {:ok,
       %{
         "elements" => [
           %{
             "type" => "node",
             "id" => 1_234_567,
             "lat" => 32.7231,
             "lon" => -117.1682,
             "tags" => %{
               "name" => "Barbusa",
               "amenity" => "restaurant",
               "opening_hours" => "Mo-Su 11:00-22:00"
             }
           },
           %{
             "type" => "node",
             "id" => 7_654_321,
             "lat" => 32.722,
             "lon" => -117.169,
             "tags" => %{"name" => "Filippi's", "amenity" => "restaurant"}
           },
           %{
             "type" => "node",
             "id" => 99,
             "lat" => 32.72,
             "lon" => -117.17,
             "tags" => %{"amenity" => "restaurant"}
           }
         ]
       }}
    end
  end

  setup do
    previous = %{
      http: Application.get_env(:opal_core, :openstreetmap_overpass_http_client),
      mode: Application.get_env(:opal_core, :place_provider_mode),
      backend: Application.get_env(:opal_core, :place_provider_backend),
      allow: Application.get_env(:opal_core, :allow_osm_public)
    }

    Application.put_env(:opal_core, :openstreetmap_overpass_http_client, FakeOverpassHTTP)
    Application.put_env(:opal_core, :place_provider_mode, "connected")
    Application.put_env(:opal_core, :place_provider_backend, "openstreetmap")
    Application.put_env(:opal_core, :allow_osm_public, true)

    on_exit(fn ->
      restore(:openstreetmap_overpass_http_client, previous.http)
      restore(:place_provider_mode, previous.mode)
      restore(:place_provider_backend, previous.backend)
      restore(:allow_osm_public, previous.allow)
    end)

    :ok
  end

  defp restore(k, nil), do: Application.delete_env(:opal_core, k)
  defp restore(k, v), do: Application.put_env(:opal_core, k, v)

  test "normalizes OSM elements with honesty flags" do
    assert {:ok, res} =
             OpenStreetMapOverpass.fetch_candidates(%{
               "lat" => 32.723,
               "lng" => -117.168,
               "max_result_count" => 10
             })

    assert res["real"]
    assert res["live"]
    assert res["synthetic"] == false
    assert res["inventory_unknown"]
    assert res["does_not_claim_availability_slots"]
    assert res["source"] == "openstreetmap_overpass"

    ids = Enum.map(res["candidates"], & &1["provider_place_id"])
    assert "osm_node_1234567" in ids
    refute Enum.any?(res["candidates"], &is_nil(&1["name"]))

    barbusa = Enum.find(res["candidates"], &(&1["name"] == "Barbusa"))
    assert barbusa["open_now_unknown"]
    assert barbusa["open_now_verified"] == false
    assert barbusa["candidate_source_class"] == "real_external"
    assert barbusa["opening_hours_hint"] =~ "Mo-Su"
  end

  test "area_label alone requires geocode" do
    assert {:error, :geocode_required} =
             OpenStreetMapOverpass.fetch_candidates(%{"area_label" => "Little Italy"})
  end

  test "mode connected_places_adapter selects osm" do
    assert Mode.connected_places_adapter() == :openstreetmap
  end

  @tag :live_external
  test "live overpass little italy when OPAL_LIVE_OSM=1" do
    if System.get_env("OPAL_LIVE_OSM") == "1" do
      Application.delete_env(:opal_core, :openstreetmap_overpass_http_client)

      assert {:ok, res} =
               OpenStreetMapOverpass.fetch_candidates(%{
                 "lat" => 32.723,
                 "lng" => -117.168,
                 "radius_m" => 400,
                 "max_result_count" => 5
               })

      assert length(res["candidates"]) > 0
      assert res["real"]
    else
      # Opt-in live probe — skipped unless OPAL_LIVE_OSM=1
      assert true
    end
  end
end
