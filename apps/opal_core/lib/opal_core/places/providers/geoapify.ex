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
  @routing_url "https://api.geoapify.com/v1/routing"
  @timeout_ms 20_000

  @impl true
  def id, do: "geoapify"

  @impl true
  def capabilities do
    %{
      "provider" => id(),
      "geocode" => true,
      "places_search" => true,
      "routing" => true,
      # Provider truth (Routing API): the only traffic models are
      # "free_flow" (optimistic, no traffic influence) and
      # "approximated" (a model that lowers speeds on potentially
      # heavy-loaded roads). There is NO live traffic feed, so a
      # routed duration is never class "live".
      "live_traffic" => false,
      "traffic_model" => "approximated",
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

      exact_entity_mode?(q) ->
        resolve_exact_entity(q)

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
             "search_mode" => "discovery",
             "search_geography" => dest["label"] || dest["name"],
             "destination" => dest,
             "attribution" => "Powered by Geoapify",
             "provider_is_not_authority" => true
           }}
        end
    end
  end

  def search_places(_), do: {:error, :invalid}

  @doc """
  Exact named-venue resolve via geocode text search.

  Preserves requested name + locality as immutable constraints.
  Returns at most one verified candidate. Never substitutes unrelated
  category discoveries when the named venue cannot be verified.
  """
  def resolve_exact_entity(query) when is_map(query) do
    q = stringify(query)
    name = trim_bin(q["requested_venue_name"] || q["venue_name"] || q["name"] || q["text"])
    locality = trim_bin(q["requested_venue_locality"] || q["destination_text"] || q["destination"] || q["locality"] || q["city"])

    cond do
      name == "" ->
        {:error, :venue_name_required}

      api_key() in [nil, ""] ->
        {:error, :missing_credential}

      true ->
        variants = name_variants(name)

        queries =
          for v <- variants, loc <- locality_queries(locality) do
            if loc == "", do: v, else: "#{v}, #{loc}"
          end
          |> Enum.uniq()
          |> Enum.take(6)

        case find_exact_match(queries, name, locality) do
          {:ok, candidate} ->
            {:ok,
             %{
               "candidates" => [candidate],
               "provider" => id(),
               "real" => true,
               "synthetic" => false,
               "live" => true,
               "search_mode" => "exact_entity",
               "requested_venue_name" => name,
               "requested_venue_locality" => locality,
               "search_geography" => locality,
               "exact_resolved" => true,
               "unrequested_alternatives" => 0,
               "venue_substitution" => 0,
               "attribution" => "Powered by Geoapify",
               "provider_is_not_authority" => true
             }}

          {:error, :not_found} ->
            {:ok,
             %{
               "candidates" => [],
               "provider" => id(),
               "real" => true,
               "synthetic" => false,
               "live" => true,
               "search_mode" => "exact_entity",
               "requested_venue_name" => name,
               "requested_venue_locality" => locality,
               "search_geography" => locality,
               "exact_resolved" => false,
               "exact_unresolved" => true,
               "unrequested_alternatives" => 0,
               "venue_substitution" => 0,
               "attribution" => "Powered by Geoapify",
               "provider_is_not_authority" => true
             }}

          {:error, _} = err ->
            err
        end
    end
  end

  def resolve_exact_entity(_), do: {:error, :invalid}

  @doc """
  Route between two coordinate pairs (Routing API, mode=drive).

  Provider truth, from the Routing API documentation (checked
  2026-10-19): the response's `features[0].properties` carries
  `distance` (meters) and `time` (seconds). The request asks for
  `traffic=approximated` - Geoapify's modelled traffic (speeds
  lowered on potentially heavy-loaded roads). The API offers no
  live traffic on any tier, so the returned duration is classified
  `"estimate"` here and never `"live"`.

  Transport seam for tests: the `:geoapify_http_fun` app env, a
  `fun.(url, params) -> {:ok, decoded_body} | {:error, reason}`
  returning a provider-shaped body (the `:deepgram_http_fun`
  pattern elsewhere). Production takes the Req branch.
  """
  def route(query) when is_map(query) do
    q = stringify(query)
    origin = {to_f(q["origin_lat"]), to_f(q["origin_lon"])}
    destination = {to_f(q["destination_lat"]), to_f(q["destination_lon"])}

    cond do
      not valid_pair?(origin) or not valid_pair?(destination) ->
        {:error, :invalid}

      api_key() in [nil, ""] ->
        {:error, :missing_credential}

      true ->
        do_route(origin, destination)
    end
  end

  def route(_), do: {:error, :invalid}

  defp do_route({olat, olon}, {dlat, dlon}) do
    params = [
      {"waypoints", "#{olat},#{olon}|#{dlat},#{dlon}"},
      {"mode", "drive"},
      {"traffic", "approximated"},
      {"apiKey", api_key()}
    ]

    case routing_get(params) do
      {:ok, %{"features" => [%{"properties" => props} | _]}} ->
        if is_number(props["distance"]) and is_number(props["time"]) do
          {:ok,
           %{
             "provider" => id(),
             "distance_m" => props["distance"] * 1.0,
             "duration_seconds" => props["time"] * 1.0,
             # We asked for the approximated model and the API has no
             # live feed: the honest class is "estimate", always.
             "traffic_model" => "approximated",
             "traffic_class" => "estimate",
             "live_traffic" => false,
             "attribution" => "Powered by Geoapify"
           }}
        else
          {:error, :no_route}
        end

      {:ok, %{"features" => []}} ->
        {:error, :no_route}

      {:ok, %{"message" => msg}} when is_binary(msg) ->
        {:error, {:provider, msg}}

      {:error, _} = err ->
        err

      other ->
        {:error, {:unexpected, other}}
    end
  end

  defp routing_get(params) do
    case Application.get_env(:opal_core, :geoapify_http_fun) do
      fun when is_function(fun, 2) ->
        case fun.(@routing_url, params) do
          {:ok, body} when is_map(body) -> {:ok, body}
          {:error, _} = err -> err
          other -> {:error, {:unexpected_transport_result, other}}
        end

      _ ->
        http_get(@routing_url, params)
    end
  end

  defp valid_pair?({lat, lon}) when is_number(lat) and is_number(lon),
    do: lat >= -90 and lat <= 90 and lon >= -180 and lon <= 180

  defp valid_pair?(_), do: false

  defp to_f(n) when is_number(n), do: n * 1.0

  defp to_f(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      _ -> nil
    end
  end

  defp to_f(_), do: nil

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

  defp exact_entity_mode?(q) do
    mode = q["search_mode"] || q["mode"]
    mode in ["exact_entity", "exact", :exact_entity] or
      (is_binary(q["requested_venue_name"]) and String.trim(q["requested_venue_name"]) != "")
  end

  defp find_exact_match([], _name, _locality), do: {:error, :not_found}

  defp find_exact_match([query | rest], name, locality) do
    case geocode_amenity_candidates(query) do
      {:ok, feats} ->
        case Enum.find_value(feats, &match_exact_feature(&1, name, locality)) do
          nil -> find_exact_match(rest, name, locality)
          candidate -> {:ok, candidate}
        end

      {:error, :not_found} ->
        find_exact_match(rest, name, locality)

      {:error, _} = err ->
        # Soft-fail individual query variants; only hard-fail credential/http after all.
        case find_exact_match(rest, name, locality) do
          {:ok, _} = ok -> ok
          {:error, :not_found} -> err
          other -> other
        end
    end
  end

  # Amenity/POI geocode — do NOT force type=city (that collapses venues to cities).
  defp geocode_amenity_candidates(text) when is_binary(text) and text != "" do
    params = [
      {"text", text},
      {"limit", "8"},
      {"apiKey", api_key()}
    ]

    case http_get(@geocode_url, params) do
      {:ok, %{"features" => feats}} when is_list(feats) and feats != [] ->
        {:ok, feats}

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

  defp geocode_amenity_candidates(_), do: {:error, :not_found}

  defp match_exact_feature(feat, requested_name, locality) when is_map(feat) do
    props = feat["properties"] || %{}
    result_name = props["name"] || props["address_line1"] || ""
    city = props["city"] || props["suburb"] || props["county"] || ""
    formatted = props["formatted"] || ""
    result_type = props["result_type"]

    name_ok? = name_matches?(requested_name, result_name)
    locality_ok? = locality == "" or locality_matches?(locality, city, formatted)
    # Prefer amenity/POI; allow unknown types when name+locality both match strongly.
    type_ok? =
      result_type in [nil, "amenity", "building", "street"] or
        (name_ok? and locality_ok? and result_type not in ["city", "state", "country", "postcode"])

    if name_ok? and locality_ok? and type_ok? and result_type != "city" do
      {lat, lon} = coords(feat, props)

      %{
        "id" => to_string(props["place_id"] || props["osm_id"] || :erlang.phash2(props)),
        "provider" => id(),
        "provider_place_id" => props["place_id"],
        "name" => result_name,
        "address" => formatted,
        "lat" => lat,
        "lon" => lon,
        "city" => city,
        "categories" => List.wrap(props["categories"] || props["category"]),
        "cuisine" => get_in(props, ["catering", "cuisine"]) || props["cuisine"],
        "website" => props["website"],
        "phone" => get_in(props, ["contact", "phone"]) || props["phone"],
        "opening_hours" => props["opening_hours"],
        "search_geography" => locality,
        "search_mode" => "exact_entity",
        "requested_venue_name" => requested_name,
        "requested_venue_locality" => locality,
        "exact_match" => true,
        "real" => true,
        "synthetic" => false,
        "fixture" => false,
        "live" => true,
        "rating" => nil,
        "rating_available" => false,
        "reservation_support" => false,
        "booking_capability" => false,
        "provider_is_not_authority" => true,
        "raw_provenance" => %{
          "datasource" => props["datasource"],
          "place_id" => props["place_id"],
          "result_type" => result_type,
          "formatted" => formatted
        }
      }
    else
      nil
    end
  end

  defp match_exact_feature(_, _, _), do: nil

  defp name_matches?(requested, actual) when is_binary(requested) and is_binary(actual) do
    a = normalize_name(requested)
    b = normalize_name(actual)

    cond do
      a == "" or b == "" -> false
      a == b -> true
      String.contains?(b, a) or String.contains?(a, b) -> true
      # Compact form: "nighthawk" vs "night hawk"
      String.replace(a, " ", "") == String.replace(b, " ", "") -> true
      true -> false
    end
  end

  defp name_matches?(_, _), do: false

  defp locality_matches?(locality, city, formatted)
       when is_binary(locality) and is_binary(city) and is_binary(formatted) do
    loc = normalize_name(locality)

    cond do
      loc == "" -> true
      String.contains?(normalize_name(city), loc) -> true
      String.contains?(normalize_name(formatted), loc) -> true
      true -> false
    end
  end

  defp locality_matches?(_, _, _), do: false

  defp normalize_name(s) when is_binary(s) do
    s
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9\s]/, " ")
    |> String.replace(~r/\s+/, " ")
    |> String.trim()
  end

  defp normalize_name(_), do: ""

  # Person-agnostic spelling variants — no venue hardcodes.
  defp name_variants(name) when is_binary(name) do
    base = String.trim(name)
    compact = String.replace(base, ~r/\s+/, "")
    # Insert spaces before internal capitals: NightHawk → Night Hawk
    spaced_caps =
      Regex.replace(~r/([a-z])([A-Z])/, base, "\\1 \\2")
      |> String.trim()

    # Split glued lowercase tokens of length >= 8 into likely two words mid-point heuristic
    # only when no spaces present (e.g. nighthawk → night hawk via common prefix split).
    soft_split =
      if String.contains?(base, " ") do
        nil
      else
        soft_space_split(base)
      end

    [base, compact, spaced_caps, soft_split]
    |> Enum.reject(&is_nil/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
  end

  defp name_variants(_), do: []

  defp soft_space_split(word) when is_binary(word) do
    down = String.downcase(word)
    # Common English venue-word prefixes — generic, not venue-specific.
    prefixes = ~w(night day blue red old new grand little big casa la el the)

    Enum.find_value(prefixes, fn p ->
      if String.starts_with?(down, p) and String.length(down) > String.length(p) + 2 do
        {prefix, rest} = String.split_at(word, String.length(p))
        "#{prefix} #{rest}"
      else
        nil
      end
    end)
  end

  defp soft_space_split(_), do: nil

  defp locality_queries(""), do: [""]
  defp locality_queries(nil), do: [""]

  defp locality_queries(locality) when is_binary(locality) do
    loc = String.trim(locality)
    # Prefer locality alone; also try with CA/USA when US-looking single token.
    extras =
      if Regex.match?(~r/^[A-Za-z][A-Za-z\s']{1,40}$/, loc) and not String.contains?(loc, ",") do
        ["#{loc}, CA", "#{loc}, California"]
      else
        []
      end

    [loc | extras] |> Enum.uniq()
  end

  defp locality_queries(_), do: [""]

  defp trim_bin(s) when is_binary(s), do: String.trim(s)
  defp trim_bin(_), do: ""

  defp do_places_search(q, dest) do
    # Fetch a wider pool then quality-filter to named venues. City place: filters
    # often return unnamed street POIs; circle + larger limit yields named restaurants.
    want = min(to_i(q["limit"] || q["max_candidates"] || 5), 8)
    fetch = min(max(want * 4, 20), 50)
    categories = q["categories"] || cuisine_categories(q["cuisine"]) || "catering.restaurant"
    radius = min(to_i(q["radius_m"] || 8_000), 25_000)
    cuisine = trim_bin(q["cuisine"])

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
          |> prefer_cuisine(cuisine)
          |> Enum.take(want)

        cond do
          length(cands) >= max(div(want, 2), 1) ->
            {:ok, cands}

          cuisine != "" and categories != "catering.restaurant" ->
            # Cuisine category thin — widen then fall back to general restaurants
            # filtered by cuisine evidence rather than inventing matches.
            case retry_radius(q, dest, want, categories, min(radius * 2, 20_000)) do
              {:ok, widened} when length(widened) >= 1 ->
                {:ok, prefer_cuisine(widened, cuisine) |> Enum.take(want)}

              _ ->
                fallback_cuisine_filter(q, dest, want, cuisine, radius)
            end

          true ->
            retry_radius(q, dest, want, categories, min(radius * 2, 20_000))
        end

      {:ok, %{"message" => msg}} when is_binary(msg) ->
        {:error, {:provider, msg}}

      {:error, _} = err ->
        err

      other ->
        {:error, {:unexpected, other}}
    end
  end

  defp cuisine_categories(cuisine) when is_binary(cuisine) and cuisine != "" do
    slug =
      cuisine
      |> String.trim()
      |> String.downcase()
      |> String.replace(~r/[^a-z0-9]+/, "_")
      |> String.trim("_")

    if slug == "", do: nil, else: "catering.restaurant.#{slug}"
  end

  defp cuisine_categories(_), do: nil

  defp prefer_cuisine(cands, "") when is_list(cands), do: cands

  defp prefer_cuisine(cands, cuisine) when is_list(cands) and is_binary(cuisine) do
    needle = String.downcase(cuisine)

    {matched, rest} =
      Enum.split_with(cands, fn c ->
        cuisine_match?(c, needle)
      end)

    matched ++ rest
  end

  defp prefer_cuisine(cands, _), do: cands

  defp cuisine_match?(c, needle) when is_map(c) and is_binary(needle) do
    hay =
      [
        c["cuisine"],
        Enum.join(List.wrap(c["categories"]), " ")
      ]
      |> Enum.reject(&is_nil/1)
      |> Enum.join(" ")
      |> String.downcase()

    String.contains?(hay, needle)
  end

  defp cuisine_match?(_, _), do: false

  defp fallback_cuisine_filter(q, dest, want, cuisine, radius) do
    case retry_radius(
           Map.put(q, "categories", "catering.restaurant"),
           dest,
           max(want * 3, 12),
           "catering.restaurant",
           radius
         ) do
      {:ok, cands} ->
        matched = Enum.filter(cands, &cuisine_match?(&1, String.downcase(cuisine)))

        # Honest: only return cuisine-evidenced matches; never pad with unrelated.
        {:ok, Enum.take(matched, want)}

      other ->
        other
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

  defp http_get(url, params), do: http_get(url, params, 0)

  defp http_get(url, params, attempt) do
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

      {:error, %Req.TransportError{reason: reason}} = err
      when reason in [:closed, :timeout, :econnrefused, :nxdomain] and attempt < 1 ->
        Process.sleep(250)
        http_get(url, params, attempt + 1)

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
