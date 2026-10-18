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
    # Repair #18 residuals (R-3b) - the grant is PER-USER, but it is
    # stored on the planning_context of whichever Center conversation
    # was active when it landed. Reading only the currently-active
    # conversation made the write and the read disagree the moment the
    # user started a new chat (the granting conversation is archived,
    # its coords orphaned, and the city question answered "no
    # location" in the same session). Read across ALL of the user's
    # Center conversations, newest fix first; the 24h freshness window
    # still applies to whichever fix wins.
    user_id
    |> all_planning_contexts()
    |> Enum.find_value(:none, fn planning ->
      case planning["device_coords"] do
        %{"lat" => lat, "lon" => lon} = coords when is_number(lat) and is_number(lon) ->
          if stale?(coords["updated_at"]), do: nil, else: {:ok, coords}

        _ ->
          nil
      end
    end)
  end

  def get_for_user(_), do: :none

  # Every planning context the user has, active conversation first,
  # then archived sessions newest-first (a fix granted in a chat that
  # has since been archived is still the user's latest grant).
  defp all_planning_contexts(user_id) do
    import Ecto.Query

    from(c in OpalCore.OpalConversations.OpalConversation,
      where: c.user_id == ^user_id,
      order_by: [
        asc: fragment("CASE WHEN ? IS NULL THEN 0 ELSE 1 END", c.archived_at),
        desc: c.updated_at,
        desc: c.inserted_at
      ],
      select: c.planning_context
    )
    |> OpalCore.Repo.all()
    |> Enum.map(fn
      ctx when is_map(ctx) ->
        Map.new(ctx, fn
          {k, v} when is_atom(k) -> {Atom.to_string(k), v}
          {k, v} -> {to_string(k), v}
        end)

      _ ->
        %{}
    end)
  rescue
    _ -> [PlanningContext.get_for_user(user_id)]
  end

  @doc """
  Coarse city name for validated coords, or nil when no source can
  name one honestly. Sources, in order: the Geoapify reverse geocode
  when its key is configured (the same provider the places pipeline
  uses), then the built-in metro gazetteer (nearest centroid within
  75 km - a coarse fix only ever names the metro it falls in, never a
  street-level claim). Nil keeps the caller on the honest
  coords-only answer.
  """
  def city_for_coords(%{"lat" => lat, "lon" => lon}) when is_number(lat) and is_number(lon) do
    geoapify_city(lat, lon) || gazetteer_city(lat, lon)
  end

  def city_for_coords(_), do: nil

  defp geoapify_city(lat, lon) do
    key = Application.get_env(:opal_core, :geoapify_api_key)

    if is_binary(key) and key != "" do
      url =
        "https://api.geoapify.com/v1/geocode/reverse?lat=#{lat}&lon=#{lon}&format=json&apiKey=#{key}"

      case Req.get(url, receive_timeout: 3_000) do
        {:ok, %{status: 200, body: %{"results" => [first | _]}}} ->
          first["city"] || first["county"] || first["state"]

        _ ->
          nil
      end
    end
  rescue
    _ -> nil
  end

  # Coarse metro centroids (city, lat, lon). Deliberately short: the
  # product's home metros plus major US metros a coarse fix plausibly
  # lands in. A fix outside every radius names no city rather than
  # guessing the nearest one hundreds of kilometres away.
  @gazetteer [
    {"San Diego", 32.716, -117.161},
    {"Oceanside", 33.196, -117.380},
    {"Los Angeles", 34.052, -118.244},
    {"San Francisco", 37.775, -122.419},
    {"San Jose", 37.339, -121.895},
    {"Sacramento", 38.582, -121.494},
    {"Fresno", 36.738, -119.787},
    {"Phoenix", 33.448, -112.074},
    {"Tucson", 32.222, -110.975},
    {"Las Vegas", 36.170, -115.140},
    {"Denver", 39.739, -104.990},
    {"Salt Lake City", 40.761, -111.891},
    {"Portland", 45.515, -122.679},
    {"Seattle", 47.606, -122.332},
    {"Austin", 30.267, -97.743},
    {"Dallas", 32.777, -96.797},
    {"Houston", 29.760, -95.370},
    {"San Antonio", 29.424, -98.494},
    {"Chicago", 41.878, -87.630},
    {"Minneapolis", 44.978, -93.265},
    {"Atlanta", 33.749, -84.388},
    {"Miami", 25.762, -80.192},
    {"Orlando", 28.538, -81.379},
    {"Tampa", 27.951, -82.457},
    {"New York", 40.713, -74.006},
    {"Boston", 42.360, -71.059},
    {"Washington", 38.907, -77.037},
    {"Philadelphia", 39.953, -75.165},
    {"Nashville", 36.163, -86.782},
    {"Charlotte", 35.227, -80.843}
  ]

  defp gazetteer_city(lat, lon) do
    @gazetteer
    |> Enum.map(fn {city, clat, clon} -> {city, haversine_km(lat, lon, clat, clon)} end)
    |> Enum.filter(fn {_city, km} -> is_number(km) and km <= 75.0 end)
    |> Enum.sort_by(fn {_city, km} -> km end)
    |> List.first()
    |> case do
      {city, _km} -> city
      _ -> nil
    end
  end

  @doc """
  Store validated coarse coords for a user. `coords` must already be
  validated/coarsened by `validate_coords/1`. Best-effort: returns `:ok` or
  `{:error, reason}` without raising when the user has no Center conversation.
  """
  def put_for_user(user_id, coords) when is_binary(user_id) and is_map(coords) do
    # F12-63 — pass coords as EXTRAS, not entities: PlanningContext.merge/3
    # runs entities through an NL-entity allowlist (who/when/destination/...)
    # that silently dropped "device_coords" while returning :ok.
    case PlanningContext.merge(user_id, %{}, %{"device_coords" => coords}) do
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
