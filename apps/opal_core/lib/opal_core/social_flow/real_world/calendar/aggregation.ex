defmodule OpalCore.SocialFlow.RealWorld.Calendar.Aggregation do
  @moduledoc """
  Multi-calendar free/busy aggregation.

  Default policy: busy on any enabled calendar ⇒ busy (prevent false free).
  Calendar names never exposed socially.
  """

  @doc """
  Merge busy blocks from multiple calendars.

  Input: %{calendar_id => %{"busy" => [%{"start" => ..., "end" => ...}]}}
  or list of busy maps.
  """
  def merge_busy(calendars) when is_map(calendars) do
    busy =
      calendars
      |> Enum.flat_map(fn {_id, cal} ->
        cal = stringify(cal)
        List.wrap(cal["busy"])
      end)
      |> Enum.map(&normalize/1)
      |> Enum.reject(&is_nil/1)
      |> merge_intervals()

    {:ok, busy}
  end

  def merge_busy(list) when is_list(list) do
    busy =
      list
      |> Enum.map(&normalize/1)
      |> Enum.reject(&is_nil/1)
      |> merge_intervals()

    {:ok, busy}
  end

  def merge_busy(_), do: {:ok, []}

  @doc "True if interval is free under busy-on-any policy."
  def free_during?(busy_blocks, %DateTime{} = start_at, %DateTime{} = end_at)
      when is_list(busy_blocks) do
    not Enum.any?(busy_blocks, fn b ->
      b = stringify(b)
      s = b["start_at"] || b[:start_at]
      e = b["end_at"] || b[:end_at]

      match?(%DateTime{}, s) and match?(%DateTime{}, e) and
        DateTime.compare(e, start_at) == :gt and DateTime.compare(end_at, s) == :gt
    end)
  end

  def free_during?(_, _, _), do: false

  defp normalize(%{"start" => s, "end" => e}), do: normalize(%{"start_at" => s, "end_at" => e})

  defp normalize(%{"start_at" => s, "end_at" => e}) do
    with {:ok, start_at} <- parse_dt(s),
         {:ok, end_at} <- parse_dt(e) do
      %{
        "start_at" => start_at,
        "end_at" => end_at,
        "busy" => true,
        "no_event_titles" => true
      }
    else
      _ -> nil
    end
  end

  defp normalize(%{start_at: s, end_at: e}),
    do: normalize(%{"start_at" => s, "end_at" => e})

  defp normalize(_), do: nil

  defp merge_intervals([]), do: []

  defp merge_intervals(blocks) do
    blocks
    |> Enum.sort_by(&DateTime.to_unix(&1["start_at"], :microsecond))
    |> Enum.reduce([], fn cur, acc ->
      case acc do
        [] ->
          [cur]

        [prev | rest] ->
          if DateTime.compare(cur["start_at"], prev["end_at"]) != :gt do
            merged = %{
              prev
              | "end_at" =>
                  if(DateTime.compare(cur["end_at"], prev["end_at"]) == :gt,
                    do: cur["end_at"],
                    else: prev["end_at"]
                  )
            }

            [merged | rest]
          else
            [cur, prev | rest]
          end
      end
    end)
    |> Enum.reverse()
  end

  defp parse_dt(%DateTime{} = dt), do: {:ok, DateTime.truncate(dt, :microsecond)}

  defp parse_dt(iso) when is_binary(iso) do
    iso = if String.ends_with?(iso, "Z") or String.contains?(iso, "+"), do: iso, else: iso <> "Z"

    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> :error
    end
  end

  defp parse_dt(_), do: :error

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
