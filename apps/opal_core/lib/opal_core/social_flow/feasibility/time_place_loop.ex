defmodule OpalCore.SocialFlow.Feasibility.TimePlaceLoop do
  @moduledoc """
  Iterative time ↔ place convergence without exposing workflow.

  time candidate → place → travel makes time bad → adjusted time
  """

  alias OpalCore.SocialFlow.Feasibility.Travel
  alias OpalCore.SocialFlow.RealWorld.Cognition.DecisionCompression
  alias OpalCore.SocialFlow.RealWorld.Place.Catalog

  @doc """
  Converge on viable time+place pairs.

  attrs:
  - candidate_starts: [DateTime]
  - prior_end_at
  - travel_by_place: %{place_id => minutes} or estimate
  - place_opts for Catalog
  """
  def converge(attrs) when is_map(attrs) do
    a = stringify(attrs)
    starts = List.wrap(a["candidate_starts"] || [])
    prior = a["prior_end_at"]
    places = Catalog.list_candidates(catalog_opts(a))

    pairs =
      for start <- starts,
          place <- places,
          travel = travel_for(a, place),
          {:ok, feas} <- [
            Travel.assess(%{
              "prior_end_at" => prior,
              "candidate_start" => start,
              "travel_minutes" => travel,
              "mode" => a["mode"]
            })
          ],
          Travel.usable?(feas) do
        score =
          to_float(place["score"]) -
            if(feas["feasibility"] == "tight", do: 0.3, else: 0.0) -
            travel / 100.0

        %{
          "id" => "#{place["id"]}_#{iso_key(start)}",
          "place_id" => place["id"],
          "display_name" => place["display_name"],
          "candidate_start" => start,
          "feasibility" => feas["feasibility"],
          "leave_by" => feas["leave_by"],
          "travel_minutes" => travel,
          "score" => Float.round(score, 3),
          "cost" => price_rank(place["price_band"]),
          "travel" => travel
        }
      end

    compressed = DecisionCompression.compress(pairs)

    %{
      "options" => compressed["options"],
      "preferred" => compressed["preferred"],
      "iteration" => "time_place",
      "workflow_exposed" => false,
      "authorizes_set" => false,
      "step_eliminated" => "map_and_schedule_comparison"
    }
  end

  def converge(_), do: %{"options" => [], "preferred" => nil}

  @doc """
  Suggest alternate start when original is unrealistic given prior commitment + place.
  """
  def suggest_adjusted_start(prior_end, travel_minutes, opts \\ []) do
    buf = OpalCore.SocialFlow.Feasibility.Buffer.minutes(opts)
    travel = if is_number(travel_minutes), do: travel_minutes, else: 20
    slack = 5

    prior_end
    |> parse_dt()
    |> case do
      %DateTime{} = pe ->
        {:ok, DateTime.add(pe, round((travel + buf + slack) * 60), :second)}

      _ ->
        {:error, :no_prior}
    end
  end

  defp travel_for(a, place) do
    by = a["travel_by_place"] || %{}
    Map.get(by, place["id"]) || Map.get(by, String.to_atom(place["id"] || "")) || 20
  rescue
    _ -> 20
  end

  defp catalog_opts(a) do
    []
    |> maybe_kw(:category, a["category"])
    |> maybe_kw(:area_label, a["area_label"])
    |> Keyword.put(:quiet_only, a["quiet_only"] == true)
  end

  defp maybe_kw(kw, _k, nil), do: kw
  defp maybe_kw(kw, k, v), do: Keyword.put(kw, k, v)

  defp price_rank("$"), do: 1
  defp price_rank("$$"), do: 2
  defp price_rank("$$$"), do: 3
  defp price_rank(_), do: 2

  defp to_float(n) when is_number(n), do: n * 1.0
  defp to_float(_), do: 0.0

  defp iso_key(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp iso_key(_), do: "t"

  defp parse_dt(%DateTime{} = dt), do: dt

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
