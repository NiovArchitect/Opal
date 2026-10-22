defmodule OpalCore.SocialFlow.CandidateProvider do
  @moduledoc """
  Recommendation boundary for a shared plan.

  Today this is a development catalog. It does not know live travel,
  opening hours, reservation inventory, or trend. A later provider can
  replace the catalog without a second planner.

  When real inputs exist, rank for the group in this order:
  feasibility, fairness, joint fit, convenience, then trend.
  Do not rank by popularity alone, and do not return one person's
  private constraint in the shared result.
  """

  @provenance "curated_catalog_no_live_travel_availability_or_trend"

  @catalog [
    %{
      "name" => "Juniper & Ivy",
      "area" => "Little Italy",
      "price" => "$$$",
      "activities" => ["dinner", "drinks"]
    },
    %{
      "name" => "Herb & Wood",
      "area" => "Little Italy",
      "price" => "$$",
      "activities" => ["dinner", "drinks"]
    },
    %{
      # area stays nil until PlaceIdentity resolves (Mission Hills) — not North Park
      "name" => "Fort Oak",
      "area" => nil,
      "price" => "$$$",
      "activities" => ["dinner"]
    },
    %{
      "name" => "Bird Rock Coffee",
      "area" => "La Jolla",
      "price" => "$$",
      "activities" => ["coffee"]
    },
    %{
      "name" => "Torrey Pines",
      "area" => "La Jolla",
      "price" => nil,
      "activities" => ["something active"]
    },
    %{
      "name" => "Meditation Gardens",
      "area" => "Encinitas",
      "price" => nil,
      "activities" => ["somewhere quiet"]
    },
    # Repair #24 (WS-3) - the atlas drifted from the seeded world:
    # the R19 human seed world's places (below) had no catalog rows
    # at all, so they could never be nominated as a graph's place
    # (:unknown_place), and the one seeded string that did match an
    # entry ("Herb & Wood, Little Italy") failed the exact-name join
    # against the offered candidate ("Herb & Wood"). The catalog is
    # the one place list: the seed world's places belong in it, with
    # the areas their seeded location strings carry. Canonical names
    # drop the leading article ("Brick Hotel" for the seed's
    # "The Brick Hotel, Oceanside") - refers_to?/2 owns that join.
    %{
      "name" => "Oceanside Farmers Market",
      "area" => "Oceanside",
      "price" => "$",
      "activities" => ["something active"]
    },
    %{
      "name" => "Brick Hotel",
      "area" => "Oceanside",
      "price" => "$$$",
      "activities" => ["drinks"]
    },
    %{
      "name" => "Moonlight Beach",
      "area" => "Encinitas",
      "price" => nil,
      "activities" => ["coffee", "something active"]
    },
    %{
      "name" => "Tamarack Beach",
      "area" => "Carlsbad",
      "price" => nil,
      "activities" => ["somewhere quiet", "something active"]
    },
    %{
      "name" => "Oceanside Pier",
      "area" => "Oceanside",
      "price" => nil,
      "activities" => ["something active"]
    }
  ]

  def recommend(activity, _participants \\ [], _plan_state \\ %{}, _permitted_context \\ %{})

  def recommend(activity, _participants, _plan_state, _permitted_context) when is_binary(activity) do
    wanted = activity |> String.downcase() |> String.trim()

    @catalog
    |> Enum.filter(fn place -> wanted in place["activities"] end)
    |> Enum.map(fn place ->
      place
      |> Map.delete("activities")
      |> Map.put("activity", wanted)
      |> Map.put("travel_time", nil)
      |> Map.put("provenance", @provenance)
    end)
  end

  def recommend(_activity, _participants, _plan_state, _permitted_context), do: []

  @doc "All catalog place names, in catalog order."
  def catalog_names, do: Enum.map(@catalog, & &1["name"])

  @doc """
  Repair #15 (Track G) — the catalog entry a piece of text refers to, if any.

  Matching is catalog-driven (this provider owns the list, callers do not
  hardcode names): a text matches an entry when it contains the full name,
  every name token, or the entry's distinctive first token
  ("juniper" → "Juniper & Ivy"). Returns the canonical catalog spelling
  or nil. This is a *recognition* helper only — it confers no lock; a
  place locks through participant confirmation in the alignment fold.
  """
  def catalog_match(text) when is_binary(text) do
    down = String.downcase(text)

    Enum.find(catalog_names(), fn name ->
      nd = String.downcase(name)
      tokens = String.split(nd, ~r/[^a-z0-9]+/, trim: true)

      String.contains?(down, nd) or
        (tokens != [] and Enum.all?(tokens, &String.contains?(down, &1))) or
        (tokens != [] and distinctive_first_token?(nd) and
           String.contains?(down, hd(tokens)))
    end)
  end

  def catalog_match(_), do: nil

  # The first-token shortcut above is documented as matching an
  # entry's DISTINCTIVE first token ("juniper" -> "Juniper & Ivy").
  # A token two entries share (Repair #24: "oceanside" opens both
  # "Oceanside Farmers Market" and "Oceanside Pier") is distinctive
  # of neither, so it must not canonicalize a mention of one entry
  # to the other; the full-name and all-tokens rules above still
  # recognize both.
  defp distinctive_first_token?(down_name) do
    token = down_name |> String.split(~r/[^a-z0-9]+/, trim: true) |> hd()

    Enum.count(catalog_names(), fn name ->
      name
      |> String.downcase()
      |> String.split(~r/[^a-z0-9]+/, trim: true)
      |> hd() == token
    end) == 1
  end

  @doc """
  Repair #24 (WS-3) - true when `text` refers to the catalog place
  `canonical`, under the display-string forms real records carry:
  the canonical name itself, with a leading article ("The Brick
  Hotel"), or with the trailing ", Area" suffix seeded and locked
  places carry ("Herb & Wood, Little Italy", "Moonlight Beach,
  Encinitas"). This is the D-P1 display-string join, owned here so
  callers never re-implement it: an exact-string comparison against
  the offered candidate's name silently rejected every suffixed
  seeded place even when its catalog entry was offered.
  """
  def refers_to?(text, canonical) when is_binary(text) and is_binary(canonical) do
    target = canonical |> String.downcase() |> String.trim()

    text
    |> String.downcase()
    |> place_text_variants()
    |> Enum.any?(&(&1 == target))
  end

  def refers_to?(_, _), do: false

  defp place_text_variants(down) do
    base = down |> String.trim() |> String.replace(~r/\s+/, " ")
    head = base |> String.split(",", parts: 2) |> hd() |> String.trim()

    [base, head]
    |> Enum.flat_map(fn v -> [v, String.replace_prefix(v, "the ", "")] end)
    |> Enum.uniq()
  end

  @doc """
  Catalog identity for a locked place name.

  Coordinates, address, and provider place id stay empty until a real
  place entity exists. Callers must not invent them from the name.
  """
  def identity(name) when is_binary(name) do
    case Enum.find(@catalog, &(&1["name"] == name)) do
      nil ->
        %{
          "name" => name,
          "area" => nil,
          "place_id" => nil,
          "address" => nil,
          "coordinates" => nil,
          "provenance" => "named_place_without_catalog_entity"
        }

      place ->
        %{
          "name" => place["name"],
          "area" => place["area"],
          "place_id" => nil,
          "address" => nil,
          "coordinates" => nil,
          "provenance" => @provenance
        }
    end
  end

  def identity(_), do: nil
end
