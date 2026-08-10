defmodule OpalCore.SocialFlow.Ambient.WorldOpportunity do
  @moduledoc """
  Provider-neutral acquisition: WHAT EXISTS?

  Not CollectiveFit (what fits). Not Ambient surface (whether to interrupt).
  Not a feed. Fixtures by default; real providers plug in later.
  """

  alias OpalCore.SocialFlow.Physical.CandidateSource
  alias OpalCore.SocialFlow.Ambient.Heat

  @experience_types ~w(
    restaurant coffee park concert market sports community church
    museum class experience pop_up activity outdoor event dinner drinks
  )

  def experience_types, do: @experience_types

  @doc """
  Acquire candidates in a zone with open-now / duration filters.
  """
  def acquire(attrs) when is_map(attrs) do
    a = stringify(attrs)
    area = a["area_label"] || a["primary_area"]
    category = a["category"] || a["experience_type"]
    available_min = to_i(a["available_minutes"] || a["opening_minutes"] || 0)
    mode = a["coordination_mode"] || "tonight"

    source =
      cond do
        category in ~w(event concert market community sports outdoor) -> :events
        a["source"] == "events" -> :events
        true -> :catalog
      end

    with {:ok, raw} <-
           CandidateSource.fetch(
             source: source,
             category: if(source == :catalog, do: category || "dinner", else: nil),
             area_label: area
           ) do
      filtered =
        raw
        |> Enum.map(&enrich_experience/1)
        |> Enum.filter(&valid_candidate?(&1, available_min, mode))
        |> Enum.take(20)

      world_heat =
        case Heat.compute(%{
               "local_activity" => min(length(filtered) / 5.0, 1.0),
               "event_happening" => Enum.any?(filtered, &("event" in &1["categories"])),
               "venues_open" => Enum.any?(filtered, &(&1["open_at_plan_time"] != false)),
               "venue_demand" => a["venue_demand"] || 0.0
             }) do
          {:ok, h} -> h
          _ -> %{}
        end

      # Fake heat from rating alone is forbidden as sole signal
      authentic_heat? =
        world_heat["world"] > 0.3 and
          (filtered != [] or a["authoritative_public_activity"] == true)

      {:ok,
       %{
         "candidates" => filtered,
         "candidate_count" => length(filtered),
         "world_heat" => world_heat,
         "authentic_world_heat" => authentic_heat?,
         "area_label" => area,
         "provider_is_not_authority" => true,
         "feed" => false,
         "map_ui" => false,
         "acquisition_only" => true,
         "authorizes_set" => false
       }}
    end
  end

  def acquire(_), do: {:ok, %{"candidates" => [], "candidate_count" => 0}}

  @doc "Filter for duration and open-now realism."
  def valid_candidate?(c, available_min, mode) when is_map(c) do
    c = stringify(c)
    open? = c["open_at_plan_time"] != false and c["open_now"] != false
    dur = to_i(c["duration_minutes"] || default_duration(c["categories"]))

    duration_ok? =
      available_min <= 0 or dur <= 0 or dur <= available_min

    # Spontaneous: must be open now
    spontaneous_ok? =
      mode not in ~w(already_out tonight) or open?

    open? and duration_ok? and spontaneous_ok?
  end

  def valid_candidate?(_, _, _), do: false

  defp enrich_experience(p) do
    p = stringify(p)
    cats = List.wrap(p["categories"])

    p
    |> Map.put("duration_minutes", p["duration_minutes"] || default_duration(cats))
    |> Map.put("experience_kind", experience_kind(cats))
  end

  defp default_duration(cats) do
    cond do
      "coffee" in cats -> 45
      "concert" in cats or "event" in cats -> 180
      "park" in cats or "outdoor" in cats -> 90
      "dinner" in cats -> 120
      "drinks" in cats -> 90
      true -> 90
    end
  end

  defp experience_kind(cats) do
    cond do
      "event" in cats or "concert" in cats -> "event"
      "coffee" in cats -> "coffee"
      "park" in cats -> "park"
      "dinner" in cats -> "restaurant"
      true -> "experience"
    end
  end

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
