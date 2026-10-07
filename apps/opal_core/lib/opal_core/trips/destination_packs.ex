defmodule OpalCore.Trips.DestinationPacks do
  @moduledoc """
  Phase 4G — curated destination fixture packs for trip stop suggestions.

  Data only: add a destination by appending a pack map. No San Diego outing
  catalog fallback. Real place names (or generic descriptors when unsure).
  """

  @packs [
    %{
      "label" => "Joshua Tree",
      "entries" => [
        %{
          "id" => "jt_autocamp",
          "name" => "AutoCamp Joshua Tree",
          "area_label" => "Joshua Tree",
          "category" => "lodging",
          "leg_type" => "lodging",
          "price_band" => "$$$",
          "description" => "Airstream stays on desert acreage near the west entrance."
        },
        %{
          "id" => "jt_hotel_wren",
          "name" => "Hotel Wren",
          "area_label" => "Twentynine Palms",
          "category" => "lodging",
          "leg_type" => "lodging",
          "price_band" => "$$$",
          "description" => "Design-forward boutique lodge close to the north park entrance."
        },
        %{
          "id" => "jt_hidden_valley",
          "name" => "Hidden Valley Nature Trail",
          "area_label" => "Joshua Tree National Park",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$",
          "description" => "Short loop through classic boulder formations inside the park."
        },
        %{
          "id" => "jt_keys_view",
          "name" => "Keys View",
          "area_label" => "Joshua Tree National Park",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$",
          "description" => "Overlook of the Coachella Valley and San Andreas Fault."
        },
        %{
          "id" => "jt_noah_purifoy",
          "name" => "Noah Purifoy Outdoor Desert Art Museum",
          "area_label" => "Joshua Tree",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$",
          "description" => "Open-air sculpture assemblages across desert acreage."
        },
        %{
          "id" => "jt_pappy",
          "name" => "Pappy and Harriet's",
          "area_label" => "Pioneertown",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$",
          "cuisine" => "american",
          "description" => "Landmark saloon kitchen and live music in Pioneertown."
        },
        %{
          "id" => "jt_crossroads",
          "name" => "Crossroads Cafe",
          "area_label" => "Joshua Tree",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$",
          "cuisine" => "american",
          "description" => "Casual cafe staples near the west entrance town strip."
        }
      ]
    },
    %{
      "label" => "Palm Springs",
      "entries" => [
        %{
          "id" => "ps_ace",
          "name" => "Ace Hotel and Swim Club",
          "area_label" => "Palm Springs",
          "category" => "lodging",
          "leg_type" => "lodging",
          "price_band" => "$$$",
          "description" => "Mid-century motel campus with pool and courtyard hangouts."
        },
        %{
          "id" => "ps_parker",
          "name" => "The Parker Palm Springs",
          "area_label" => "Palm Springs",
          "category" => "lodging",
          "leg_type" => "lodging",
          "price_band" => "$$$$",
          "description" => "Landscaped resort grounds with bungalows and spa."
        },
        %{
          "id" => "ps_tramway",
          "name" => "Palm Springs Aerial Tramway",
          "area_label" => "Palm Springs",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$$",
          "description" => "Rotating tram to Mount San Jacinto State Park trails."
        },
        %{
          "id" => "ps_indian_canyons",
          "name" => "Indian Canyons",
          "area_label" => "Palm Springs",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$$",
          "description" => "Palm oases and hiking trails at the base of the mountains."
        },
        %{
          "id" => "ps_art_museum",
          "name" => "Palm Springs Art Museum",
          "area_label" => "Palm Springs",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$$",
          "description" => "Modern art and architecture collections downtown."
        },
        %{
          "id" => "ps_birba",
          "name" => "Birba",
          "area_label" => "Palm Springs",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$",
          "cuisine" => "italian",
          "description" => "Wood-fired Italian plates in a patio courtyard."
        },
        %{
          "id" => "ps_cheekys",
          "name" => "Cheeky's",
          "area_label" => "Palm Springs",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$",
          "cuisine" => "american",
          "description" => "Daytime brunch spot known for bacon flights and seasonal plates."
        }
      ]
    },
    %{
      "label" => "Big Bear",
      "entries" => [
        %{
          "id" => "bb_northwoods",
          "name" => "Northwoods Resort",
          "area_label" => "Big Bear Lake",
          "category" => "lodging",
          "leg_type" => "lodging",
          "price_band" => "$$$",
          "description" => "Lakeside lodge rooms and cabins near the village."
        },
        %{
          "id" => "bb_honeybear",
          "name" => "Mountain lodge cabin stay",
          "area_label" => "Big Bear Lake",
          "category" => "lodging",
          "leg_type" => "lodging",
          "price_band" => "$$",
          "description" => "Simple cabin-style lodging near the north shore pines."
        },
        %{
          "id" => "bb_snow_summit",
          "name" => "Snow Summit",
          "area_label" => "Big Bear Lake",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$$$",
          "description" => "Ski and bike mountain with scenic chairlift rides."
        },
        %{
          "id" => "bb_alpine_zoo",
          "name" => "Big Bear Alpine Zoo",
          "area_label" => "Big Bear Lake",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$$",
          "description" => "Rescue zoo for mountain wildlife in a forest setting."
        },
        %{
          "id" => "bb_castle_rock",
          "name" => "Castle Rock Trail",
          "area_label" => "Big Bear Lake",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$",
          "description" => "Short hike to a rocky overlook above the lake."
        },
        %{
          "id" => "bb_cottage",
          "name" => "The Cottage",
          "area_label" => "Big Bear Lake",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$",
          "cuisine" => "american",
          "description" => "Comfort breakfast and lunch near the village."
        },
        %{
          "id" => "bb_brewery",
          "name" => "Big Bear Mountain Brewery",
          "area_label" => "Big Bear Lake",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$",
          "cuisine" => "american",
          "description" => "Local brewpub plates after a day on the mountain."
        }
      ]
    },
    %{
      "label" => "Mexico City",
      "entries" => [
        %{
          "id" => "cdmx_contramar",
          "name" => "Contramar",
          "area_label" => "Roma Norte",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$$",
          "cuisine" => "seafood",
          "description" => "Iconic seafood institution — tuna tostadas, lively room."
        },
        %{
          "id" => "cdmx_pujol",
          "name" => "Pujol",
          "area_label" => "Polanco",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$$$",
          "cuisine" => "mexican",
          "description" => "Enrique Olvera tasting — reservation-first together dinner."
        },
        %{
          "id" => "cdmx_quintonil",
          "name" => "Quintonil",
          "area_label" => "Polanco",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$$$",
          "cuisine" => "mexican",
          "description" => "Contemporary Mexican — strong regroup lunch after a split morning."
        },
        %{
          "id" => "cdmx_rosetta",
          "name" => "Panadería Rosetta",
          "area_label" => "Roma Norte",
          "category" => "meal",
          "leg_type" => "meal",
          "price_band" => "$$",
          "cuisine" => "bakery",
          "description" => "Daylight bakery send-off before the airport."
        },
        %{
          "id" => "cdmx_san_juan",
          "name" => "Mercado de San Juan",
          "area_label" => "Centro",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$",
          "description" => "Specialty market morning for the food-forward subgroup."
        },
        %{
          "id" => "cdmx_teotihuacan",
          "name" => "Teotihuacan",
          "area_label" => "Teotihuacan",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$$",
          "description" => "Pyramids day trip — optional split from city cooking class."
        },
        %{
          "id" => "cdmx_jacaranda",
          "name" => "Casa Jacaranda cooking class",
          "area_label" => "Roma Norte",
          "category" => "activity",
          "leg_type" => "activity",
          "price_band" => "$$$",
          "description" => "Intimate cooking class for the stay-in-city subgroup."
        }
      ]
    }
  ]

  @doc "Canonical destination labels with curated packs."
  def labels do
    Enum.map(@packs, & &1["label"])
  end

  @doc """
  Look up a pack by destination label (case-insensitive, trimmed).

  Returns `{:ok, pack}` or `{:error, :no_curated_destination}`.
  """
  def lookup(label) when is_binary(label) do
    key = normalize_label(label)

    case Enum.find(@packs, fn p -> normalize_label(p["label"]) == key end) do
      nil -> {:error, :no_curated_destination}
      pack -> {:ok, pack}
    end
  end

  def lookup(_), do: {:error, :no_curated_destination}

  @doc "All entries for a pack label, or empty list."
  def entries(label) when is_binary(label) do
    case lookup(label) do
      {:ok, pack} -> pack["entries"]
      _ -> []
    end
  end

  def entries(_), do: []

  defp normalize_label(label) when is_binary(label) do
    label
    |> String.trim()
    |> String.downcase()
  end
end
