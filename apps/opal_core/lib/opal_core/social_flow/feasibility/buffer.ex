defmodule OpalCore.SocialFlow.Feasibility.Buffer do
  @moduledoc """
  Transition buffer between activities (parking, walking, leaving work).

  Conservative/deterministic defaults. Corrections improve later.
  Does not infer intimate routine.
  """

  @default_minutes 10
  @min_minutes 5
  @max_minutes 45

  def default_minutes, do: @default_minutes

  @doc """
  Buffer minutes for a transition context.

  opts: :mode (:driving | :walking | :transit), :context (:work_leave | :general)
  """
  def minutes(opts \\ []) do
    base =
      case Keyword.get(opts, :mode, :driving) do
        :walking -> 8
        :transit -> 12
        :driving -> @default_minutes
        _ -> @default_minutes
      end

    base =
      case Keyword.get(opts, :context) do
        :work_leave -> base + 5
        :parking_heavy -> base + 8
        _ -> base
      end

    base
    |> max(@min_minutes)
    |> min(@max_minutes)
  end

  @doc "Apply buffer before a start time: effective_ready = start - travel - buffer."
  def leave_by(%DateTime{} = start_at, travel_minutes, opts \\ []) do
    buf = minutes(opts)
    travel = max(0, to_num(travel_minutes))
    total = round((travel + buf) * 60)
    DateTime.add(start_at, -total, :second) |> DateTime.truncate(:microsecond)
  end

  defp to_num(n) when is_number(n), do: n * 1.0
  defp to_num(_), do: 0.0
end
