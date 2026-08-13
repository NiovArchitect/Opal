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
  Detect next gap — order-agnostic (delegates to SocialReality).

  Still returns `{:gap, :time_availability}` / `{:gap, :place}` for callers.
  Place can be next even if discovered after time; time can be next after place.
  """
  def next_gap(attrs) when is_map(attrs) do
    a = stringify(attrs)

    # PlaceGap API is time/place scoped. Do not invent an activity gap when callers
    # only pass time_aligned/place_known (historical contract → :none when both true).
    # Activity is only a gap when explicitly declared missing.
    gaps =
      [
        if(a["time_aligned"] == true or a["time_gap"] in ["resolved", :resolved],
          do: nil,
          else: "when"
        ),
        if(a["place_known"] == true or a["place_gap"] in ["resolved", :resolved],
          do: nil,
          else: "where"
        ),
        if(a["activity_known"] == false or a["activity_gap"] in ["open", :open],
          do: "what",
          else: nil
        )
      ]
      |> Enum.reject(&is_nil/1)

    dims = %{
      "when_known" => a["time_aligned"] == true or a["time_gap"] in ["resolved", :resolved],
      "where_known" => a["place_known"] == true or a["place_gap"] in ["resolved", :resolved],
      "what_known" => a["activity_known"] != false,
      "where_matters" => a["where_matters"] != false and a["remote"] != true,
      "fixed_event" => a["fixed_event"] == true,
      "speaker_count" => a["speaker_count"] || 2
    }

    case OpalCore.SocialFlow.SocialReality.next_meaningful_gap(gaps, dims, :still_open) do
      :time -> {:gap, :time_availability}
      :place -> {:gap, :place}
      :activity -> {:gap, :activity}
      :none -> :none
      other -> {:gap, other}
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
