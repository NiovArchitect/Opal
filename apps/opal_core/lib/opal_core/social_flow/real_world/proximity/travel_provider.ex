defmodule OpalCore.SocialFlow.RealWorld.Proximity.TravelProvider do
  @moduledoc """
  Travel-time provider boundary.

  Inputs: private origin abstract, destination abstract, mode.
  Output: duration/distance/freshness — no raw coordinate leakage in shared surfaces.

  Default: haversine estimate adapter (no external key required).
  Optional HTTP maps adapter when `MAPS_TRAVEL_API_KEY` configured.
  """

  alias OpalCore.SocialFlow.RealWorld.Proximity.Engine

  def adapter do
    Application.get_env(
      :opal_core,
      :travel_provider_adapter,
      __MODULE__.Haversine
    )
  end

  def estimate(attrs) when is_map(attrs) do
    a = stringify(attrs)

    case adapter().estimate(a) do
      {:ok, result} ->
        {:ok,
         %{
           "schema_version" => "0.1.0",
           "duration_minutes" => result["duration_minutes"],
           "distance_meters" => result["distance_meters"],
           "mode" => a["mode"] || "driving",
           "band" => Engine.band(result["duration_minutes"]),
           "freshness" => "computed",
           "observed_at" => DateTime.utc_now() |> DateTime.truncate(:microsecond),
           "origin_exposed" => false,
           "destination_label" => a["destination_label"],
           "step_eliminated" => "how_far_is_that"
         }}

      err ->
        err
    end
  end

  def estimate(_), do: {:error, :invalid}

  defmodule Haversine do
    @moduledoc "Offline travel estimate from lat/lng pairs (private only)."

    def estimate(a) do
      with {:ok, o_lat} <- num(a["origin_lat"]),
           {:ok, o_lng} <- num(a["origin_lng"]),
           {:ok, d_lat} <- num(a["dest_lat"]),
           {:ok, d_lng} <- num(a["dest_lng"]) do
        meters = haversine_m(o_lat, o_lng, d_lat, d_lng)
        # ~30 km/h urban average for driving estimate
        minutes = max(1.0, meters / 1000.0 / 30.0 * 60.0)

        {:ok,
         %{
           "duration_minutes" => Float.round(minutes, 1),
           "distance_meters" => round(meters)
         }}
      else
        _ ->
          # Label-only fallback: same city ≈ 15 min, different ≈ 35
          mins =
            if a["origin_area"] && a["origin_area"] == a["dest_area"],
              do: 12.0,
              else: 28.0

          {:ok, %{"duration_minutes" => mins, "distance_meters" => round(mins * 500)}}
      end
    end

    defp num(n) when is_number(n), do: {:ok, n * 1.0}

    defp num(s) when is_binary(s) do
      case Float.parse(s) do
        {f, _} -> {:ok, f}
        :error -> :error
      end
    end

    defp num(_), do: :error

    defp haversine_m(lat1, lon1, lat2, lon2) do
      r = 6_371_000
      dlat = deg2rad(lat2 - lat1)
      dlon = deg2rad(lon2 - lon1)

      a =
        :math.sin(dlat / 2) * :math.sin(dlat / 2) +
          :math.cos(deg2rad(lat1)) * :math.cos(deg2rad(lat2)) *
            :math.sin(dlon / 2) * :math.sin(dlon / 2)

      c = 2 * :math.atan2(:math.sqrt(a), :math.sqrt(1 - a))
      r * c
    end

    defp deg2rad(d), do: d * :math.pi() / 180.0
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
