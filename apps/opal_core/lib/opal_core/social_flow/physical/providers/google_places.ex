defmodule OpalCore.SocialFlow.Physical.Providers.GooglePlaces do
  @moduledoc """
  Thin Google Places API (New) adapter — WHAT EXISTS only.

  Implements OpportunitySource-shaped fetch.
  Does not rank, Set, book, or invent live inventory from ratings.

  Docs: Places API Nearby Search (New)
  https://developers.google.com/maps/documentation/places/web-service/nearby-search

  Credential: GOOGLE_PLACES_API_KEY (server-side only).
  Mode: Mode.resolve(:places)
  """

  alias OpalCore.SocialFlow.Physical.Providers.{Metrics, Mode, PayloadSanitize}

  @nearby_url "https://places.googleapis.com/v1/places:searchNearby"
  # Essentials/Pro field mask — opening hours + price level, not reviews dump
  @field_mask Enum.join(
                [
                  "places.id",
                  "places.displayName",
                  "places.types",
                  "places.formattedAddress",
                  "places.location",
                  "places.priceLevel",
                  "places.rating",
                  "places.userRatingCount",
                  "places.currentOpeningHours",
                  "places.regularOpeningHours",
                  "places.businessStatus"
                ],
                ","
              )

  def source_id, do: "google_places"
  def cost_tier, do: "medium"

  def http_client do
    Application.get_env(:opal_core, :google_places_http_client, __MODULE__.HTTP)
  end

  @doc """
  Search nearby places. opts/query map:

  - lat, lng OR area_label (geocode not implemented — lat/lng preferred)
  - category / included_types
  - radius_m (default 3000)
  - max_result_count (default 10)
  """
  def fetch_candidates(query) when is_map(query) do
    q = stringify(query)
    mode = Mode.resolve(:places)

    cond do
      mode["mode"] == "disabled" ->
        Metrics.emit("provider.query_avoided", family: "places")
        {:error, :disabled}

      mode["mode"] == "synthetic" ->
        Metrics.emit("provider.query_avoided", family: "places")
        {:error, :synthetic_mode_use_fixture}

      Mode.places_key() in [nil, ""] ->
        Metrics.emit("provider.error", family: "places")
        {:error, :missing_credential}

      true ->
        do_nearby(q, mode)
    end
  end

  def fetch_candidates(_), do: {:error, :invalid}

  defp do_nearby(q, mode) do
    Metrics.emit("provider.query_started", family: "places")

    with {:ok, location} <- resolve_location(q),
         body <- nearby_body(q, location),
         {:ok, payload} <-
           http_client().post_json(@nearby_url, body,
             api_key: Mode.places_key(),
             field_mask: @field_mask
           ) do
      places =
        payload
        |> Map.get("places", [])
        |> List.wrap()
        |> Enum.take(to_i(q["max_result_count"] || q["max_candidates"] || 10))
        |> Enum.map(&normalize_place(&1, q))
        |> Enum.reject(&is_nil/1)

      Metrics.emit("provider.query_completed", family: "places")
      Metrics.emit("provider.result_admitted", family: "places")

      {:ok,
       %{
         "candidates" => places,
         "mode" => mode["mode"],
         "source" => source_id(),
         "real" => true,
         "live" => false,
         "synthetic" => false,
         "provider_is_not_authority" => true,
         "inventory_unknown" => true,
         "does_not_claim_availability_slots" => true
       }}
    else
      {:error, _reason} = err ->
        Metrics.emit("provider.error", family: "places")
        err
    end
  end

  defp resolve_location(q) do
    lat = PayloadSanitize.number(q["lat"] || q["latitude"])
    lng = PayloadSanitize.number(q["lng"] || q["longitude"])

    cond do
      is_number(lat) and is_number(lng) ->
        {:ok, %{"lat" => lat, "lng" => lng}}

      match?(%{"lat" => _, "lng" => _}, q["coordinates"]) ->
        {:ok, q["coordinates"]}

      # Known area fixtures for demos without geocoding dependency
      is_binary(q["area_label"]) ->
        case area_centroid(q["area_label"]) do
          nil -> {:error, :location_required}
          c -> {:ok, c}
        end

      true ->
        {:error, :location_required}
    end
  end

  # Minimal geocode table for tests / known Opal zones — not a geocoder product
  defp area_centroid(area) do
    case String.downcase(area) do
      "carlsbad" -> %{"lat" => 33.1581, "lng" => -117.3506}
      "downtown" -> %{"lat" => 32.7157, "lng" => -117.1611}
      "san diego" -> %{"lat" => 32.7157, "lng" => -117.1611}
      _ -> nil
    end
  end

  defp nearby_body(q, location) do
    types = included_types(q)

    %{
      "maxResultCount" => min(to_i(q["max_result_count"] || 10), 20),
      "locationRestriction" => %{
        "circle" => %{
          "center" => %{
            "latitude" => location["lat"],
            "longitude" => location["lng"]
          },
          "radius" => min(to_f(q["radius_m"] || 3000), 50_000.0)
        }
      }
    }
    |> then(fn body ->
      if types == [], do: body, else: Map.put(body, "includedTypes", types)
    end)
  end

  defp included_types(q) do
    cat = q["category"] || q["experience_type"] || ""

    case String.downcase(to_string(cat)) do
      "dinner" -> ["restaurant"]
      "restaurant" -> ["restaurant"]
      "coffee" -> ["cafe"]
      "drinks" -> ["bar"]
      "park" -> ["park"]
      "museum" -> ["museum"]
      _ -> []
    end
  end

  @doc "Normalize Google place resource → OpportunitySource candidate shape."
  def normalize_place(place, query \\ %{})

  def normalize_place(place, query) when is_map(place) do
    p = stringify(place)
    q = stringify(query)
    name = get_in(p, ["displayName", "text"]) || p["displayName"] || p["name"]
    loc = p["location"] || %{}
    hours = p["currentOpeningHours"] || p["regularOpeningHours"] || %{}
    open_now = PayloadSanitize.bool(hours["openNow"])

    id =
      case PayloadSanitize.string(p["id"] || p["name"]) do
        "places/" <> rest -> rest
        other -> other
      end

    if id in [nil, ""] or name in [nil, ""] do
      nil
    else
      %{
        "id" => id,
        "provider_place_id" => id,
        "name" => PayloadSanitize.string(name),
        "display_name" => PayloadSanitize.string(name),
        "categories" => types_to_categories(List.wrap(p["types"])),
        "area_label" => q["area_label"] || q["primary_area"],
        "coordinates" =>
          PayloadSanitize.latlng(loc["latitude"] || loc["lat"], loc["longitude"] || loc["lng"]),
        "open_now" => open_now != false,
        "open_at_plan_time" => open_now != false,
        "opening_hours" => sanitize_hours(hours),
        "price_level" => price_level(p["priceLevel"]),
        "rating" => PayloadSanitize.number(p["rating"]),
        "review_count" => trunc(PayloadSanitize.number(p["userRatingCount"]) || 0),
        "business_status" => PayloadSanitize.string(p["businessStatus"]),
        "reservation_support" => false,
        "provider_freshness" => "live_metadata",
        "live" => false,
        "real" => true,
        "synthetic" => false,
        "source" => source_id(),
        # Static rating is popularity_signal only — not activity_signal / heat
        "inventory" => "unknown",
        "raw_provider_schema" => false
      }
    end
  end

  def normalize_place(_, _), do: nil

  defp sanitize_hours(hours) when is_map(hours) do
    %{
      "open_now" => PayloadSanitize.bool(hours["openNow"]),
      "weekday_descriptions" =>
        List.wrap(hours["weekdayDescriptions"])
        |> Enum.map(&PayloadSanitize.string/1)
        |> Enum.reject(&is_nil/1)
        |> Enum.take(7)
    }
  end

  defp sanitize_hours(_), do: nil

  defp price_level("PRICE_LEVEL_FREE"), do: "$"
  defp price_level("PRICE_LEVEL_INEXPENSIVE"), do: "$"
  defp price_level("PRICE_LEVEL_MODERATE"), do: "$$"
  defp price_level("PRICE_LEVEL_EXPENSIVE"), do: "$$$"
  defp price_level("PRICE_LEVEL_VERY_EXPENSIVE"), do: "$$$$"
  defp price_level(_), do: nil

  defp types_to_categories(types) do
    mapped =
      Enum.flat_map(types, fn t ->
        case t do
          "restaurant" -> ["dinner", "restaurant"]
          "cafe" -> ["coffee"]
          "bar" -> ["drinks"]
          "park" -> ["park", "outdoor"]
          "museum" -> ["museum"]
          other when is_binary(other) -> [other]
          _ -> []
        end
      end)

    if mapped == [], do: ["place"], else: Enum.uniq(mapped) |> Enum.take(5)
  end

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 10

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 3000.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defmodule HTTP do
    @moduledoc false

    def post_json(url, body, opts) do
      api_key = Keyword.fetch!(opts, :api_key)
      field_mask = Keyword.get(opts, :field_mask, "")
      json = Jason.encode!(body)

      headers = [
        {"content-type", "application/json"},
        {"x-goog-api-key", api_key},
        {"x-goog-fieldmask", field_mask}
      ]

      request =
        {String.to_charlist(url),
         Enum.map(headers, fn {k, v} -> {String.to_charlist(k), String.to_charlist(v)} end),
         ~c"application/json", json}

      case :httpc.request(:post, request, [{:timeout, 8_000}], [{:body_format, :binary}]) do
        {:ok, {{_, 200, _}, _, resp}} ->
          Jason.decode(resp)

        {:ok, {{_, code, _}, _, resp}} when code in 400..499 ->
          {:error, {:http, code, resp}}

        {:ok, {{_, code, _}, _, _}} ->
          {:error, {:http, code}}

        {:error, _} ->
          {:error, :http_error}
      end
    rescue
      e -> {:error, {:exception, Exception.message(e)}}
    end
  end
end
