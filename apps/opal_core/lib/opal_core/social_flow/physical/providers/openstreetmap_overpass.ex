defmodule OpalCore.SocialFlow.Physical.Providers.OpenStreetMapOverpass do
  @moduledoc """
  OpenStreetMap Overpass REAL_EXTERNAL place discovery adapter.

  Public API — no paid key. Discovery + optional opening_hours tags only.
  Does not claim booking inventory or verified open_now without careful parse.
  """

  alias OpalCore.SocialFlow.Physical.Providers.{Metrics, Mode, PayloadSanitize}

  @default_url "https://overpass-api.de/api/interpreter"
  @user_agent "OpalGraph/P4.5"
  @default_amenities ~w(restaurant cafe bar)
  @timeout_ms 20_000

  def source_id, do: "openstreetmap_overpass"
  def cost_tier, do: "free_public"

  def http_client do
    Application.get_env(:opal_core, :openstreetmap_overpass_http_client, __MODULE__)
  end

  def overpass_url do
    Application.get_env(:opal_core, :openstreetmap_overpass_url) ||
      System.get_env("OPAL_OVERPASS_URL") ||
      @default_url
  end

  @doc """
  Search nearby amenities via Overpass.

  Requires lat/lng (or coordinates). area_label alone → `{:error, :geocode_required}`.
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

      true ->
        do_overpass(q, mode)
    end
  end

  def fetch_candidates(_), do: {:error, :invalid}

  defp do_overpass(q, mode) do
    Metrics.emit("provider.query_started", family: "places")

    with {:ok, location} <- resolve_location(q),
         ql <- build_query(q, location),
         {:ok, payload} <- http_client().post_form(overpass_url(), ql, timeout: @timeout_ms) do
      max_n = min(to_i(q["max_result_count"] || q["max_candidates"] || 10), 10)

      places =
        payload
        |> Map.get("elements", [])
        |> List.wrap()
        |> Enum.map(&normalize_element(&1, q))
        |> Enum.reject(&is_nil/1)
        |> Enum.take(max_n)

      Metrics.emit("provider.query_completed", family: "places")
      Metrics.emit("provider.result_admitted", family: "places")

      {:ok,
       %{
         "candidates" => places,
         "mode" => mode["mode"],
         "source" => source_id(),
         "real" => true,
         "live" => true,
         "synthetic" => false,
         "candidate_source_class" => "real_external",
         "provider_freshness" => "live_query",
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
    coords = q["coordinates"]

    cond do
      is_number(lat) and is_number(lng) ->
        {:ok, %{"lat" => lat, "lng" => lng}}

      is_map(coords) ->
        clat = PayloadSanitize.number(coords["lat"] || coords[:lat])
        clng = PayloadSanitize.number(coords["lng"] || coords[:lng])

        if is_number(clat) and is_number(clng) do
          {:ok, %{"lat" => clat, "lng" => clng}}
        else
          {:error, :location_required}
        end

      is_binary(q["area_label"]) and q["area_label"] != "" ->
        {:error, :geocode_required}

      true ->
        {:error, :location_required}
    end
  end

  defp build_query(q, location) do
    amenities = amenities(q)
    radius = min(to_i(q["radius_m"] || 1500), 5_000)
    lat = location["lat"]
    lng = location["lng"]
    regex = Enum.join(amenities, "|")

    # Bounded radius query; out center for ways/relations; limit via caller take
    """
    [out:json][timeout:20];
    (
      node["amenity"~"#{regex}"](around:#{radius},#{lat},#{lng});
      way["amenity"~"#{regex}"](around:#{radius},#{lat},#{lng});
    );
    out center tags #{min(to_i(q["max_result_count"] || 10), 10)};
    """
    |> String.trim()
  end

  defp amenities(q) do
    case q["amenities"] || q["amenity"] do
      list when is_list(list) and list != [] ->
        Enum.map(list, &to_string/1)

      bin when is_binary(bin) and bin != "" ->
        bin |> String.split([",", "|"], trim: true) |> Enum.reject(&(&1 == ""))

      _ ->
        case String.downcase(to_string(q["category"] || q["experience_type"] || "")) do
          "dinner" -> ["restaurant"]
          "restaurant" -> ["restaurant"]
          "coffee" -> ["cafe"]
          "drinks" -> ["bar"]
          _ -> @default_amenities
        end
    end
  end

  @doc "Normalize Overpass element → CandidateSource-shaped map."
  def normalize_element(el, query \\ %{})

  def normalize_element(el, query) when is_map(el) do
    e = stringify(el)
    q = stringify(query)
    tags = stringify(e["tags"] || %{})
    name = PayloadSanitize.string(tags["name"] || tags["brand"])
    id = e["id"]
    typ = e["type"] || "node"

    {lat, lng} = element_latlng(e)

    if is_nil(name) or name == "" or is_nil(id) do
      nil
    else
      place_id = "osm_#{typ}_#{id}"
      hours_hint = PayloadSanitize.string(tags["opening_hours"])

      %{
        "id" => place_id,
        "provider_place_id" => place_id,
        "name" => name,
        "display_name" => name,
        "categories" => amenity_categories(tags["amenity"]),
        "area_label" => q["area_label"] || q["primary_area"],
        "coordinates" => PayloadSanitize.latlng(lat, lng),
        # Soft admit for filters; not a verified open_now claim
        "open_now" => true,
        "open_at_plan_time" => true,
        "open_now_verified" => false,
        "open_now_unknown" => true,
        "opening_hours" =>
          if(hours_hint, do: %{"hint" => hours_hint, "verified" => false}, else: nil),
        "opening_hours_hint" => hours_hint,
        "price_level" => nil,
        "rating" => nil,
        "review_count" => 0,
        "reservation_support" => false,
        "provider_freshness" => "live_query",
        "candidate_source_class" => "real_external",
        "live" => true,
        "real" => true,
        "synthetic" => false,
        "source" => source_id(),
        "inventory" => "unknown",
        "inventory_unknown" => true,
        "does_not_claim_availability_slots" => true,
        "raw_provider_schema" => false
      }
    end
  end

  def normalize_element(_, _), do: nil

  defp element_latlng(e) do
    cond do
      is_number(e["lat"]) and is_number(e["lon"]) ->
        {e["lat"], e["lon"]}

      is_map(e["center"]) ->
        c = stringify(e["center"])
        {PayloadSanitize.number(c["lat"]), PayloadSanitize.number(c["lon"])}

      true ->
        {nil, nil}
    end
  end

  defp amenity_categories(amenity) do
    case amenity do
      "restaurant" -> ["dinner", "restaurant"]
      "cafe" -> ["coffee", "cafe"]
      "bar" -> ["drinks", "bar"]
      other when is_binary(other) -> [other]
      _ -> ["place"]
    end
  end

  @doc "Default HTTP: POST Overpass `data=` form via Req."
  def post_form(url, query_ql, opts \\ []) do
    timeout = Keyword.get(opts, :timeout, @timeout_ms)
    body = URI.encode_query(%{"data" => query_ql})

    case Req.post(url,
           body: body,
           headers: [
             {"user-agent", @user_agent},
             {"content-type", "application/x-www-form-urlencoded"}
           ],
           receive_timeout: timeout,
           connect_options: [timeout: timeout]
         ) do
      {:ok, %{status: 200, body: body}} when is_map(body) ->
        {:ok, body}

      {:ok, %{status: 200, body: body}} when is_binary(body) ->
        Jason.decode(body)

      {:ok, %{status: code}} when code in 400..499 ->
        {:error, {:http, code}}

      {:ok, %{status: code}} ->
        {:error, {:http, code}}

      {:error, reason} ->
        {:error, {:http_error, reason}}
    end
  rescue
    e -> {:error, {:exception, Exception.message(e)}}
  end

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 10

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
