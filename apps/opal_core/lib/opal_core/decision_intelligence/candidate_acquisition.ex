defmodule OpalCore.DecisionIntelligence.CandidateAcquisition do
  @moduledoc """
  Single DI entry for place/event candidate acquisition.

  Synthetic / test default → fixture catalog.
  Connected → PlaceProvider (OSM Overpass or Google Places) — never silent fixture.
  """

  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.SocialFlow.Physical.{CandidateSource, PlaceProvider}
  alias OpalCore.SocialFlow.Physical.Providers.Mode

  @doc """
  Fetch candidates for a DecisionContext.

  Returns `{:ok, %{candidates, source, real, synthetic, provider_mode, observed_at}}`.
  """
  def fetch(%DecisionContext{} = ctx, opts \\ []) do
    observed_at = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    mode = Mode.resolve(:places)

    cond do
      mode["mode"] == "connected" ->
        fetch_connected(ctx, opts, mode, observed_at)

      true ->
        fetch_fixture(ctx, opts, mode, observed_at)
    end
  end

  defp fetch_fixture(ctx, opts, mode, observed_at) do
    source = Keyword.get(opts, :candidate_source, :catalog)
    loc = ctx.location_context || %{}
    area = loc["area_label"] || loc[:area_label]

    case CandidateSource.fetch(
           source: source,
           category: category_for(ctx),
           area_label: area
         ) do
      {:ok, candidates} ->
        {:ok,
         %{
           candidates: candidates,
           source: "fixture_catalog",
           real: false,
           synthetic: true,
           provider_mode: mode["mode"] || "synthetic",
           observed_at: observed_at
         }}

      err ->
        err
    end
  end

  defp fetch_connected(ctx, opts, mode, observed_at) do
    loc = stringify(ctx.location_context || %{})
    lat = Keyword.get(opts, :lat) || number(loc["lat"] || loc["latitude"])
    lng = Keyword.get(opts, :lng) || number(loc["lng"] || loc["longitude"])
    area = Keyword.get(opts, :area_label) || loc["area_label"] || loc["primary_area"]

    search_opts =
      [
        source: :catalog,
        category: Keyword.get(opts, :category) || category_for(ctx),
        area_label: area,
        lat: lat,
        lng: lng,
        radius_m: Keyword.get(opts, :radius_m) || loc["radius_m"] || 1500,
        max_result_count: Keyword.get(opts, :max_result_count, 10),
        force_query: true,
        actionability_probability: 0.9
      ]
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)

    case PlaceProvider.search_with_meta(search_opts) do
      {:ok, candidates, meta} ->
        source =
          cond do
            is_binary(meta["source"]) and meta["source"] != "" -> meta["source"]
            true -> "real_external"
          end

        if meta["error"] || meta["reason"] == "provider_error_no_silent_fallback" do
          {:error, {:provider_error, meta["error"] || meta["reason"]}}
        else
          {:ok,
           %{
             candidates: candidates,
             source: source,
             real: meta["real"] == true,
             synthetic: meta["synthetic"] == true and meta["real"] != true,
             provider_mode: meta["provider_mode"] || mode["mode"],
             observed_at: observed_at
           }}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp category_for(%DecisionContext{intent: intent}) do
    case intent do
      "date_ideas" -> "dinner"
      "nearby_now" -> "dinner"
      "weekend_getaway" -> "dinner"
      other when is_binary(other) -> other
      _ -> "dinner"
    end
  end

  defp number(n) when is_number(n), do: n

  defp number(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp number(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
