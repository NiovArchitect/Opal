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
        (tokens != [] and String.contains?(down, hd(tokens)))
    end)
  end

  def catalog_match(_), do: nil

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
