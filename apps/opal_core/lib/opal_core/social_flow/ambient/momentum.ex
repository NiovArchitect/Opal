defmodule OpalCore.SocialFlow.Ambient.Momentum do
  @moduledoc """
  Alignment momentum — whether a possibility is becoming increasingly easy.

  Not a visible score. Drives whether Opal should materialize.
  """

  @doc """
  Assess momentum from delta in unknowns / participation / feasibility.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)

    unknowns_now = to_i(a["unknown_count"] || a["unknowns_now"] || 6)
    unknowns_before = to_i(a["unknowns_before"] || unknowns_now + 2)
    collapsed = max(unknowns_before - unknowns_now, 0)

    in_count = to_i(a["in_count"] || 0)
    viable? = a["viable"] == true
    actionable? = a["actionable"] == true
    density = to_f(a["density"] || 0.0)

    rising? =
      collapsed >= 2 or (viable? and actionable? and density >= 0.5) or
        (in_count >= 2 and collapsed >= 1)

    {:ok,
     %{
       "rising" => rising?,
       "unknowns_collapsed" => collapsed,
       "unknowns_now" => unknowns_now,
       "unknowns_before" => unknowns_before,
       "this_got_easy" => rising? and unknowns_now <= 2 and actionable?,
       "visible_score" => false,
       "authorizes_set" => false
     }}
  end

  def assess(_), do: {:ok, %{"rising" => false, "this_got_easy" => false}}

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
