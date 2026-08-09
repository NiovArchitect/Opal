defmodule OpalCore.SocialFlow.PlaceGap do
  @moduledoc """
  Place gap foundation — once time is aligned, Opal may recognize place as next gap.

  Bounded CollectiveFit / candidate interfaces. No feed. No UI redesign.

  Future inputs: time, relationship context, location fit, travel burden,
  preferences, cost, weather, events, availability, outcomes.

  Output: 0–3 strong options. Prefer 1 when confidence is strong.
  """

  alias OpalCore.SocialFlow.DynamicIntelligence.CollectiveFit

  @max_options 3

  @doc """
  Detect whether place is the next unresolved gap after time alignment.
  """
  def next_gap(attrs) when is_map(attrs) do
    a = stringify(attrs)

    time_aligned? =
      a["time_aligned"] == true or a["time_gap"] in ["resolved", :resolved, "resolved"]

    place_known? = a["place_known"] == true or a["place_gap"] in ["resolved", :resolved]

    cond do
      not time_aligned? ->
        {:gap, :time_availability}

      time_aligned? and not place_known? ->
        {:gap, :place}

      true ->
        :none
    end
  end

  def next_gap(_), do: :none

  @doc """
  Rank place candidates (0–3). Delegates hard constraint logic to CollectiveFit.
  """
  def rank_candidates(venues, participants, time_window) do
    {options, preferred} = CollectiveFit.rank(venues, participants, time_window)
    options = Enum.take(options, @max_options)

    preferred =
      if length(options) == 1 or strong_preferred?(preferred, options) do
        preferred
      else
        # Prefer 1 only when confidence is strong; otherwise leave choice
        if length(options) <= 1, do: preferred, else: nil
      end

    %{
      "schema_version" => "0.1.0",
      "options" => options,
      "preferred" => preferred,
      "max_options" => @max_options,
      "authorizes_set" => false,
      "no_feed" => true
    }
  end

  def max_options, do: @max_options

  defp strong_preferred?(nil, _), do: false

  defp strong_preferred?(preferred, options) when is_map(preferred) do
    score = preferred["fit_score_internal"] || 0

    second =
      options
      |> Enum.drop(1)
      |> List.first()
      |> case do
        nil -> 0
        o -> o["fit_score_internal"] || 0
      end

    score >= 2.0 and score - second >= 0.5
  end

  defp strong_preferred?(_, _), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
