defmodule OpalCore.Places.VenueLookup do
  @moduledoc """
  Phase E spike — live venue resolution for trip curation.

  Chosen provider: **Google Places API (New)** Text Search.

  Config (founder supplies key):
      config :opal_core, OpalCore.Places.VenueLookup,
        api_key: System.get_env("GOOGLE_PLACES_API_KEY"),
        base_url: "https://places.googleapis.com/v1/places:searchText"

  Not wired into TripCanvas yet — prove path only.
  """

  @default_base "https://places.googleapis.com/v1/places:searchText"

  @type venue :: %{
          name: String.t(),
          cuisine: String.t() | nil,
          price_tier: String.t() | nil,
          rating: float() | nil,
          area: String.t() | nil,
          place_id: String.t() | nil,
          photo_ref: String.t() | nil,
          source: String.t()
        }

  @doc """
  Return up to 3 venues for a city + cuisine/vibe query.

  When `GOOGLE_PLACES_API_KEY` / config api_key is missing, returns
  `{:error, :api_key_missing}` — call `demo_venues/1` for offline shape proof.
  """
  @spec search(String.t(), String.t()) :: {:ok, [venue()]} | {:error, term()}
  def search(city, cuisine_or_vibe)
      when is_binary(city) and is_binary(cuisine_or_vibe) do
    case api_key() do
      nil ->
        {:error, :api_key_missing}

      "" ->
        {:error, :api_key_missing}

      key ->
        text_query = String.trim("#{cuisine_or_vibe} in #{city}")
        do_text_search(key, text_query)
    end
  end

  def search(_, _), do: {:error, :invalid_query}

  @doc """
  Offline proof shape for \"Mexico City, Mexican fine dining\" —
  real venue names matching the seed canvas (not a live API call).
  """
  @spec demo_venues(String.t()) :: [venue()]
  def demo_venues(query \\ "Mexico City, Mexican fine dining") do
    _ = query

    [
      %{
        name: "Pujol",
        cuisine: "mexican",
        price_tier: "$$$$",
        rating: 4.7,
        area: "Polanco",
        place_id: nil,
        photo_ref: nil,
        source: "demo_fixture"
      },
      %{
        name: "Quintonil",
        cuisine: "mexican",
        price_tier: "$$$$",
        rating: 4.6,
        area: "Polanco",
        place_id: nil,
        photo_ref: nil,
        source: "demo_fixture"
      },
      %{
        name: "Contramar",
        cuisine: "seafood",
        price_tier: "$$$",
        area: "Roma Norte",
        rating: 4.5,
        place_id: nil,
        photo_ref: nil,
        source: "demo_fixture"
      }
    ]
  end

  @doc "Resolve 3 venues — live when key present, else demo fixture for local proof."
  @spec search_or_demo(String.t(), String.t()) :: {:ok, [venue()], :live | :demo}
  def search_or_demo(city, cuisine_or_vibe) do
    case search(city, cuisine_or_vibe) do
      {:ok, venues} ->
        {:ok, Enum.take(venues, 3), :live}

      {:error, :api_key_missing} ->
        {:ok, demo_venues("#{city}, #{cuisine_or_vibe}"), :demo}

      {:error, _} = err ->
        err
    end
  end

  defp do_text_search(key, text_query) do
    body = %{
      "textQuery" => text_query,
      "maxResultCount" => 3,
      "languageCode" => "en"
    }

    headers = [
      {"Content-Type", "application/json"},
      {"X-Goog-Api-Key", key},
      {"X-Goog-FieldMask",
       "places.id,places.displayName,places.formattedAddress,places.types,places.priceLevel,places.rating,places.photos"}
    ]

    case Req.post(base_url(), json: body, headers: headers, receive_timeout: 12_000) do
      {:ok, %Req.Response{status: 200, body: %{"places" => places}}} when is_list(places) ->
        {:ok, Enum.map(places, &map_place/1)}

      {:ok, %Req.Response{status: 200, body: body}} ->
        {:ok, Enum.map(List.wrap(body["places"]), &map_place/1)}

      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, {:http, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp map_place(place) when is_map(place) do
    name =
      get_in(place, ["displayName", "text"]) ||
        place["name"] ||
        "Unknown"

    types = List.wrap(place["types"])
    cuisine = Enum.find(types, &String.contains?(&1, "restaurant")) || List.first(types)

    %{
      name: name,
      cuisine: cuisine,
      price_tier: price_tier(place["priceLevel"]),
      rating: place["rating"],
      area: area_from_address(place["formattedAddress"]),
      place_id: place["id"],
      photo_ref: get_in(place, ["photos", Access.at(0), "name"]),
      source: "google_places_new"
    }
  end

  defp map_place(_),
    do: %{
      name: "Unknown",
      cuisine: nil,
      price_tier: nil,
      rating: nil,
      area: nil,
      place_id: nil,
      photo_ref: nil,
      source: "google_places_new"
    }

  defp price_tier("PRICE_LEVEL_INEXPENSIVE"), do: "$"
  defp price_tier("PRICE_LEVEL_MODERATE"), do: "$$"
  defp price_tier("PRICE_LEVEL_EXPENSIVE"), do: "$$$"
  defp price_tier("PRICE_LEVEL_VERY_EXPENSIVE"), do: "$$$$"
  defp price_tier(_), do: nil

  defp area_from_address(nil), do: nil

  defp area_from_address(addr) when is_binary(addr) do
    addr
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.at(1)
  end

  defp api_key do
    conf = Application.get_env(:opal_core, __MODULE__, [])
    Keyword.get(conf, :api_key) || System.get_env("GOOGLE_PLACES_API_KEY")
  end

  defp base_url do
    conf = Application.get_env(:opal_core, __MODULE__, [])
    Keyword.get(conf, :base_url, @default_base)
  end
end
