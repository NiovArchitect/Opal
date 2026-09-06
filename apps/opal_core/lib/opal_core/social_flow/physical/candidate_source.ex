defmodule OpalCore.SocialFlow.Physical.CandidateSource do
  @moduledoc """
  Real-world candidate acquisition — WHAT EXISTS.

  Separate from CollectiveFit — WHAT FITS THESE PEOPLE.

  Providers find inventory; Opal alignment decides fit.
  """

  alias OpalCore.SocialFlow.RealWorld.Place.Catalog

  @doc "Fetch raw candidates from configured source (catalog fixture by default)."
  def fetch(opts \\ []) do
    source = Keyword.get(opts, :source, :catalog)

    case source do
      :catalog ->
        candidates = Catalog.list_candidates(opts)
        {:ok, Enum.map(candidates, &normalize_place/1)}

      :events ->
        # Placeholder event inventory — not a feed
        {:ok, event_fixtures(opts)}

      _ ->
        {:error, :unknown_source}
    end
  end

  @doc "Normalize provider-agnostic place fields for CollectiveFit."
  def normalize_place(p) when is_map(p) do
    p = stringify(p)

    %{
      "provider_place_id" => p["id"] || p["provider_place_id"],
      "name" => p["display_name"] || p["name"],
      "categories" => List.wrap(p["category"] || p["categories"]),
      "area_label" => p["area_label"],
      "open_now" => p["open_now"] != false,
      "open_at_plan_time" => p["open_at_plan_time"] || p["open_now"] != false,
      "price_level" => p["price_band"] || p["price_level"],
      "rating" => p["score"] || p["rating"],
      "reservation_support" => p["reservation_support"] == true,
      "quiet" => p["quiet"] == true,
      "max_party" => p["max_party"] || p["capacity"],
      "capacity" => p["max_party"] || p["capacity"],
      "provider_freshness" => p["provider_freshness"] || "fixture",
      "candidate_source_class" => "fixture",
      "raw_provider_schema" => false
    }
  end

  def normalize_place(_), do: nil

  defp event_fixtures(opts) do
    area = Keyword.get(opts, :area_label)

    [
      %{
        "provider_place_id" => "evt_market",
        "name" => "Saturday Market",
        "categories" => ["event", "outdoor"],
        "area_label" => area || "Carlsbad",
        "open_at_plan_time" => true,
        "price_level" => "$",
        "rating" => 4.2,
        "provider_freshness" => "fixture"
      }
    ]
    |> Enum.map(&normalize_place/1)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
