defmodule OpalCore.SocialFlow.Physical.PlaceProvider do
  @moduledoc """
  Provider-neutral place/event candidate acquisition boundary.

  Answers WHAT EXISTS — never WHAT FITS (that is CollectivePlaceFit).

  Default: synthetic fixture catalog.
  Real adapters: Google Places / Ticketmaster via OpportunitySource routing.

  Never silently falls back to synthetic when configured for real mode.
  """

  alias OpalCore.SocialFlow.Physical.{CandidateSource, OpportunitySource}
  alias OpalCore.SocialFlow.Physical.Providers.Mode

  @doc "Configured adapter atom or module. Default :fixture."
  def adapter do
    Application.get_env(:opal_core, :physical_place_adapter, :fixture)
  end

  @doc """
  Search places/events. Returns normalized inventory only.
  """
  def search(opts \\ []) do
    q = opts_to_query(opts)

    case OpportunitySource.acquire(q) do
      {:ok, %{"candidates" => list}} ->
        {:ok, list}

      {:ok, _} ->
        {:ok, []}

      err ->
        err
    end
  end

  @doc "Search with mode metadata (for proofs / observability)."
  def search_with_meta(opts \\ []) do
    q = opts_to_query(opts)

    case OpportunitySource.acquire(q) do
      {:ok, %{"candidates" => list} = r} ->
        {:ok, list, Map.take(r, ~w(provider_mode real synthetic source error reason))}

      {:ok, other} ->
        {:ok, [], other}

      err ->
        err
    end
  end

  @doc """
  Fallback only when intentional synthetic mode.

  Connected/real mode must surface error — never silent fixture swap.
  """
  def search_with_fallback(opts \\ []) do
    mode = Mode.resolve(:places)

    case search(opts) do
      {:ok, list} ->
        {:ok, list}

      {:error, _} = err ->
        if mode["silent_synthetic_fallback_forbidden"] do
          err
        else
          CandidateSource.fetch(Keyword.put_new(opts, :source, :catalog))
        end
    end
  end

  @doc "Capability matrix for research/evidence (no live keys required)."
  def capability_matrix do
    places = Mode.resolve(:places)
    events = Mode.resolve(:events)

    %{
      "provider_is_not_authority" => true,
      "acquisition_vs_fit_separated" => true,
      "default_adapter" => "fixture_catalog",
      "external_required_for_core" => false,
      "places_mode" => places["mode"],
      "events_mode" => events["mode"],
      "places_credential_present" => places["credential_present"],
      "events_credential_present" => events["credential_present"],
      "silent_synthetic_fallback_forbidden_when_real" => true,
      "supports" => %{
        "place_search" => true,
        "opening_hours" => true,
        "category" => true,
        "location_area" => true,
        "pricing_indication" => true,
        "ratings" => true,
        "events" => true,
        "photos" => false,
        "live_booking" => false,
        "google_places_adapter" => true,
        "ticketmaster_adapter" => true
      },
      "degrades_without_provider" => true,
      "live_slot_claims" => false
    }
  end

  defp opts_to_query(opts) do
    source = Keyword.get(opts, :source, :catalog)

    %{
      "area_label" => Keyword.get(opts, :area_label),
      "category" => Keyword.get(opts, :category),
      "source" => if(source == :events, do: "events", else: "catalog"),
      "lat" => Keyword.get(opts, :lat),
      "lng" => Keyword.get(opts, :lng),
      "max_candidates" => Keyword.get(opts, :max_result_count, 10),
      "actionability_probability" => Keyword.get(opts, :actionability_probability, 0.6)
    }
  end
end
