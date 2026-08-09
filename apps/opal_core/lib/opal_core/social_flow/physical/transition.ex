defmodule OpalCore.SocialFlow.Physical.Transition do
  @moduledoc """
  Temporal-spatial transition: prior end + buffers + travel → realistic start.

  Example:
  prior ends 6:00, leave-building 10m, drive 25m, parking 10m → candidate 6:30 is unrealistic.
  Offer 6:45 / 7:00 instead of making the user calculate.
  """

  alias OpalCore.SocialFlow.Feasibility.Buffer
  alias OpalCore.SocialFlow.Physical.TravelProvider

  @doc """
  Compose leave-building + travel + arrival buffers into total transition minutes.
  """
  def total_minutes(attrs) when is_map(attrs) do
    a = stringify(attrs)
    mode = mode_atom(a["mode"] || "driving")

    leave_building =
      case a["leave_building_minutes"] do
        n when is_number(n) -> n
        _ -> Buffer.minutes(mode: mode, context: :work_leave)
      end

    travel =
      case a["travel_minutes"] do
        n when is_number(n) ->
          n

        _ ->
          case TravelProvider.estimate(a) do
            {:ok, t} -> t["duration_minutes"]
            _ -> 20.0
          end
      end

    arrival =
      case a["arrival_buffer_minutes"] do
        n when is_number(n) -> n
        _ -> Buffer.minutes(mode: mode, context: :parking_heavy)
      end

    total = leave_building + travel + arrival

    {:ok,
     %{
       "leave_building_minutes" => leave_building,
       "travel_minutes" => travel,
       "arrival_buffer_minutes" => arrival,
       "total_minutes" => Float.round(total * 1.0, 1),
       "mode" => to_string(mode),
       "estimate_class" => a["estimate_class"] || "composed_buffer_travel"
     }}
  end

  def total_minutes(_), do: {:error, :invalid}

  @doc """
  Assess whether candidate_start is realistic given prior_end + transition.
  Suggest alternate starts when not.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)
    prior = parse_dt(a["prior_end"])
    candidate = parse_dt(a["candidate_start"])

    with %DateTime{} <- prior,
         %DateTime{} <- candidate,
         {:ok, t} <- total_minutes(a) do
      needed_sec = round(t["total_minutes"] * 60)
      earliest = DateTime.add(prior, needed_sec, :second) |> DateTime.truncate(:microsecond)
      gap_sec = DateTime.diff(candidate, prior, :second)
      viable? = gap_sec >= needed_sec

      alternates =
        if viable? do
          []
        else
          # Snap to :15 boundaries after earliest
          [
            snap_quarter(earliest),
            snap_quarter(DateTime.add(earliest, 15 * 60, :second))
          ]
          |> Enum.uniq_by(&DateTime.to_iso8601/1)
        end

      leave_by = DateTime.add(candidate, -needed_sec, :second) |> DateTime.truncate(:microsecond)

      {:ok,
       %{
         "viable" => viable?,
         "feasibility" => if(viable?, do: "realistic", else: "unrealistic"),
         "earliest_start" => earliest,
         "alternate_starts" => alternates,
         "leave_by" => leave_by,
         "private_copy" =>
           if(viable?,
             do: private_leave_copy(leave_by),
             else: "That timing is tight — later works better."
           ),
         "transition" => t,
         "other_plan_revealed" => false,
         "origin_exposed" => false,
         "authorizes_set" => false
       }}
    else
      {:error, _} = err -> err
      _ -> {:error, :invalid}
    end
  end

  def assess(_), do: {:error, :invalid}

  defp private_leave_copy(%DateTime{} = leave_by) do
    h = leave_by.hour |> rem(12) |> then(fn x -> if x == 0, do: 12, else: x end)
    m = leave_by.minute |> Integer.to_string() |> String.pad_leading(2, "0")
    ampm = if leave_by.hour >= 12, do: "PM", else: "AM"
    "Leave around #{h}:#{m} #{ampm}."
  end

  defp snap_quarter(%DateTime{} = dt) do
    minute = dt.minute
    # Round up to next quarter-hour boundary
    add =
      cond do
        rem(minute, 15) == 0 and dt.second == 0 -> 0
        rem(minute, 15) == 0 -> 0
        true -> 15 - rem(minute, 15)
      end

    DateTime.add(dt, add * 60 - dt.second, :second) |> DateTime.truncate(:microsecond)
  end

  defp mode_atom("walking"), do: :walking
  defp mode_atom("transit"), do: :transit
  defp mode_atom("cycling"), do: :driving
  defp mode_atom("driving"), do: :driving
  defp mode_atom(_), do: :driving

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
