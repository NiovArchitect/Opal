defmodule OpalCore.SocialFlow.CalendarFreeBusyContract do
  @moduledoc """
  Integration boundary for calendar free/busy.

  No fake claims. No live OAuth. No event titles in shared surfaces.

  Calendar should ideally expose free/busy only — not event titles.
  It feeds **private** context. User experience remains:

  > Thursday lines up.

  Not:

  > please manually inspect your calendar.
  """

  @schema "0.1.0"

  @doc "Build a private free/busy fact (owner-only)."
  def private_busy_block(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, s} <- parse_dt(a["start_at"]),
         {:ok, e} <- parse_dt(a["end_at"]) do
      if DateTime.compare(e, s) == :gt do
        {:ok,
         %{
           "schema_version" => @schema,
           "source" => "calendar_free_busy",
           "owner_user_id" => a["owner_user_id"],
           "start_at" => s,
           "end_at" => e,
           "busy" => a["busy"] != false,
           "permission_scope" => "owner_private",
           "observed_at" => a["observed_at"] || DateTime.utc_now(),
           "valid_until" => a["valid_until"],
           "confidence" => 0.9,
           # Never carry titles into the fact contract used for fusion
           "no_event_titles" => true,
           "revoked" => false
         }}
      else
        {:error, :invalid_range}
      end
    end
  end

  def private_busy_block(_), do: {:error, :invalid}

  @doc """
  Invert busy blocks into free windows within a horizon (private).
  """
  def free_windows(busy_blocks, horizon_start, horizon_end)
      when is_list(busy_blocks) do
    with {:ok, hs} <- parse_dt(horizon_start),
         {:ok, he} <- parse_dt(horizon_end) do
      busy =
        busy_blocks
        |> Enum.map(&stringify/1)
        |> Enum.filter(&(&1["busy"] != false))
        |> Enum.map(fn b ->
          {:ok, s} = parse_dt(b["start_at"])
          {:ok, e} = parse_dt(b["end_at"])
          {s, e}
        end)
        |> Enum.sort_by(fn {s, _} -> DateTime.to_unix(s, :microsecond) end)

      free = subtract_busy(hs, he, busy)

      {:ok,
       Enum.map(free, fn {s, e} ->
         %{
           "schema_version" => @schema,
           "source" => "calendar_free_busy",
           "start_at" => s,
           "end_at" => e,
           "permission_scope" => "owner_private",
           "confidence" => 0.9,
           "no_event_titles" => true
         }
       end)}
    end
  end

  def free_windows(_, _, _), do: {:error, :invalid}

  @doc "Shared-safe copy never mentions calendar inspection or event titles."
  def shared_safe_copy(%{"overlap_label" => label}) when is_binary(label), do: label
  def shared_safe_copy(_), do: "A time lines up."

  @doc "Capability readiness — integration not claimed live."
  def readiness do
    %{
      "contract_ready" => true,
      "oauth_connected" => false,
      "live_sync" => false,
      "exposes_event_titles" => false,
      "feeds_private_context_only" => true
    }
  end

  defp subtract_busy(start_at, end_at, []), do: [{start_at, end_at}]

  defp subtract_busy(start_at, end_at, busy) do
    {free, cursor} =
      Enum.reduce(busy, {[], start_at}, fn {bs, be}, {acc, cur} ->
        cond do
          DateTime.compare(be, cur) != :gt ->
            {acc, cur}

          DateTime.compare(bs, cur) == :gt ->
            gap_end = min_dt(bs, end_at)

            if DateTime.compare(gap_end, cur) == :gt do
              {acc ++ [{cur, gap_end}], max_dt(cur, be)}
            else
              {acc, max_dt(cur, be)}
            end

          true ->
            {acc, max_dt(cur, be)}
        end
      end)

    if DateTime.compare(end_at, cursor) == :gt do
      free ++ [{cursor, end_at}]
    else
      free
    end
  end

  defp max_dt(a, b), do: if(DateTime.compare(a, b) == :gt, do: a, else: b)
  defp min_dt(a, b), do: if(DateTime.compare(a, b) == :lt, do: a, else: b)

  defp parse_dt(%DateTime{} = dt), do: {:ok, DateTime.truncate(dt, :microsecond)}

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> {:error, :invalid_datetime}
    end
  end

  defp parse_dt(_), do: {:error, :invalid_datetime}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
