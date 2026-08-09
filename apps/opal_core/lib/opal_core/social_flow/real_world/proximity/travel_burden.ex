defmodule OpalCore.SocialFlow.RealWorld.Proximity.TravelBurden do
  @moduledoc """
  Travel burden fairness for CollectiveFit.

  Prefer balance / max burden over naive total travel minimization.
  Internal scores only — never a visible fairness score.
  """

  @doc """
  Score lower = better for group.

  Components: max_burden, imbalance, total (light weight).
  """
  def score(travel_minutes_by_user) when is_map(travel_minutes_by_user) do
    mins =
      travel_minutes_by_user
      |> Map.values()
      |> Enum.map(&to_num/1)
      |> Enum.reject(&is_nil/1)

    if mins == [] do
      999.0
    else
      max_m = Enum.max(mins)
      min_m = Enum.min(mins)
      total = Enum.sum(mins)
      imbalance = max_m - min_m

      # Weight max and imbalance heavily
      max_m * 1.5 + imbalance * 1.2 + total * 0.15
    end
  end

  def score(_), do: 999.0

  @doc "Prefer option with lower fairness score."
  def better?(a_travels, b_travels) do
    score(a_travels) < score(b_travels)
  end

  @doc """
  Rank destination options by fairness-aware burden.

  options: [%{"id" => ..., "travels" => %{user_id => minutes}}]
  """
  def rank_options(options) when is_list(options) do
    options
    |> Enum.map(fn o ->
      o = stringify(o)
      travels = o["travels"] || %{}
      {score(travels), o}
    end)
    |> Enum.sort_by(fn {s, o} -> {s, o["id"]} end)
    |> Enum.map(fn {s, o} -> Map.put(o, "burden_score_internal", s) end)
  end

  def rank_options(_), do: []

  defp to_num(n) when is_number(n), do: n * 1.0

  defp to_num(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp to_num(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
