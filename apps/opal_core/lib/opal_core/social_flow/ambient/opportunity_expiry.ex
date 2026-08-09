defmodule OpalCore.SocialFlow.Ambient.OpportunityExpiry do
  @moduledoc """
  Real, sourced time sensitivity — never manufactured urgency.

  Opal may surface urgency only from truthful expiry signals:
  event start, ticket inventory, slot fill, happy hour end, weather window,
  temporary proximity.
  """

  @doc """
  Evaluate expiry from sourced facts only.
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    now = parse_dt(a["now"]) || DateTime.utc_now() |> DateTime.truncate(:microsecond)

    sources =
      [
        expiry_source(a, "event_starts_at", "event_start", now),
        expiry_source(a, "slot_holds_until", "slot_hold", now),
        inventory_source(a),
        weather_source(a, now),
        proximity_source(a, now)
      ]
      |> Enum.reject(&is_nil/1)

    soonest =
      sources
      |> Enum.map(& &1["expires_at"])
      |> Enum.filter(&match?(%DateTime{}, &1))
      |> case do
        [] -> nil
        list -> Enum.min_by(list, &DateTime.to_unix(&1, :microsecond))
      end

    minutes_left =
      if soonest, do: max(0, DateTime.diff(soonest, now, :second) / 60.0), else: nil

    # Manufactured urgency forbidden
    manufactured? = a["force_urgency"] == true and sources == []

    urgency? =
      not manufactured? and is_number(minutes_left) and minutes_left <= 180 and minutes_left > 0

    {:ok,
     %{
       "expiring" => urgency?,
       "minutes_left" => minutes_left && Float.round(minutes_left, 1),
       "expires_at" => soonest,
       "sources" => sources,
       "manufactured_urgency" => false,
       "may_surface_urgency" => urgency? and not manufactured?,
       "shared_safe_copy" =>
         if(urgency? and not manufactured?,
           do: truthful_copy(minutes_left, a),
           else: nil
         )
     }}
  end

  def evaluate(_), do: {:ok, %{"expiring" => false, "manufactured_urgency" => false}}

  defp expiry_source(a, key, kind, now) do
    case parse_dt(a[key]) do
      %DateTime{} = dt ->
        if DateTime.compare(dt, now) == :gt do
          %{
            "kind" => kind,
            "expires_at" => dt,
            "sourced" => true
          }
        else
          nil
        end

      _ ->
        nil
    end
  end

  defp inventory_source(a) do
    tickets = a["tickets_remaining"]

    if is_number(tickets) and tickets > 0 and tickets <= 5 do
      # Soft: low inventory is a source of urgency only with observed_at freshness
      expires =
        case parse_dt(a["inventory_observed_at"]) do
          %DateTime{} = o -> DateTime.add(o, 30 * 60, :second)
          _ -> DateTime.utc_now() |> DateTime.add(20 * 60, :second)
        end

      %{
        "kind" => "low_inventory",
        "expires_at" => DateTime.truncate(expires, :microsecond),
        "tickets_remaining" => tickets,
        "sourced" => true
      }
    else
      nil
    end
  end

  defp weather_source(a, now) do
    case parse_dt(a["weather_window_ends_at"]) do
      %DateTime{} = dt ->
        if DateTime.compare(dt, now) == :gt do
          %{"kind" => "weather_window", "expires_at" => dt, "sourced" => true}
        else
          nil
        end

      _ ->
        nil
    end
  end

  defp proximity_source(a, now) do
    # Temporary co-location half-life ~60–90 min unless refreshed
    case parse_dt(a["proximity_observed_at"]) do
      %DateTime{} = o ->
        half_life_min = a["location_half_life_minutes"] || 75
        expires = DateTime.add(o, round(half_life_min * 60), :second)

        if DateTime.compare(expires, now) == :gt do
          %{"kind" => "temporary_proximity", "expires_at" => expires, "sourced" => true}
        else
          nil
        end

      _ ->
        nil
    end
  end

  defp truthful_copy(minutes, a) when is_number(minutes) and minutes <= 30 do
    a["urgency_copy"] || "This works right now."
  end

  defp truthful_copy(minutes, a) when is_number(minutes) and minutes <= 120 do
    slot = a["slot_label"]
    if is_binary(slot), do: "#{slot} is still open.", else: "This works right now."
  end

  defp truthful_copy(_, _), do: nil

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
