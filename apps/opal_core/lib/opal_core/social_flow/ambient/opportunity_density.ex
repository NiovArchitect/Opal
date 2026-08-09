defmodule OpalCore.SocialFlow.Ambient.OpportunityDensity do
  @moduledoc """
  Opportunity density — internal signal, not a visible heat map.

  How much relevant real-world possibility exists around the current
  alignment context for these people.
  """

  alias OpalCore.SocialFlow.Ambient.Heat

  @doc """
  Score density of relevant opportunity in context.

  High density alone does not surface Opal — needs actionability + restraint.
  """
  def score(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, heat} <- Heat.compute(a) do
      candidate_count = to_i(a["candidate_count"] || a["option_count"] || 0)
      open_now = a["open_now_count"] || 0
      expiring = a["expiring_soon"] == true
      travel_ok = a["travel_burden_low"] == true or a["proximity_ok"] == true
      time_ok = a["time_compatible"] == true

      # Density rewards relevant overlap, not raw inventory size
      inventory = clamp(:math.log(max(candidate_count, 1) + 1) / :math.log(20))
      open_factor = clamp(to_f(open_now) / max(candidate_count, 1))
      urgency = if expiring, do: 0.15, else: 0.0
      feasibility = if travel_ok and time_ok, do: 0.25, else: 0.0

      density =
        clamp(
          heat["contextual_trending"] * 0.45 + inventory * 0.2 + open_factor * 0.15 + urgency +
            feasibility
        )

      {:ok,
       %{
         "density" => density,
         "heat" => heat,
         "candidate_count" => candidate_count,
         "unusually_interesting" => density >= 0.55,
         "heat_map_ui" => false,
         "feed" => false,
         "private" => true
       }}
    end
  end

  def score(_), do: {:ok, %{"density" => 0.0, "unusually_interesting" => false}}

  defp clamp(n) when n < 0.0, do: 0.0
  defp clamp(n) when n > 1.0, do: 1.0
  defp clamp(n), do: Float.round(n * 1.0, 3)

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
