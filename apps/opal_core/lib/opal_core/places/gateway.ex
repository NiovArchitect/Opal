defmodule OpalCore.Places.Gateway do
  @moduledoc """
  Runtime places provider registry.

  Primary: Geoapify (zero mandatory billing).
  Google Places: preserved but billing_ready=false until founder enables billing.
  OSM: degraded fallback only — never silent synthetic as real.
  """

  alias OpalCore.Places.Providers.Geoapify

  @doc "Registry snapshot for evidence / health (no secrets)."
  def registry do
    geo = Geoapify.health()

    %{
      "primary" => primary_id(),
      "providers" => %{
        "geoapify" => Map.merge(Geoapify.capabilities(), geo),
        "google_places" => %{
          "provider" => "google_places",
          "billing_ready" => false,
          "available" => false,
          "configured" => google_key_present?(),
          "deferred_reason" => "billing_required_places_api_new",
          "project" => "449126891803"
        },
        "openstreetmap" => %{
          "provider" => "openstreetmap",
          "role" => "degraded_fallback",
          "available" => true
        },
        "foursquare" => %{
          "provider" => "foursquare",
          "role" => "optional_enrichment",
          "available" => false,
          "configured" => false
        }
      }
    }
  end

  def primary_id do
    if Geoapify.health()["available"], do: "geoapify", else: "unavailable"
  end

  def primary_module do
    case primary_id() do
      "geoapify" -> Geoapify
      _ -> nil
    end
  end

  @doc "Resolve a destination label to geography (city/place)."
  def resolve_destination(query) do
    case primary_module() do
      nil -> {:error, :no_provider}
      mod when is_atom(mod) -> apply(mod, :resolve_destination, [query])
    end
  end

  @doc """
  Search places for an explicit destination-aware query.

  Required: destination_text or lat/lng (discovery), OR requested_venue_name
  (exact_entity). Never applies a home-city bias. Exact mode never fabricates
  unrelated category alternatives.
  """
  def search_places(query) when is_map(query) do
    case primary_module() do
      nil ->
        {:error, :no_provider}

      mod when is_atom(mod) ->
        case apply(mod, :search_places, [query]) do
          {:ok, result} ->
            {:ok, Map.put(result, "gateway_primary", primary_id())}

          err ->
            err
        end
    end
  end

  def search_places(_), do: {:error, :invalid}

  @doc "Exact named-venue resolve when the provider supports it."
  def resolve_exact_entity(query) when is_map(query) do
    case primary_module() do
      nil ->
        {:error, :no_provider}

      mod when is_atom(mod) ->
        if function_exported?(mod, :resolve_exact_entity, 1) do
          case apply(mod, :resolve_exact_entity, [query]) do
            {:ok, result} ->
              {:ok, Map.put(result, "gateway_primary", primary_id())}

            err ->
              err
          end
        else
          search_places(Map.put(stringify(query), "search_mode", "exact_entity"))
        end
    end
  end

  def resolve_exact_entity(_), do: {:error, :invalid}

  @doc """
  Route between two coordinate pairs through the primary provider.

  Returns the provider's normalized route map (distance in meters,
  duration in seconds, and the traffic honesty class - the wired
  provider has no live traffic, so a successful route is class
  "estimate", never "live").
  """
  def route(query) when is_map(query) do
    case primary_module() do
      nil ->
        {:error, :no_provider}

      mod when is_atom(mod) ->
        if function_exported?(mod, :route, 1) do
          apply(mod, :route, [query])
        else
          {:error, :routing_unsupported}
        end
    end
  end

  def route(_), do: {:error, :invalid}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp google_key_present? do
    Application.get_env(:opal_core, :google_places_api_key) not in [nil, ""] or
      System.get_env("GOOGLE_PLACES_API_KEY") not in [nil, ""]
  end
end
