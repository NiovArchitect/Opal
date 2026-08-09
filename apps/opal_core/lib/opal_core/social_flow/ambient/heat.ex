defmodule OpalCore.SocialFlow.Ambient.Heat do
  @moduledoc """
  Three internal heat signals — never shown as meters or a heat map.

  - world: objective area activity (events, demand, weather, popularity)
  - network: social possibilities becoming viable (friends nearby, openings)
  - relationship: fit for these people / this relationship context

  Power is in their intersection. UI never shows three gauges.
  """

  @doc """
  Compute internal heat components from permissioned facts.
  Scores are 0.0–1.0, private.
  """
  def compute(attrs) when is_map(attrs) do
    a = stringify(attrs)

    world = world_heat(a)
    network = network_heat(a)
    relationship = relationship_heat(a)

    # Contextual trending = intersection, not raw popularity
    contextual_trending =
      Float.round(world * 0.25 + network * 0.4 + relationship * 0.35, 3)

    {:ok,
     %{
       "world" => world,
       "network" => network,
       "relationship" => relationship,
       "contextual_trending" => contextual_trending,
       "visible_meters" => false,
       "heat_map_ui" => false,
       "private" => true
     }}
  end

  def compute(_), do: {:ok, %{"world" => 0.0, "network" => 0.0, "relationship" => 0.0}}

  defp world_heat(a) do
    base = clamp(to_f(a["local_activity"] || a["world_activity"] || 0.0))
    event = if a["event_happening"] == true, do: 0.25, else: 0.0
    open = if a["venues_open"] != false, do: 0.1, else: -0.2
    weather = if a["weather_favorable"] == true, do: 0.1, else: 0.0
    demand = clamp(to_f(a["venue_demand"] || 0.0)) * 0.2
    clamp(base + event + open + weather + demand)
  end

  defp network_heat(a) do
    friends_near = clamp(to_f(a["friends_nearby_count"] || 0) / 4.0)
    overlap = if a["overlapping_windows"] == true, do: 0.3, else: 0.0
    coordinating = if a["group_coordinating"] == true, do: 0.2, else: 0.0
    shared_interest = if a["shared_interest"] == true, do: 0.15, else: 0.0
    clamp(friends_near + overlap + coordinating + shared_interest)
  end

  defp relationship_heat(a) do
    pref = clamp(to_f(a["preference_fit"] || 0.5))
    rel = relationship_bonus(a["relationship_context"])
    novelty = clamp(to_f(a["novelty"] || 0.3)) * 0.2
    clamp(pref * 0.6 + rel + novelty)
  end

  defp relationship_bonus("date"), do: 0.25
  defp relationship_bonus("friends"), do: 0.2
  defp relationship_bonus("study"), do: 0.15
  defp relationship_bonus("community"), do: 0.15
  defp relationship_bonus(_), do: 0.1

  defp clamp(n) when n < 0.0, do: 0.0
  defp clamp(n) when n > 1.0, do: 1.0
  defp clamp(n), do: Float.round(n * 1.0, 3)

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
