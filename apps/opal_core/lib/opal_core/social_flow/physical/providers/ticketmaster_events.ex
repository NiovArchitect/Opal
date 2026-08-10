defmodule OpalCore.SocialFlow.Physical.Providers.TicketmasterEvents do
  @moduledoc """
  Thin Ticketmaster Discovery API adapter — events WHAT EXISTS only.

  No event feed UI. No auto-purchase. Inventory claims only when provider
  fields are authoritative and fresh.

  Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
  Credential: TICKETMASTER_API_KEY
  """

  alias OpalCore.SocialFlow.Physical.Providers.{Metrics, Mode, PayloadSanitize}

  @base "https://app.ticketmaster.com/discovery/v2/events.json"

  def source_id, do: "ticketmaster_discovery"
  def cost_tier, do: "medium"

  def http_client do
    Application.get_env(:opal_core, :ticketmaster_http_client, __MODULE__.HTTP)
  end

  def fetch_candidates(query) when is_map(query) do
    q = stringify(query)
    mode = Mode.resolve(:events)

    cond do
      mode["mode"] == "disabled" ->
        Metrics.emit("provider.query_avoided", family: "events")
        {:error, :disabled}

      mode["mode"] == "synthetic" ->
        Metrics.emit("provider.query_avoided", family: "events")
        {:error, :synthetic_mode_use_fixture}

      Mode.events_key() in [nil, ""] ->
        Metrics.emit("provider.error", family: "events")
        {:error, :missing_credential}

      true ->
        do_search(q, mode)
    end
  end

  def fetch_candidates(_), do: {:error, :invalid}

  defp do_search(q, mode) do
    Metrics.emit("provider.query_started", family: "events")

    params =
      %{
        "apikey" => Mode.events_key(),
        "size" => min(to_i(q["max_result_count"] || 10), 20),
        "sort" => "date,asc"
      }
      |> maybe_put("city", city_from(q))
      |> maybe_put("keyword", q["keyword"] || category_keyword(q))
      |> maybe_put("startDateTime", q["start_iso"] || q["startDateTime"])
      |> maybe_put("endDateTime", q["end_iso"] || q["endDateTime"])
      |> maybe_put_latlong(q)
      |> maybe_put("radius", q["radius_miles"] || "25")
      |> maybe_put("unit", "miles")

    case http_client().get_json(@base, params) do
      {:ok, payload} ->
        events =
          get_in(payload, ["_embedded", "events"])
          |> List.wrap()
          |> Enum.take(to_i(q["max_result_count"] || 10))
          |> Enum.map(&normalize_event(&1, q))
          |> Enum.reject(&is_nil/1)
          |> Enum.reject(&expired?/1)

        Metrics.emit("provider.query_completed", family: "events")
        Metrics.emit("provider.result_admitted", family: "events")

        {:ok,
         %{
           "candidates" => events,
           "mode" => mode["mode"],
           "source" => source_id(),
           "real" => true,
           "synthetic" => false,
           "provider_is_not_authority" => true,
           "does_not_auto_purchase" => true
         }}

      {:error, _} = err ->
        Metrics.emit("provider.error", family: "events")
        err
    end
  end

  @doc "Normalize Ticketmaster event → candidate shape."
  def normalize_event(event, query \\ %{})

  def normalize_event(event, query) when is_map(event) do
    e = stringify(event)
    q = stringify(query)
    id = PayloadSanitize.string(e["id"])
    name = PayloadSanitize.string(e["name"])
    dates = e["dates"] || %{}
    start = get_in(dates, ["start", "dateTime"]) || get_in(dates, ["start", "localDate"])
    end_t = get_in(dates, ["end", "dateTime"])
    venue = List.first(List.wrap(get_in(e, ["_embedded", "venues"]))) || %{}
    venue = stringify(venue)
    loc = venue["location"] || %{}
    status = get_in(dates, ["status", "code"])

    if id in [nil, ""] or name in [nil, ""] do
      nil
    else
      ticket_url = PayloadSanitize.safe_url(e["url"])
      # Discovery may expose price ranges — exact inventory still not "booked"
      price_ranges = List.wrap(e["priceRanges"])
      has_price = price_ranges != []

      %{
        "id" => id,
        "provider_place_id" => id,
        "name" => name,
        "display_name" => name,
        "categories" => ["event" | classifications(e)] |> Enum.uniq() |> Enum.take(5),
        "type" => "event",
        "area_label" =>
          PayloadSanitize.string(venue["city"]["name"] || venue["name"]) || q["area_label"],
        "coordinates" => PayloadSanitize.latlng(loc["latitude"], loc["longitude"]),
        "event_start" => PayloadSanitize.datetime(start) || start,
        "event_end" => PayloadSanitize.datetime(end_t) || end_t,
        "open_now" => true,
        "open_at_plan_time" => status not in ["cancelled", "offsale"],
        "event_ended" => false,
        "ticket_support" => is_binary(ticket_url),
        "ticket_url" => ticket_url,
        "price_level" => if(has_price, do: price_indication(price_ranges)),
        "inventory" => inventory_from_status(status),
        "reservation_support" => false,
        "provider_freshness" => "live_metadata",
        "live" => status in ["onsale"],
        "real" => true,
        "synthetic" => false,
        "source" => source_id(),
        "raw_provider_schema" => false,
        # Do not claim slot-level availability without dedicated inventory API
        "does_not_claim_specific_seat" => true
      }
    end
  end

  def normalize_event(_, _), do: nil

  defp inventory_from_status("onsale"), do: "available"
  defp inventory_from_status("offsale"), do: "unknown"
  defp inventory_from_status("cancelled"), do: "unknown"
  defp inventory_from_status(_), do: "unknown"

  defp price_indication([%{"min" => min, "max" => max} | _]) when is_number(min) do
    cond do
      max && max <= 30 -> "$"
      max && max <= 75 -> "$$"
      max && max <= 150 -> "$$$"
      true -> "$$$$"
    end
  end

  defp price_indication(_), do: nil

  defp classifications(e) do
    List.wrap(e["classifications"])
    |> Enum.flat_map(fn c ->
      c = stringify(c)

      [
        get_in(c, ["segment", "name"]),
        get_in(c, ["genre", "name"])
      ]
    end)
    |> Enum.map(&PayloadSanitize.string/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.map(&String.downcase/1)
  end

  defp expired?(c) do
    case c["event_start"] do
      %DateTime{} = dt -> DateTime.compare(dt, DateTime.utc_now()) == :lt
      _ -> c["event_ended"] == true
    end
  end

  defp city_from(q) do
    area = q["area_label"] || q["primary_area"] || q["city"]
    if is_binary(area), do: area, else: nil
  end

  defp category_keyword(q) do
    case q["category"] || q["experience_type"] do
      "concert" -> "concert"
      "sports" -> "sports"
      "music" -> "music"
      "event" -> nil
      other when is_binary(other) -> other
      _ -> nil
    end
  end

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, _k, ""), do: map
  defp maybe_put(map, k, v), do: Map.put(map, k, v)

  defp maybe_put_latlong(map, q) do
    lat = PayloadSanitize.number(q["lat"])
    lng = PayloadSanitize.number(q["lng"])

    if is_number(lat) and is_number(lng) do
      Map.put(map, "latlong", "#{lat},#{lng}")
    else
      map
    end
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

  defmodule HTTP do
    @moduledoc false

    def get_json(url, params) when is_map(params) do
      qs =
        params
        |> Enum.map(fn {k, v} ->
          URI.encode_www_form(to_string(k)) <> "=" <> URI.encode_www_form(to_string(v))
        end)
        |> Enum.join("&")

      full = url <> "?" <> qs

      case :httpc.request(:get, {String.to_charlist(full), []}, [{:timeout, 8_000}], [
             {:body_format, :binary}
           ]) do
        {:ok, {{_, 200, _}, _, resp}} ->
          Jason.decode(resp)

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
