defmodule OpalCore.SocialFlow.PlaceIdentity do
  @moduledoc """
  Provider-neutral place identity for execution.

  Catalog names (e.g. Fort Oak · North Park) are social labels.
  They are not authority for precise directions, distance, travel time,
  or reservation requests until address / coordinates / provider_place_id
  are resolved from a real source.

  Never invents missing address, coordinates, or provider ids.
  """

  alias OpalCore.SocialFlow.CandidateProvider

  @doc """
  Resolve identity for a locked place name.

  Returns a structured identity. Unresolved fields stay nil with
  explicit unresolved flags — callers must not invent values.
  """
  def resolve(name) when is_binary(name) do
    base = CandidateProvider.identity(String.trim(name)) || empty(name)
    enrich(base)
  end

  def resolve(_), do: nil

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
    |> Map.put("provenance", Map.merge(id["provenance"] || %{}, %{
      "synthetic_provider_place_bound" => true,
      "live" => false,
      "real" => false
    }))
    |> Map.put("unresolved", Map.merge(id["unresolved"] || %{}, %{
      "provider_place_id" => false
    }))
  end

  def maps_handoff_url(%{} = id) do
    name = id["canonical_name"]
    area = id["area"]

    query =
      [name, area]
      |> Enum.reject(&(&1 in [nil, ""]))
      |> Enum.join(", ")
      |> URI.encode_www_form()

    if query == "" do
      nil
    else
      "https://www.google.com/maps/search/?api=1&query=#{query}"
    end
  end

  defp enrich(%{} = base) do
    name = base["name"]
    area = base["area"]
    address = base["address"]
    coords = base["coordinates"]
    place_id = base["place_id"] || base["provider_place_id"]

    %{
      "internal_place_id" => slug(name),
      "canonical_name" => name,
      "area" => area,
      "provider" => if(place_id, do: base["provider"], else: nil),
      "provider_place_id" => place_id,
      "address" => address,
      "coordinates" => coords,
      "lat" => coords && coords["lat"],
      "lng" => coords && coords["lng"],
      "timezone" => base["timezone"] || "America/Los_Angeles",
      "provenance" => %{
        "source" => base["provenance"] || "named_place_without_catalog_entity",
        "real" => false,
        "verified_at" => nil,
        "catalog" => base["provenance"] == "curated_catalog_no_live_travel_availability_or_trend"
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
        |> Enum.join(" · ")
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

  defp slug(nil), do: nil

  defp slug(name) when is_binary(name) do
    name
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/, "_")
    |> String.trim("_")
  end
end
