defmodule OpalCore.SocialFlow.RealWorld.Cognition.DecisionCompression do
  @moduledoc """
  Decision compression: raw world → candidates → CollectiveFit → 0–3 → prefer 1.

  Eliminates cognitive labor of comparing dominated options.
  """

  @max_surface 3

  def max_surface, do: @max_surface

  @doc """
  Compress option list.

  options: maps with optional score fields.
  """
  def compress(options, opts \\ [])

  def compress(options, opts) when is_list(options) do
    score_key = Keyword.get(opts, :score_key, "score")
    prefer_one_threshold = Keyword.get(opts, :prefer_one_margin, 0.5)

    ranked =
      options
      |> Enum.map(&stringify/1)
      |> eliminate_dominated()
      |> Enum.sort_by(fn o -> {-to_float(o[score_key]), o["id"]} end)
      |> Enum.take(@max_surface)

    preferred =
      case ranked do
        [only] ->
          only

        [best, second | _] ->
          if to_float(best[score_key]) - to_float(second[score_key]) >= prefer_one_threshold do
            best
          else
            nil
          end

        [] ->
          nil
      end

    %{
      "options" => ranked,
      "preferred" => preferred,
      "compression" => %{
        "input_count" => length(options),
        "output_count" => length(ranked),
        "dominated_removed" => max(length(options) - length(ranked), 0)
      },
      "authorizes_set" => false
    }
  end

  def compress(_, _), do: %{"options" => [], "preferred" => nil}

  @doc """
  Drop options strictly worse on all tracked dimensions.
  Dimensions: score (higher better), cost (lower better), travel (lower better).
  """
  def eliminate_dominated(options) when is_list(options) do
    opts = Enum.map(options, &stringify/1)

    Enum.reject(opts, fn a ->
      Enum.any?(opts, fn b ->
        a["id"] != b["id"] and dominates?(b, a)
      end)
    end)
  end

  def eliminate_dominated(_), do: []

  defp dominates?(a, b) do
    # a dominates b if a is better or equal on all and strictly better on one
    score_ok = to_float(a["score"]) >= to_float(b["score"])
    cost_ok = to_float(a["cost"], 0) <= to_float(b["cost"], 0)
    travel_ok = to_float(a["travel"], 0) <= to_float(b["travel"], 0)

    strict =
      to_float(a["score"]) > to_float(b["score"]) or
        to_float(a["cost"], 0) < to_float(b["cost"], 0) or
        to_float(a["travel"], 0) < to_float(b["travel"], 0)

    score_ok and cost_ok and travel_ok and strict
  end

  defp to_float(nil), do: 0.0
  defp to_float(n) when is_number(n), do: n * 1.0
  defp to_float(_), do: 0.0

  defp to_float(nil, d), do: d
  defp to_float(n, _) when is_number(n), do: n * 1.0
  defp to_float(_, d), do: d

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
