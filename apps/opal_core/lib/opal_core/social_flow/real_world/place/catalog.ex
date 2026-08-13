defmodule OpalCore.SocialFlow.RealWorld.Place.Catalog do
  @moduledoc """
  Real place/event candidate source boundary.

  Not a discovery feed. Normalizes candidates for CollectiveFit / DecisionCompression.
  Default: curated local fixture catalog (no external key required).
  """

  alias OpalCore.SocialFlow.RealWorld.Cognition.DecisionCompression
  alias OpalCore.SocialFlow.RealWorld.Proximity.TravelBurden

  @default_places [
    %{
      "id" => "juniper_ivy",
      "display_name" => "Juniper & Ivy",
      "category" => "dinner",
      "area_label" => "Little Italy",
      "price_band" => "$$$",
      "quiet" => true,
      "open_now" => true,
      "max_party" => 6,
      "cuisine" => "italian",
      "score" => 4.6
    },
    %{
      "id" => "campfire",
      "display_name" => "Campfire",
      "category" => "dinner",
      "area_label" => "North Park",
      "price_band" => "$$",
      "quiet" => false,
      "open_now" => true,
      "max_party" => 8,
      "cuisine" => "american",
      "score" => 4.2
    },
    %{
      "id" => "harbor_table",
      "display_name" => "Harbor Table",
      "category" => "dinner",
      "area_label" => "Waterfront",
      "price_band" => "$$",
      "quiet" => true,
      "open_now" => true,
      "max_party" => 5,
      "cuisine" => "american",
      "score" => 4.7
    },
    %{
      "id" => "coast_kitchen",
      "display_name" => "Coast Kitchen",
      "category" => "dinner",
      "area_label" => "North Park",
      "price_band" => "$$",
      "quiet" => true,
      "open_now" => true,
      "max_party" => 8,
      "cuisine" => "american",
      "score" => 4.4
    },
    %{
      "id" => "loud_bar",
      "display_name" => "Neon Bar",
      "category" => "dinner",
      "area_label" => "Downtown",
      "price_band" => "$$$",
      "quiet" => false,
      "open_now" => true,
      "max_party" => 12,
      "cuisine" => "bar",
      "score" => 3.2
    },
    %{
      "id" => "lively_table",
      "display_name" => "Lively Table",
      "category" => "dinner",
      "area_label" => "Little Italy",
      "price_band" => "$$",
      "quiet" => false,
      "open_now" => true,
      "max_party" => 8,
      "cuisine" => "american",
      "score" => 4.0
    },
    %{
      "id" => "market_pop",
      "display_name" => "Saturday Market",
      "category" => "event",
      "area_label" => "Carlsbad",
      "price_band" => "$",
      "quiet" => false,
      "open_now" => true,
      "max_party" => 20,
      "cuisine" => "market",
      "score" => 4.1
    },
    %{
      "id" => "herb_wood",
      "display_name" => "Herb & Wood",
      "category" => "dinner",
      "area_label" => "Little Italy",
      "price_band" => "$$$",
      "quiet" => true,
      "open_now" => true,
      "max_party" => 8,
      "cuisine" => "american",
      "score" => 4.8
    }
  ]

  def list_candidates(opts \\ []) do
    cat = Keyword.get(opts, :category)
    area = Keyword.get(opts, :area_label)
    quiet_only = Keyword.get(opts, :quiet_only, false)
    capacity_min = Keyword.get(opts, :capacity_min, 1)
    exclude_area = Keyword.get(opts, :exclude_area)

    @default_places
    |> Enum.filter(fn p ->
      (is_nil(cat) or p["category"] == cat) and
        (is_nil(area) or p["area_label"] == area) and
        (is_nil(exclude_area) or p["area_label"] != exclude_area) and
        (not quiet_only or p["quiet"] == true) and
        (p["max_party"] || 8) >= capacity_min and
        p["open_now"] == true
    end)
  end

  @doc """
  Rank places with private travel burdens and compress to 0–3.

  travels: %{"place_id" => %{user_id => minutes}}
  """
  def rank_for_group(opts \\ []) do
    candidates = list_candidates(opts)
    travels = Keyword.get(opts, :travels, %{})
    prefer_quiet = Keyword.get(opts, :quiet_only, false)

    scored =
      Enum.map(candidates, fn p ->
        t = Map.get(travels, p["id"], %{})
        burden = if t == %{}, do: 0.0, else: TravelBurden.score(t)
        quiet_bonus = if prefer_quiet and p["quiet"], do: 0.4, else: 0.0
        score = to_float(p["score"]) + quiet_bonus - burden / 100.0

        p
        |> Map.put("score", Float.round(score, 3))
        |> Map.put("travel", average_travel(t))
        |> Map.put("cost", price_rank(p["price_band"]))
        |> Map.put("travels", t)
      end)
      |> Enum.sort_by(& &1["score"], :desc)

    compressed =
      DecisionCompression.compress(scored)
      |> Map.put("no_feed", true)
      |> Map.put("step_eliminated", "browse_restaurants")

    # Normalize options list for GroupComposition.venue_fit
    options =
      Map.get(compressed, "options") ||
        Map.get(compressed, :options) ||
        Enum.take(scored, 3)

    Map.put(compressed, "options", options)
  end

  defp average_travel(map) when map_size(map) == 0, do: 0

  defp average_travel(map) do
    vals = Map.values(map)
    Enum.sum(vals) / max(length(vals), 1)
  end

  defp price_rank("$"), do: 1
  defp price_rank("$$"), do: 2
  defp price_rank("$$$"), do: 3
  defp price_rank("$$$$"), do: 4
  defp price_rank(_), do: 2

  defp to_float(n) when is_number(n), do: n * 1.0
  defp to_float(_), do: 0.0
end
