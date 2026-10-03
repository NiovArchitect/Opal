defmodule OpalCore.SocialFlow.PlaceIdentity do
  @moduledoc """
  Provider-neutral place identity for execution and surface projection.

  Pipeline: RAW name → candidate resolution → canonical place identity.

  Catalog names are weak social labels only. They are not authority for
  address, coordinates, provider_place_id, or neighborhood until a real
  source (Google Places Text Search when credentialed, otherwise a
  recorded Fort Oak place-details fixture) resolves them.

  Laws:
  - KNOWN_REAL_PLACE_STAYS_UNRESOLVED_WITHOUT_ATTEMPT = 0
  - Never invent coordinates / address / provider ids
  - LOCATION_REQUIRED_TO_CREATE_PAST_HISTORY stays 0
  """

  alias OpalCore.SocialFlow.CandidateProvider
  alias OpalCore.SocialFlow.Physical.Providers.{GooglePlaces, Mode, RecordedPlaces}

  @high_confidence 0.85

  @doc """
  Resolve identity for a locked place name.

  Returns a structured identity. Unresolved fields stay nil with
  explicit unresolved flags — callers must not invent values.
  """
  def resolve(name) when is_binary(name) do
    raw = String.trim(name)

    if raw == "" do
      nil
    else
      catalog = CandidateProvider.identity(raw) || empty(raw)
      case resolve_candidates(raw) do
        {:resolved, candidate, confidence} ->
          from_candidate(raw, catalog, candidate, confidence, "resolved")

        {:ambiguous, candidates} ->
          ambiguous(raw, catalog, candidates)

        {:unknown, _} ->
          enrich_unresolved(catalog, "unknown")
      end
    end
  end

  def resolve(_), do: nil

  @doc "True when confidence is high enough to persist onto SharedPlan."
  def high_confidence?(%{} = id) do
    conf = id["confidence"]
    id["resolution"] == "resolved" and is_number(conf) and conf >= @high_confidence and precise?(id)
  end

  def high_confidence?(_), do: false

  @doc "True when name/area exist but destination is not precise enough to book or route precisely."
  def precise?(%{} = id) do
    is_binary(id["address"]) or
      (is_map(id["coordinates"]) and is_number(id["coordinates"]["lat"]) and
         is_number(id["coordinates"]["lng"])) or
      is_binary(id["provider_place_id"])
  end

  def precise?(_), do: false

  @doc """
  Capability hints derived from identity alone.

  Directions may offer a name-search maps handoff without claiming
  precise routing. Reservation booking stays unavailable until a
  real provider_place_id exists (or an explicit synthetic fixture binds one).
  """
  def capabilities(%{} = id) do
    precise = precise?(id)
    named? = is_binary(id["canonical_name"]) and id["canonical_name"] != ""

    %{
      "directions" => %{
        "available" => named?,
        "mode" => if(precise, do: "precise_destination", else: "name_search_handoff"),
        "precise" => precise,
        "live_travel_time" => false
      },
      "reservation_search" => %{
        "available" => is_binary(id["provider_place_id"]),
        "reason" =>
          if(is_binary(id["provider_place_id"]),
            do: nil,
            else: "provider_place_id_unresolved"
          )
      },
      "reservation_booking" => %{
        "available" => false,
        "live" => false,
        "reason" => "booking_not_connected",
        "synthetic_adapter_available" => true
      },
      "live_availability" => %{
        "available" => false,
        "reason" => "live_inventory_not_connected"
      },
      "menu" => %{"available" => false},
      "tickets" => %{"available" => false}
    }
  end

  def capabilities(_), do: capabilities(%{"canonical_name" => nil})

  @doc """
  Bind a synthetic provider place id for adapter-contract proofs only.

  Does not claim live booking. Does not invent address/coordinates.
  """
  def bind_synthetic_provider_place(%{} = id, provider_place_id)
      when is_binary(provider_place_id) do
    id
    |> Map.put("provider", "synthetic_reservation")
    |> Map.put("provider_place_id", provider_place_id)
    |> Map.put(
      "provenance",
      Map.merge(id["provenance"] || %{}, %{
        "synthetic_provider_place_bound" => true,
        "live" => false,
        "real" => false
      })
    )
    |> Map.put(
      "unresolved",
      Map.merge(id["unresolved"] || %{}, %{
        "provider_place_id" => false
      })
    )
  end

  def maps_handoff_url(%{} = id) do
    query =
      cond do
        is_binary(id["address"]) and id["address"] != "" ->
          id["address"]

        true ->
          [id["canonical_name"], id["area"] || id["neighborhood"] || id["locality"]]
          |> Enum.reject(&(&1 in [nil, ""]))
          |> Enum.join(", ")
      end
      |> URI.encode_www_form()

    if query == "" do
      nil
    else
      "https://www.google.com/maps/search/?api=1&query=#{query}"
    end
  end

  @doc """
  Surface/projection shape for Home / Graph / Chats.

  Prefer PlaceIdentity over raw CandidateProvider.identity.
  Provenance is a string for client contracts; detail stays under provenance_detail.
  """
  def for_surface(nil), do: nil

  def for_surface(%{} = id) do
    provenance =
      cond do
        is_binary(id["provenance"]) -> id["provenance"]
        is_map(id["provenance"]) -> id["provenance"]["source"]
        true -> nil
      end

    %{
      "name" => id["canonical_name"] || id["name"],
      "canonical_name" => id["canonical_name"] || id["name"],
      "area" => id["area"] || id["neighborhood"] || id["locality"],
      "place_id" => id["provider_place_id"] || id["place_id"],
      "provider_place_id" => id["provider_place_id"] || id["place_id"],
      "address" => id["address"],
      "coordinates" => id["coordinates"],
      "lat" => id["lat"] || get_in(id, ["coordinates", "lat"]),
      "lng" => id["lng"] || get_in(id, ["coordinates", "lng"]),
      "timezone" => id["timezone"] || "America/Los_Angeles",
      "locality" => id["locality"],
      "neighborhood" => id["neighborhood"],
      "provenance" => provenance,
      "provenance_detail" => if(is_map(id["provenance"]), do: id["provenance"], else: nil),
      "resolved_at" => id["resolved_at"],
      "confidence" => id["confidence"],
      "resolution" => id["resolution"],
      "display" => id["display"],
      "unresolved" => id["unresolved"]
    }
  end

  @doc """
  Attach high-confidence identity onto alignment under place.identity / place_identity.

  Idempotent: keeps a prior high-confidence match for the same locked name.
  """
  def attach_resolved(state, previous \\ nil)

  def attach_resolved(state, previous) when is_map(state) do
    place = state["place"] || %{}
    name = place["value"]

    cond do
      place["state"] != "locked" or not is_binary(name) ->
        state

      keep_previous?(previous, name) ->
        identity = get_in(previous, ["place", "identity"]) || previous["place_identity"]

        state
        |> put_in(["place", "identity"], identity)
        |> Map.put("place_identity", identity)

      true ->
        identity = resolve(name)

        if high_confidence?(identity) do
          state
          |> put_in(["place", "identity"], identity)
          |> Map.put("place_identity", identity)
        else
          state
        end
    end
  end

  def attach_resolved(state, _), do: state

  defp keep_previous?(previous, name) when is_map(previous) and is_binary(name) do
    identity = get_in(previous, ["place", "identity"]) || previous["place_identity"]

    high_confidence?(identity) and
      (identity["canonical_name"] == name or identity["name"] == name)
  end

  defp keep_previous?(_, _), do: false

  defp resolve_candidates(raw) do
    candidates =
      case live_text_search(raw) do
        {:ok, list} when is_list(list) and list != [] -> list
        _ -> recorded_text_search(raw)
      end

    scored =
      candidates
      |> Enum.map(fn c -> {c, score_candidate(raw, c)} end)
      |> Enum.filter(fn {_c, score} -> score >= 0.45 end)
      |> Enum.sort_by(fn {_c, score} -> score end, :desc)

    exact = Enum.filter(scored, fn {_c, score} -> score >= 0.95 end)
    high = Enum.filter(scored, fn {_c, score} -> score >= @high_confidence end)
    viable = Enum.filter(scored, fn {_c, score} -> score >= 0.7 end)

    cond do
      length(exact) == 1 ->
        [{c, s} | _] = exact
        {:resolved, c, s}

      length(exact) > 1 ->
        {:ambiguous, Enum.map(exact, &elem(&1, 0))}

      # Multiple plausible matches (e.g. short query "Oak") stay ambiguous
      length(viable) > 1 ->
        {:ambiguous, Enum.map(viable, &elem(&1, 0))}

      length(high) == 1 ->
        [{c, s} | _] = high
        {:resolved, c, s}

      length(viable) == 1 ->
        [{c, s} | _] = viable
        {:resolved, c, s}

      true ->
        {:unknown, []}
    end
  end

  defp live_text_search(raw) do
    mode = Mode.resolve(:places)

    cond do
      Mode.places_key() in [nil, ""] ->
        {:error, :missing_credential}

      mode["mode"] == "disabled" ->
        {:error, :disabled}

      true ->
        case GooglePlaces.search_text(%{"text_query" => raw, "max_result_count" => 5}) do
          {:ok, %{"candidates" => list}} when is_list(list) -> {:ok, list}
          {:ok, _} -> {:ok, []}
          {:error, _} = err -> err
        end
    end
  end

  defp recorded_text_search(raw) do
    case RecordedPlaces.search_text(%{"text_query" => raw, "max_result_count" => 5}) do
      {:ok, %{"candidates" => list}} when is_list(list) -> list
      _ -> []
    end
  end

  defp score_candidate(raw, candidate) when is_map(candidate) do
    name = String.downcase(to_string(candidate["name"] || candidate["display_name"] || ""))
    q = String.downcase(String.trim(raw))

    cond do
      name == "" or q == "" -> 0.0
      name == q -> 0.95
      String.starts_with?(name, q) or String.starts_with?(q, name) -> 0.88
      String.contains?(name, q) or String.contains?(q, name) -> 0.72
      token_overlap?(q, name) -> 0.6
      true -> 0.0
    end
  end

  defp score_candidate(_, _), do: 0.0

  defp token_overlap?(q, name) do
    qt = q |> String.split(~r/[^a-z0-9]+/, trim: true) |> MapSet.new()
    nt = name |> String.split(~r/[^a-z0-9]+/, trim: true) |> MapSet.new()
    inter = MapSet.intersection(qt, nt) |> MapSet.size()
    inter > 0 and inter >= max(1, div(MapSet.size(qt), 2))
  end

  defp from_candidate(raw, catalog, candidate, confidence, resolution) do
    coords =
      cond do
        is_map(candidate["coordinates"]) -> candidate["coordinates"]
        is_number(candidate["lat"]) and is_number(candidate["lng"]) ->
          %{"lat" => candidate["lat"], "lng" => candidate["lng"]}
        true -> nil
      end

    address = candidate["address"] || candidate["formatted_address"]
    provider_place_id = candidate["provider_place_id"] || candidate["id"]
    area = candidate["area_label"] || candidate["neighborhood"] || candidate["locality"]
    neighborhood = candidate["neighborhood"] || candidate["area_label"]
    locality = candidate["locality"] || locality_from_address(address)
    source = candidate["source"] || get_in(candidate, ["provenance", "source"]) || "recorded_fixture"
    live? = candidate["live"] == true or source == "google_places"
    resolved_at = DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601()
    canonical = candidate["name"] || candidate["display_name"] || raw

    %{
      "internal_place_id" => slug(canonical),
      "canonical_name" => canonical,
      "name" => canonical,
      "area" => area,
      "neighborhood" => neighborhood,
      "locality" => locality,
      "provider" => if(provider_place_id, do: candidate["provider"] || "google_places", else: nil),
      "provider_place_id" => provider_place_id,
      "place_id" => provider_place_id,
      "address" => address,
      "coordinates" => coords,
      "lat" => coords && coords["lat"],
      "lng" => coords && coords["lng"],
      "timezone" => "America/Los_Angeles",
      "confidence" => confidence,
      "resolution" => resolution,
      "resolved_at" => resolved_at,
      "provenance" => %{
        "source" => source,
        "real" => live?,
        "live" => live?,
        "recorded" => source in ["recorded_fixture", "recorded_google_places"],
        "catalog" => false,
        "verified_at" => resolved_at,
        "raw_name" => raw,
        "catalog_area_ignored" => catalog["area"]
      },
      "verified_at" => resolved_at,
      "unresolved" => %{
        "address" => is_nil(address),
        "coordinates" => is_nil(coords),
        "provider_place_id" => is_nil(provider_place_id)
      },
      "display" =>
        [canonical, area]
        |> Enum.reject(&(&1 in [nil, ""]))
        |> Enum.join(" · "),
      "candidates" => nil
    }
  end

  defp ambiguous(raw, catalog, candidates) do
    enrich_unresolved(catalog, "ambiguous")
    |> Map.put("confidence", 0.4)
    |> Map.put(
      "candidates",
      Enum.map(candidates, fn c ->
        %{
          "name" => c["name"] || c["display_name"],
          "address" => c["address"],
          "provider_place_id" => c["provider_place_id"] || c["id"],
          "area_label" => c["area_label"]
        }
      end)
    )
    |> put_in(["provenance", "raw_name"], raw)
    |> put_in(["provenance", "attempted"], true)
  end

  defp enrich_unresolved(%{} = base, resolution) do
    name = base["name"]
    # Catalog area is a weak social label only — not resolution authority.
    area = if resolution == "unknown", do: base["area"], else: nil
    address = base["address"]
    coords = base["coordinates"]
    place_id = base["place_id"] || base["provider_place_id"]

    %{
      "internal_place_id" => slug(name),
      "canonical_name" => name,
      "name" => name,
      "area" => area,
      "neighborhood" => nil,
      "locality" => nil,
      "provider" => if(place_id, do: base["provider"], else: nil),
      "provider_place_id" => place_id,
      "place_id" => place_id,
      "address" => address,
      "coordinates" => coords,
      "lat" => coords && coords["lat"],
      "lng" => coords && coords["lng"],
      "timezone" => base["timezone"] || "America/Los_Angeles",
      "confidence" => if(resolution == "unknown", do: 0.1, else: 0.4),
      "resolution" => resolution,
      "resolved_at" => DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601(),
      "provenance" => %{
        "source" => base["provenance"] || "named_place_without_catalog_entity",
        "real" => false,
        "live" => false,
        "recorded" => false,
        "catalog" => base["provenance"] == "curated_catalog_no_live_travel_availability_or_trend",
        "verified_at" => nil,
        "attempted" => true
      },
      "verified_at" => nil,
      "unresolved" => %{
        "address" => is_nil(address),
        "coordinates" => is_nil(coords),
        "provider_place_id" => is_nil(place_id)
      },
      "display" =>
        [name, area]
        |> Enum.reject(&(&1 in [nil, ""]))
        |> Enum.join(" · "),
      "candidates" => nil
    }
  end

  defp empty(name) do
    %{
      "name" => name,
      "area" => nil,
      "place_id" => nil,
      "address" => nil,
      "coordinates" => nil,
      "provenance" => "named_place_without_catalog_entity"
    }
  end

  defp locality_from_address(address) when is_binary(address) do
    cond do
      String.contains?(address, "San Diego") -> "San Diego"
      true -> nil
    end
  end

  defp locality_from_address(_), do: nil

  defp slug(nil), do: nil

  defp slug(name) when is_binary(name) do
    name
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/, "_")
    |> String.trim("_")
  end
end
