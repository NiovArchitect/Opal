defmodule OpalCore.Places do
  @moduledoc """
  Product Places facade (Paste G Phase 2).

  Wraps existing `GooglePlaces` nearby + text search and adds Place Details.
  Also keeps VenueLookup delegates for trip-curation spikes.

  Gates on `GOOGLE_PLACES_API_KEY`. Demo/fixture venues are only returned when
  the caller explicitly opts into `demo_fallback: true` and are always labeled
  `source: "demo_fixture"` — never silently mixed as live results.
  """

  require Logger

  alias OpalCore.Places.VenueLookup
  alias OpalCore.SocialFlow.Physical.Providers.{GooglePlaces, Mode}

  @details_base "https://places.googleapis.com/v1/places/"
  @details_mask Enum.join(
                  [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location",
                    "types",
                    "priceLevel",
                    "rating",
                    "userRatingCount",
                    "currentOpeningHours",
                    "regularOpeningHours",
                    "businessStatus",
                    "nationalPhoneNumber",
                    "internationalPhoneNumber",
                    "websiteUri",
                    "addressComponents"
                  ],
                  ","
                )

  @doc "Nearby search via GooglePlaces. Returns {:disabled,_} without key."
  def nearby(query) when is_map(query) do
    case require_key() do
      {:ok, _} ->
        case GooglePlaces.fetch_candidates(query) do
          {:ok, payload} -> {:ok, Map.put(payload, "facade", "OpalCore.Places")}
          {:error, :missing_credential} -> {:disabled, "GOOGLE_PLACES_API_KEY missing"}
          {:error, :disabled} -> {:disabled, "places provider disabled"}
          {:error, :synthetic_mode_use_fixture} -> {:disabled, "places in synthetic mode"}
          other -> other
        end

      {:disabled, _} = d ->
        d
    end
  end

  def nearby(_), do: {:error, :invalid}

  @doc "Text search via GooglePlaces. Returns {:disabled,_} without key."
  def search_text(query) when is_map(query) do
    case require_key() do
      {:ok, _} ->
        case GooglePlaces.search_text(query) do
          {:ok, payload} -> {:ok, Map.put(payload, "facade", "OpalCore.Places")}
          {:error, :missing_credential} -> {:disabled, "GOOGLE_PLACES_API_KEY missing"}
          {:error, :disabled} -> {:disabled, "places provider disabled"}
          other -> other
        end

      {:disabled, _} = d ->
        d
    end
  end

  def search_text(query) when is_binary(query) do
    search_text(%{"text_query" => query})
  end

  def search_text(_), do: {:error, :invalid}

  @doc "Delegate city+cuisine text search to VenueLookup (existing spike)."
  def search(city, cuisine_or_vibe), do: VenueLookup.search(city, cuisine_or_vibe)

  @doc "Search or demo fixture — existing VenueLookup path (explicit demo label)."
  def search_or_demo(city, cuisine_or_vibe), do: VenueLookup.search_or_demo(city, cuisine_or_vibe)

  @doc """
  Place Details (New) by place id. Never invents a place or phone number.
  """
  def get_details(place_id, opts \\ [])

  def get_details(place_id, opts) when is_binary(place_id) do
    id = place_id |> String.trim() |> strip_places_prefix()

    cond do
      id == "" ->
        {:error, :invalid_place_id}

      true ->
        key = Keyword.get(opts, :api_key)

        with {:ok, resolved_key} <- if(is_binary(key) and key != "", do: {:ok, key}, else: require_key()) do
          do_get_details(id, resolved_key, opts)
        end
    end
  end

  def get_details(_, _), do: {:error, :invalid_place_id}

  @doc """
  Resolve venues for a city + cuisine/vibe.

  Live Google path when keyed. With `demo_fallback: true` and no key, returns
  clearly labeled `demo_fixture` venues (never mixed into live results).
  """
  def resolve_venues(city, cuisine_or_vibe, opts \\ [])

  def resolve_venues(city, cuisine_or_vibe, opts)
      when is_binary(city) and is_binary(cuisine_or_vibe) do
    demo? = Keyword.get(opts, :demo_fallback, false)

    case search_text(%{
           "text_query" => String.trim("#{cuisine_or_vibe} in #{city}"),
           "max_result_count" => 5
         }) do
      {:ok, %{"candidates" => candidates}} when is_list(candidates) and candidates != [] ->
        {:ok, Enum.map(candidates, &candidate_to_venue/1), :live}

      {:ok, _} ->
        if demo?,
          do: {:ok, VenueLookup.demo_venues("#{city}, #{cuisine_or_vibe}"), :demo},
          else: {:ok, [], :live}

      {:disabled, _} = d ->
        if demo? do
          {:ok, VenueLookup.demo_venues("#{city}, #{cuisine_or_vibe}"), :demo}
        else
          d
        end

      {:error, _} = err ->
        err
    end
  end

  def resolve_venues(_, _, _), do: {:error, :invalid}

  defp do_get_details(id, key, opts) do
    url = @details_base <> URI.encode(id)

    case http_client().get_json(url,
           api_key: key,
           field_mask: Keyword.get(opts, :field_mask, @details_mask)
         ) do
      {:ok, place} when is_map(place) ->
        case GooglePlaces.normalize_place(place, %{}) do
          nil ->
            # Still return phone/address-shaped details even if normalize misses
            {:ok, normalize_details_fallback(place)}

          normalized ->
            Logger.info("places.details place_id=#{id}")

            {:ok,
             normalized
             |> Map.put("phone", place["nationalPhoneNumber"] || place["internationalPhoneNumber"])
             |> Map.put("international_phone", place["internationalPhoneNumber"])
             |> Map.put("website", place["websiteUri"])
             |> Map.put("formatted_address", place["formattedAddress"] || normalized["address"])
             |> Map.put("place_id", id)
             |> Map.put("source", "google_places")
             |> Map.put("live", true)}
        end

      {:error, _} = err ->
        err
    end
  end

  defp normalize_details_fallback(body) when is_map(body) do
    name = get_in(body, ["displayName", "text"]) || body["name"]

    %{
      "place_id" => body["id"],
      "name" => name,
      "formatted_address" => body["formattedAddress"],
      "phone" => body["nationalPhoneNumber"] || body["internationalPhoneNumber"],
      "international_phone" => body["internationalPhoneNumber"],
      "website" => body["websiteUri"],
      "types" => List.wrap(body["types"]),
      "business_status" => body["businessStatus"],
      "source" => "google_places",
      "live" => true
    }
  end

  defp candidate_to_venue(c) when is_map(c) do
    %{
      name: c["name"] || c["display_name"],
      cuisine: List.first(List.wrap(c["categories"])),
      price_tier: c["price_level"],
      rating: c["rating"],
      area: c["area_label"] || c["neighborhood"] || c["locality"],
      place_id: c["id"] || c["provider_place_id"],
      photo_ref: nil,
      source: c["source"] || "google_places"
    }
  end

  defp require_key do
    key = Mode.places_key()

    if is_binary(key) and String.trim(key) != "" do
      {:ok, String.trim(key)}
    else
      {:disabled, "GOOGLE_PLACES_API_KEY missing"}
    end
  end

  defp strip_places_prefix("places/" <> rest), do: rest
  defp strip_places_prefix(id), do: id

  def http_client do
    Application.get_env(:opal_core, :places_details_http_client, __MODULE__.HTTP)
  end

  defmodule HTTP do
    @moduledoc false

    def get_json(url, opts) do
      api_key = Keyword.fetch!(opts, :api_key)
      field_mask = Keyword.get(opts, :field_mask, "")

      headers = [
        {"content-type", "application/json"},
        {"x-goog-api-key", api_key},
        {"x-goog-fieldmask", field_mask}
      ]

      case Req.get(url, headers: headers, receive_timeout: 10_000) do
        {:ok, %{status: 200, body: body}} when is_map(body) ->
          {:ok, body}

        {:ok, %{status: 200, body: body}} when is_binary(body) ->
          Jason.decode(body)

        {:ok, %{status: status, body: body}} ->
          {:error, {:http, status, body}}

        {:error, reason} ->
          {:error, {:request, reason}}
      end
    end
  end
end
