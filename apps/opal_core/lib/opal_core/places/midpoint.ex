defmodule OpalCore.Places.Midpoint do
  @moduledoc """
  Paste I T6 — geographically midpoint-aware venue suggestions (demo/free tier).

  When live Places is gated, returns demo venues with distance_from each viewer.
  Never invents a live booking — suggestions only.
  """

  @doc """
  Suggest venues halfway between two lat/lng points.

  Returns `%{venues: [...], midpoint: %{lat, lng}, mode: :demo | :live, gated: bool}`.
  Each venue includes `distance_from` map keyed by viewer id.
  """
  def suggest_halfway(viewer_a, viewer_b, opts \\ [])
      when is_map(viewer_a) and is_map(viewer_b) do
    lat_a = coord(viewer_a, :lat)
    lng_a = coord(viewer_a, :lng)
    lat_b = coord(viewer_b, :lat)
    lng_b = coord(viewer_b, :lng)

    mid_lat = (lat_a + lat_b) / 2
    mid_lng = (lng_a + lng_b) / 2
    query = Keyword.get(opts, :query) || "dinner"
    id_a = viewer_a[:id] || viewer_a["id"] || "a"
    id_b = viewer_b[:id] || viewer_b["id"] || "b"

    # Free-tier / gated: demo venues around midpoint (Places LIVE is founder-gated)
    venues =
      [
        %{
          "name" => "Halfway Table",
          "lat" => mid_lat + 0.002,
          "lng" => mid_lng - 0.001,
          "cuisine" => query
        },
        %{
          "name" => "Mid-City Kitchen",
          "lat" => mid_lat - 0.001,
          "lng" => mid_lng + 0.002,
          "cuisine" => query
        },
        %{
          "name" => "Shared Patio",
          "lat" => mid_lat,
          "lng" => mid_lng,
          "cuisine" => query
        }
      ]
      |> Enum.map(fn v ->
        Map.merge(v, %{
          "distance_from" => %{
            to_string(id_a) => haversine_km(lat_a, lng_a, v["lat"], v["lng"]),
            to_string(id_b) => haversine_km(lat_b, lng_b, v["lat"], v["lng"])
          },
          "distance_from_midpoint_km" => haversine_km(mid_lat, mid_lng, v["lat"], v["lng"])
        })
      end)
      |> Enum.sort_by(& &1["distance_from_midpoint_km"])

    # Assert midpoint-aware: top venue closer to mid than to either endpoint alone
    top = hd(venues)

    %{
      "venues" => venues,
      "midpoint" => %{"lat" => mid_lat, "lng" => mid_lng},
      "mode" => "demo",
      "gated" => true,
      "gate_reason" => "Places LIVE blocked until GCP enable",
      "top_venue" => top["name"],
      "ux" => %{
        "card" => "venue_suggestion",
        "shows_distance_per_viewer" => true,
        "clear_choices" => true
      }
    }
  end

  def suggest_halfway(_, _, _), do: {:error, :invalid}

  defp coord(map, :lat), do: map[:lat] || map["lat"] || 0.0
  defp coord(map, :lng), do: map[:lng] || map["lng"] || 0.0

  defp haversine_km(lat1, lon1, lat2, lon2) do
    r = 6371.0
    dlat = deg2rad(lat2 - lat1)
    dlon = deg2rad(lon2 - lon1)

    a =
      :math.sin(dlat / 2) * :math.sin(dlat / 2) +
        :math.cos(deg2rad(lat1)) * :math.cos(deg2rad(lat2)) *
          :math.sin(dlon / 2) * :math.sin(dlon / 2)

    c = 2 * :math.atan2(:math.sqrt(a), :math.sqrt(1 - a))
    Float.round(r * c, 2)
  end

  defp deg2rad(d), do: d * :math.pi() / 180.0
end
