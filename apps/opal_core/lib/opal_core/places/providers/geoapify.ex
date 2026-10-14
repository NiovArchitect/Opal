defmodule OpalCore.Places.Providers.Geoapify do
  @moduledoc """
  Geoapify Places + Geocode adapter (server-side).

  Uses the same HTTP shape as Geoapify's Python example:
  GET with Accept: application/json and apiKey query param.

  Primary live places provider while Google Places (New) is billing-deferred.
  Never invents ratings or reservation status.
  """

  @behaviour OpalCore.Places.Provider

  @geocode_url "https://api.geoapify.com/v1/geocode/search"
  @places_url "https://api.geoapify.com/v2/places"
  @timeout_ms 20_000

  @impl true
  def id, do: "geoapify"

  @impl true
  def capabilities do
    %{
      "provider" => id(),
      "geocode" => true,
      "places_search" => true,
      "ratings" => false,
      "reservations" => false,
      "billing_required" => false,
      "attribution_required" => true,
      "attribution" => "Powered by Geoapify"
    }
  end

  @impl true
  def health do
    key? = api_key() not in [nil, ""]

    %{
      "provider" => id(),
      "configured" => key?,
      "available" => key?,
      "billing_ready" => true
    }
  end

  @impl true
  def resolve_destination(query) when is_binary(query),
    do: resolve_destination(%{"text" => query})

  def resolve_destination(query) when is_map(query) do
    text =
      stringify(query)
      |> then(fn q -> q["text"] || q["destination"] || q["name"] || q["query"] end)
      |> case do
        s when is_binary(s) -> String.trim(s)
        _ -> ""
      end

    cond do
      text == "" ->
        {:error, :invalid}

      api_key() in [nil, ""] ->
        {:error, :missing_credential}

      true ->
        do_geocode(text)
    end
  end

  def resolve_destination(_), do: {:error, :invalid}

  @impl true
  def search_places(query) when is_map(query) do
    q = stringify(query)

    cond do
      api_key() in [nil, ""] ->
        {:error, :missing_credential}

      true ->
        with {:ok, dest} <- ensure_destination(q),
             {:ok, candidates} <- do_places_search(q, dest) do
          {:ok,
           %{
             "candidates" => candidates,
             "provider" => id(),
             "real" => true,
             "synthetic" => false,
             "live" => true,
             "search_geography" => dest["label"] || dest["name"],
             "destination" => dest,
             "attribution" => "Powered by Geoapify",
             "provider_is_not_authority" => true
           }}
        end
    end
  end

  def search_places(_), do: {:error, :invalid}

  @impl true
  def get_place(place_id) when is_binary(place_id) and place_id != "" do
    # Geoapify place details via places filter by id is limited; return not_implemented
    # until needed. Selection uses candidate snapshot from search.
    {:error, :not_implemented}
  end

  def get_place(_), do: {:error, :invalid}

  # --- internals -------------------------------------------------------------

  defp ensure_destination(%{"destination" => %{} = d}) when map_size(d) > 0, do: {:ok, d}

  defp ensure_destination(q) do
    text = q["destination_text"] || q["destination"] || q["area_label"] || q["city"] || q["text"]

    cond do
      is_map(q["lat"]) ->
        {:error, :invalid}

      is_number(q["lat"]) and is_number(q["lng"] || q["lon"]) ->
        {:ok,
         %{
           "label" => q["destination_text"] || q["area_label"] || "search area",
           "name" => q["destination_text"] || q["area_label"] || "search area",
           "lat" => q["lat"],
           "lon" => q["lng"] || q["lon"],
           "provider" => id()
         }}

      is_binary(text) and String.trim(text) != "" ->
        resolve_destination(%{"text" => text})

      true ->
        {:error, :destination_required}
    end
  end

  defp do_geocode(text) do
    params = [
      {"text", text},
      {"limit", "1"},
      {"apiKey", api_key()}
    ]

    # Prefer city-level when query looks like a city name (no street numbers).
    params =
      if Regex.match?(~r/\d/, text) do
        params
      else
        [{"type", "city"} | params]
      end

    case http_get(@geocode_url, params) do
      {:ok, %{"features" => [feat | _]}} ->
        props = feat["properties"] || %{}
        {lat, lon} = coords(feat, props)

        if is_number(lat) and is_number(lon) do
          {:ok,
           %{
             "label" => props["formatted"] || props["city"] || props["name"] || text,
             "name" => props["city"] || props["name"] || text,
             "country" => props["country"],
             "country_code" => props["country_code"],
             "lat" => lat,
             "lon" => lon,
             "place_id" => props["place_id"],
             "provider" => id(),
             "query" => text
           }}
        else
          {:error, :geocode_failed}
        end

      {:ok, %{"features" => []}} ->
        {:error, :not_found}

      {:ok, %{"message" => msg}} when is_binary(msg) ->
        {:error, {:provider, msg}}

      {:error, _} = err ->
        err

      other ->
        {:error, {:unexpected, other}}
    end
  end

  defp do_places_search(q, dest) do
    # Fetch a wider pool then quality-filter to named venues. City place: filters
    # often return unnamed street POIs; circle + larger limit yields named restaurants.
    want = min(to_i(q["limit"] || q["max_candidates"] || 5), 8)
    fetch = min(max(want * 4, 20), 50)
    categories = q["categories"] || "catering.restaurant"
    radius = min(to_i(q["radius_m"] || 8_000), 25_000)

    # Destination-scoped circle (no home-location bias). Bias keeps nearer first.
    filter = "circle:#{dest["lon"]},#{dest["lat"]},#{radius}"
    bias = "proximity:#{dest["lon"]},#{dest["lat"]}"

    params = [
      {"categories", categories},
      {"filter", filter},
      {"bias", bias},
      {"limit", Integer.to_string(fetch)},
      {"apiKey", api_key()}
    ]

    case http_get(@places_url, params) do
      {:ok, %{"features" => feats}} when is_list(feats) ->
        cands =
          feats
          |> Enum.map(&normalize_feature(&1, dest))
          |> quality_filter()
          |> Enum.take(want)

        if length(cands) < max(div(want, 2), 1) do
          # Widen radius once if the first pass was thin.
          retry_radius(q, dest, want, categories, min(radius * 2, 20_000))
        else
          {:ok, cands}
        end

      {:ok, %{"message" => msg}} when is_binary(msg) ->
        {:error, {:provider, msg}}

      {:error, _} = err ->
        err

      other ->
        {:error, {:unexpected, other}}
    end
  end

  defp retry_radius(_q, dest, want, categories, radius) do
    fetch = min(max(want * 4, 20), 50)

    params = [
      {"categories", categories},
      {"filter", "circle:#{dest["lon"]},#{dest["lat"]},#{radius}"},
      {"bias", "proximity:#{dest["lon"]},#{dest["lat"]}"},
      {"limit", Integer.to_string(fetch)},
      {"apiKey", api_key()}
    ]

    case http_get(@places_url, params) do
      {:ok, %{"features" => feats}} when is_list(feats) ->
        cands =
          feats
          |> Enum.map(&normalize_feature(&1, dest))
          |> quality_filter()
          |> Enum.take(want)

        {:ok, cands}

      {:error, _} = err ->
        err

      _ ->
        {:ok, []}
    end
  end

  # Prefer real venue names over street-only POIs Geoapify sometimes returns.
  defp quality_filter(cands) do
    cands
    |> Enum.reject(&is_nil/1)
    |> Enum.reject(fn c -> c["name"] in [nil, ""] end)
    |> Enum.reject(fn c -> street_only_name?(c["name"]) end)
    |> Enum.uniq_by(& &1["name"])
  end

  defp street_only_name?(name) when is_binary(name) do
    Regex.match?(~r/^(calle|avenida|av\.|blvd|boulevard|street|st\.|road|rd\.)\b/i, String.trim(name))
  end

  defp street_only_name?(_), do: true

  defp normalize_feature(feat, dest) when is_map(feat) do
    props = feat["properties"] || %{}
    # Prefer explicit name only — address_line1 is often a street without a venue.
    name = props["name"]
    {lat, lon} = coords(feat, props)
    address = props["formatted"] || props["address_line2"] || props["address_line1"]
    catering = props["catering"] || %{}

    %{
      "id" => to_string(props["place_id"] || props["osm_id"] || :erlang.phash2(props)),
      "provider" => id(),
      "provider_place_id" => props["place_id"],
      "name" => name,
      "address" => address,
      "lat" => lat,
      "lon" => lon,
      "categories" => List.wrap(props["categories"]),
      "cuisine" => catering["cuisine"] || props["cuisine"],
      "website" => props["website"],
      "phone" => get_in(props, ["contact", "phone"]) || props["phone"],
      "opening_hours" => props["opening_hours"],
      "search_geography" => dest["label"] || dest["name"],
      "real" => true,
      "synthetic" => false,
      "fixture" => false,
      "live" => true,
      # Honest: only populate rating/booking when this provider returns them.
      "rating" => nil,
      "rating_available" => false,
      "reservation_support" => false,
      "booking_capability" => false,
      "provider_is_not_authority" => true,
      "raw_provenance" => %{
        "datasource" => props["datasource"],
        "place_id" => props["place_id"]
      }
    }
  end

  defp normalize_feature(_, _), do: nil

  defp coords(feat, props) do
    case feat["geometry"] do
      %{"coordinates" => [lon, lat | _]} when is_number(lat) and is_number(lon) ->
        {lat, lon}

      _ ->
        {props["lat"], props["lon"]}
    end
  end

  defp http_get(url, params) do
    case Req.get(url,
           params: params,
           headers: [{"accept", "application/json"}],
           receive_timeout: @timeout_ms,
           retry: false
         ) do
      {:ok, %{status: 200, body: body}} when is_map(body) ->
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        {:error, {:http, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp api_key do
    Application.get_env(:opal_core, :geoapify_api_key) ||
      System.get_env("GEOAPIFY_API_KEY") ||
      System.get_env("OPAL_GEOAPIFY_API_KEY")
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)

  defp to_i(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      _ -> 8
    end
  end

  defp to_i(_), do: 8
end
