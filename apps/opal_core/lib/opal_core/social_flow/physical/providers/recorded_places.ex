defmodule OpalCore.SocialFlow.Physical.Providers.RecordedPlaces do
  @moduledoc """
  Recorded external provider responses for normalization proofs (Pass 15).

  source=recorded_fixture — NOT live, NOT synthetic catalog invention.
  Used when credentials are unavailable but adapter contract must be exercised.
  """

  alias OpalCore.SocialFlow.Physical.WorldFact

  def source_id, do: "recorded_google_places"
  def cost_tier, do: "none"

  def fetch_candidates(query \\ %{})

  @doc "Load and normalize recorded Google Places nearby response."
  def fetch_candidates(query) when is_map(query) do
    q = stringify(query)

    with {:ok, body} <- read_fixture(),
         {:ok, decoded} <- Jason.decode(body) do
      places =
        decoded
        |> Map.get("places", [])
        |> List.wrap()
        |> Enum.map(&normalize_recorded_place(&1, q, decoded))
        |> Enum.reject(&is_nil/1)
        |> maybe_filter_category(q)
        |> Enum.take(to_i(q["max_result_count"] || q["max_candidates"] || 10))

      {:ok,
       %{
         "candidates" => places,
         "mode" => "recorded",
         "source" => source_id(),
         "provider" => "google_places",
         "real" => false,
         "synthetic" => false,
         "recorded" => true,
         "live" => false,
         "recorded_at" => decoded["recorded_at"],
         "query_class" => decoded["query_class"],
         "does_not_claim_availability_slots" => true,
         "provider_is_not_authority" => true,
         "authorizes_set" => false
       }}
    else
      {:error, _} = err -> err
      _ -> {:error, :recorded_fixture_unavailable}
    end
  end

  def fetch_candidates(_), do: {:error, :invalid}

  defp normalize_recorded_place(place, q, root) when is_map(place) do
    # Reuse GooglePlaces field shape where possible via shared sanitization path
    p = stringify(place)
    name = get_in(p, ["displayName", "text"]) || p["displayName"] || p["name"]
    id = p["id"] || p["provider_place_id"]
    loc = p["location"] || %{}
    open_now = open_now_status(p)
    hours_known = hours_known?(p)
    area = area_from(p, q)

    closed? =
      p["businessStatus"] in ~w(CLOSED_TEMPORARILY CLOSED_PERMANENTLY) or open_now == false

    base = %{
      "provider_place_id" => id,
      "name" => name,
      "display_name" => name,
      "categories" => normalize_types(p["types"]),
      "cuisine" => cuisine_from_types(p["types"]),
      "area_label" => area,
      "address" => p["formattedAddress"],
      "lat" => loc["latitude"] || loc["lat"],
      "lng" => loc["longitude"] || loc["lng"],
      "price_level" => price_level(p["priceLevel"]),
      "rating" => p["rating"],
      "review_count" => p["userRatingCount"],
      "open_now" => open_now,
      "hours_known" => hours_known,
      "open_at_plan_time" => if(closed?, do: false, else: if(open_now == :unknown, do: :unknown, else: open_now != false)),
      "business_status" => p["businessStatus"],
      "quiet" => quiet_heuristic(name, p["types"]),
      "provider_freshness" => "recorded",
      "provider" => "google_places",
      "truth_class" => "provider_fact",
      "provenance" =>
        WorldFact.provenance(%{
          "source" => "recorded_fixture",
          "provider" => "google_places",
          "source_item_id" => id,
          "observed_at" => root["recorded_at"] || DateTime.utc_now(),
          "real" => false,
          "synthetic" => false,
          "live" => false,
          "retrieval_mode" => "recorded_fixture",
          "confidence" => 0.7,
          "geographic_scope" => area
        }),
      "does_not_claim_availability_slots" => true,
      "reservation_available" => :unknown,
      "authorizes_set" => false,
      "raw_provider_schema" => false
    }

    base
  end

  defp normalize_recorded_place(_, _, _), do: nil

  defp open_now_status(p) do
    cond do
      p["businessStatus"] in ~w(CLOSED_TEMPORARILY CLOSED_PERMANENTLY) -> false
      is_map(p["currentOpeningHours"]) and is_boolean(p["currentOpeningHours"]["openNow"]) ->
        p["currentOpeningHours"]["openNow"]
      true -> :unknown
    end
  end

  defp hours_known?(p) do
    is_map(p["currentOpeningHours"]) or is_map(p["regularOpeningHours"]) or
      p["businessStatus"] in ~w(CLOSED_TEMPORARILY CLOSED_PERMANENTLY)
  end

  defp area_from(p, q) do
    cond do
      is_binary(p["area_hint"]) and p["area_hint"] != "" -> p["area_hint"]
      is_binary(q["area_label"]) and q["area_label"] != "" -> q["area_label"]
      addr = p["formattedAddress"] ->
        cond do
          String.contains?(addr, "Downtown") -> "Downtown"
          String.contains?(addr, "Little Italy") or String.contains?(addr, "Kettner") or
              String.contains?(addr, "India St") ->
            "Little Italy"
          true -> q["area_label"] || "San Diego"
        end
      true -> q["area_label"] || "San Diego"
    end
  end

  defp normalize_types(types) when is_list(types) do
    Enum.map(types, fn t -> t |> to_string() |> String.replace("_", " ") end)
  end

  defp normalize_types(_), do: ["restaurant"]

  defp cuisine_from_types(types) when is_list(types) do
    cond do
      Enum.any?(types, &String.contains?(to_string(&1), "italian")) -> "italian"
      Enum.any?(types, &String.contains?(to_string(&1), "steak")) -> "steak"
      true -> "restaurant"
    end
  end

  defp cuisine_from_types(_), do: nil

  defp price_level("PRICE_LEVEL_FREE"), do: "$"
  defp price_level("PRICE_LEVEL_INEXPENSIVE"), do: "$"
  defp price_level("PRICE_LEVEL_MODERATE"), do: "$$"
  defp price_level("PRICE_LEVEL_EXPENSIVE"), do: "$$$"
  defp price_level("PRICE_LEVEL_VERY_EXPENSIVE"), do: "$$$$"
  defp price_level(_), do: nil

  defp quiet_heuristic(name, types) do
    n = to_string(name || "")
    t = Enum.map(List.wrap(types), &to_string/1) |> Enum.join(" ")
    not Regex.match?(~r/bar|neon|loud|lively|nightlife/i, n <> " " <> t)
  end

  defp maybe_filter_category(list, q) do
    cat = String.downcase(to_string(q["category"] || q["experience_type"] || ""))

    if cat in ["", "dinner", "restaurant"] do
      list
    else
      Enum.filter(list, fn c ->
        cuisine = String.downcase(to_string(c["cuisine"] || ""))
        cats = Enum.map(List.wrap(c["categories"]), &String.downcase(to_string(&1)))
        cuisine == cat or Enum.any?(cats, &String.contains?(&1, cat))
      end)
    end
  end

  defp read_fixture do
    path =
      :opal_core
      |> :code.priv_dir()
      |> List.to_string()
      |> Path.join("provider_fixtures/google_places_nearby_dinner_little_italy.json")

    case File.read(path) do
      {:ok, body} -> {:ok, body}
      {:error, _} ->
        # fallback for test path from monorepo root
        alt =
          Path.expand(
            "../../priv/provider_fixtures/google_places_nearby_dinner_little_italy.json",
            __DIR__
          )

        File.read(alt)
    end
  end

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_binary(n), do: String.to_integer(n)
  defp to_i(_), do: 10

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
