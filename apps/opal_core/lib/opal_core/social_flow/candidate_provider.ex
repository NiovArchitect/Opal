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
      "name" => "Fort Oak",
      "area" => "North Park",
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
end
