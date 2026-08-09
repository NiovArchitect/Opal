defmodule OpalCore.SocialFlow.Feasibility.Travel do
  @moduledoc """
  Travel-aware feasibility for candidate times/places.

  Internal labels only: feasible | tight | unrealistic
  Never exposes a score to users.
  """

  alias OpalCore.SocialFlow.Feasibility.Buffer
  alias OpalCore.SocialFlow.RealWorld.Proximity.TravelProvider

  @tight_slack_minutes 10

  @doc """
  Assess whether a candidate start is realistic given prior end + travel.

  attrs:
  - prior_end_at (optional)
  - candidate_start
  - travel_minutes (optional; estimated if origin/dest provided)
  - buffer_opts
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)
    candidate = parse_dt(a["candidate_start"])
    prior_end = parse_dt(a["prior_end_at"])

    with %DateTime{} <- candidate do
      travel = travel_minutes(a)
      buf = Buffer.minutes(buffer_opts(a))
      needed = travel + buf

      {label, leave_by} =
        cond do
          is_nil(prior_end) ->
            {:feasible, Buffer.leave_by(candidate, travel, buffer_opts(a))}

          true ->
            gap_minutes = DateTime.diff(candidate, prior_end, :second) / 60.0
            leave = Buffer.leave_by(candidate, travel, buffer_opts(a))

            cond do
              gap_minutes >= needed + @tight_slack_minutes ->
                {:feasible, leave}

              gap_minutes >= needed ->
                {:tight, leave}

              true ->
                {:unrealistic, leave}
            end
        end

      {:ok,
       %{
         "feasibility" => to_string(label),
         "travel_minutes" => travel,
         "buffer_minutes" => buf,
         "leave_by" => leave_by,
         "origin_exposed" => false,
         "score_exposed" => false,
         "authorizes_set" => false
       }}
    else
      _ -> {:error, :invalid_candidate}
    end
  end

  def assess(_), do: {:error, :invalid}

  @doc "True if feasibility is usable for recommendation."
  def usable?(%{"feasibility" => f}) when f in ~w(feasible tight), do: true
  def usable?(%{feasibility: f}) when f in [:feasible, :tight, "feasible", "tight"], do: true
  def usable?(_), do: false

  defp travel_minutes(a) do
    case a["travel_minutes"] do
      n when is_number(n) ->
        n * 1.0

      _ ->
        case TravelProvider.estimate(a) do
          {:ok, %{"duration_minutes" => d}} -> d
          _ -> 20.0
        end
    end
  end

  defp buffer_opts(a) do
    mode =
      case a["mode"] || a["travel_mode"] do
        "walking" -> :walking
        "transit" -> :transit
        _ -> :driving
      end

    context =
      case a["buffer_context"] do
        "work_leave" -> :work_leave
        "parking_heavy" -> :parking_heavy
        _ -> :general
      end

    [mode: mode, context: context]
  end

  defp parse_dt(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)

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
