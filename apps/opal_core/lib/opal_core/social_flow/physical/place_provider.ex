defmodule OpalCore.SocialFlow.Physical.PlaceProvider do
  @moduledoc """
  Provider-neutral place/event candidate acquisition boundary.

  Answers WHAT EXISTS — never WHAT FITS (that is CollectivePlaceFit).

  Default adapter: local fixture catalog (no credentials).
  External adapters (Google Places, etc.) plug in when keys exist;
  architecture and tests do not block on credentials.
  """

  alias OpalCore.SocialFlow.Physical.CandidateSource

  @doc "Configured adapter atom or module. Default :fixture."
  def adapter do
    Application.get_env(:opal_core, :physical_place_adapter, :fixture)
  end

  @doc """
  Search places/events. Returns normalized inventory only.
  """
  def search(opts \\ []) do
    case adapter() do
      :fixture ->
        CandidateSource.fetch(Keyword.put_new(opts, :source, :catalog))

      :events ->
        CandidateSource.fetch(Keyword.put(opts, :source, :events))

      mod when is_atom(mod) ->
        if function_exported?(mod, :search, 1) do
          case mod.search(opts) do
            {:ok, list} when is_list(list) ->
              {:ok, Enum.map(list, &CandidateSource.normalize_place/1) |> Enum.reject(&is_nil/1)}

            err ->
              err
          end
        else
          CandidateSource.fetch(Keyword.put_new(opts, :source, :catalog))
        end

      _ ->
        CandidateSource.fetch(Keyword.put_new(opts, :source, :catalog))
    end
  end

  @doc """
  Degrade gracefully when external provider fails — fixture inventory still works.
  """
  def search_with_fallback(opts \\ []) do
    case search(opts) do
      {:ok, []} ->
        # Empty is valid; still try fixture if external was empty
        if adapter() == :fixture do
          {:ok, []}
        else
          CandidateSource.fetch(Keyword.put_new(opts, :source, :catalog))
        end

      {:ok, _} = ok ->
        ok

      {:error, _} ->
        CandidateSource.fetch(Keyword.put_new(opts, :source, :catalog))
    end
  end

  @doc "Capability matrix for research/evidence (no live keys required)."
  def capability_matrix do
    %{
      "provider_is_not_authority" => true,
      "acquisition_vs_fit_separated" => true,
      "default_adapter" => "fixture_catalog",
      "external_required_for_core" => false,
      "supports" => %{
        "place_search" => true,
        "opening_hours" => true,
        "category" => true,
        "location_area" => true,
        "pricing_indication" => true,
        "ratings" => true,
        "events" => true,
        "photos" => false,
        "live_booking" => false
      },
      "degrades_without_provider" => true
    }
  end
end
