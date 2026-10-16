defmodule OpalCore.Center.DeviceLocation do
  @moduledoc """
  Single location-origin invariant for the Center (Repair #12 / F12-11).

  One pipeline, one `origin_source` concept:
  - `"device"` — coarse coords from a user-granted device fix (mobile
    expo-location or web geolocation), used for venue ranking / near-me.
  - `"manual"` — a destination the user typed ("restaurants in Coronado").
  - `"named_destination"` — geography resolved from a named venue/entity
    (exact_entity search mode).

  Coarse means 3-decimal rounding (~110 m) applied server-side — never trust
  client precision. Stored once per user in the PlanningContext (the durable
  per-user store), never per screen.

  PRIVACY LAW (hard): this is NOT the travel pipeline. Precise travel sharing
  still requires a time-bounded session and `travel_controller.ex` keeps its
  deliberate 422 on GPS keys. Coarse device coords for ranking are a different
  purpose from precise travel sharing — the two must never be conflated.
  """

  alias OpalCore.Center.PlanningContext

  @origin_sources ~w(device manual named_destination)

  @doc "Allowed origin_source values."
  def origin_sources, do: @origin_sources

  @doc """
  Validate + coarsen client-supplied coords.

  Accepts `%{"lat" => lat, "lon" => lon, "accuracy_m" => acc, "origin_source" => src}`
  (atom keys also accepted). Returns `{:ok, coarse_map}` or `{:error, reason}`.

  Reasons: `:invalid_coords` (missing/out-of-range lat/lon),
  `:invalid_origin_source`.
  """
  def validate_coords(params) when is_map(params) do
    lat = params["lat"] || params[:lat]
    lon = params["lon"] || params[:lon] || params["lng"] || params[:lng]
    accuracy_m = params["accuracy_m"] || params[:accuracy_m]
    origin_source = params["origin_source"] || params[:origin_source] || "device"

    with true <- is_number(lat) and lat >= -90 and lat <= 90,
         true <- is_number(lon) and lon >= -180 and lon <= 180,
         true <- origin_source in @origin_sources do
      coarse = %{
        "lat" => Float.round(lat / 1, 3),
        "lon" => Float.round(lon / 1, 3),
        "origin_source" => origin_source,
        "updated_at" => DateTime.utc_now() |> DateTime.to_iso8601()
      }

      coarse =
        if is_number(accuracy_m) and accuracy_m > 0 do
          Map.put(coarse, "accuracy_m", accuracy_m)
        else
          coarse
        end

      {:ok, coarse}
    else
      false ->
        cond do
          not (is_number(lat) and lat >= -90 and lat <= 90 and is_number(lon) and lon >= -180 and
                 lon <= 180) ->
            {:error, :invalid_coords}

          true ->
            {:error, :invalid_origin_source}
        end
    end
  end

  def validate_coords(_), do: {:error, :invalid_coords}

  @doc """
  Haversine great-circle distance in kilometres between two WGS-84 points.
  Pure — the one distance function for the Center path (Repair #12 F12-11e).
  """
  def haversine_km(lat1, lon1, lat2, lon2)
      when is_number(lat1) and is_number(lon1) and is_number(lat2) and is_number(lon2) do
    r = 6371.0
    dlat = :math.pi() * (lat2 - lat1) / 180.0
    dlon = :math.pi() * (lon2 - lon1) / 180.0

    a =
      :math.sin(dlat / 2) * :math.sin(dlat / 2) +
        :math.cos(:math.pi() * lat1 / 180.0) * :math.cos(:math.pi() * lat2 / 180.0) *
          :math.sin(dlon / 2) * :math.sin(dlon / 2)

    2 * r * :math.asin(:math.sqrt(min(a, 1.0)))
  end

  def haversine_km(_, _, _, _), do: nil

  @doc "Human distance for paint: \"0.8 mi away\" (nil when not computable)."
  def distance_label(lat1, lon1, lat2, lon2) do
    case haversine_km(lat1, lon1, lat2, lon2) do
      nil -> nil
      km -> "#{Float.round(km * 0.621371, 1)} mi away"
    end
  end

  @doc """
  Read the stored coarse device coords for a user. Returns
  `{:ok, coords_map}` or `:none`. Coords older than 24h are treated as stale
  (`:none`) — a fresh grant re-establishes them.
  """
  def get_for_user(user_id) when is_binary(user_id) do
    planning = PlanningContext.get_for_user(user_id)

    case planning["device_coords"] do
      %{"lat" => lat, "lon" => lon} = coords when is_number(lat) and is_number(lon) ->
        if stale?(coords["updated_at"]) do
          :none
        else
          {:ok, coords}
        end

      _ ->
        :none
    end
  end

  def get_for_user(_), do: :none

  @doc """
  Store validated coarse coords for a user. `coords` must already be
  validated/coarsened by `validate_coords/1`. Best-effort: returns `:ok` or
  `{:error, reason}` without raising when the user has no Center conversation.
  """
  def put_for_user(user_id, coords) when is_binary(user_id) and is_map(coords) do
    case PlanningContext.merge(user_id, %{"device_coords" => coords}, %{}) do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  def put_for_user(_, _), do: {:error, :invalid}

  @doc "Origin source currently on file for the user (nil when none)."
  def origin_source_for(user_id) when is_binary(user_id) do
    case get_for_user(user_id) do
      {:ok, %{"origin_source" => src}} -> src
      _ -> nil
    end
  end

  def origin_source_for(_), do: nil

  defp stale?(nil), do: true

  defp stale?(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.diff(DateTime.utc_now(), dt, :second) > 24 * 3600
      _ -> true
    end
  end

  defp stale?(_), do: true
end
