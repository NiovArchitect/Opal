defmodule OpalCore.SocialFlow.Physical.Providers.PayloadSanitize do
  @moduledoc """
  Treat provider payloads as untrusted.

  Validate types, strip HTML, bound nesting, reject unsafe URLs.
  """

  @max_string 500
  @max_list 50
  @max_depth 6

  @doc "Sanitize a string field for storage/normalization."
  def string(v, opts \\ []) do
    max = Keyword.get(opts, :max, @max_string)

    cond do
      is_binary(v) ->
        v
        |> String.replace(~r/<[^>]*>/, "")
        |> String.trim()
        |> String.slice(0, max)

      is_number(v) ->
        to_string(v)

      true ->
        nil
    end
  end

  def number(v) when is_number(v), do: v

  def number(v) when is_binary(v) do
    case Float.parse(v) do
      {n, _} -> n
      :error -> nil
    end
  end

  def number(_), do: nil

  def bool(true), do: true
  def bool(false), do: false
  def bool("true"), do: true
  def bool("false"), do: false
  def bool(_), do: nil

  def datetime(nil), do: nil

  def datetime(v) when is_binary(v) do
    case DateTime.from_iso8601(v) do
      {:ok, dt, _} ->
        dt

      _ ->
        # Ticketmaster often uses trailing Z already handled; try naive
        case NaiveDateTime.from_iso8601(v) do
          {:ok, ndt} -> DateTime.from_naive!(ndt, "Etc/UTC")
          _ -> nil
        end
    end
  end

  def datetime(%DateTime{} = dt), do: dt
  def datetime(_), do: nil

  def latlng(lat, lng) do
    lat = number(lat)
    lng = number(lng)

    if is_number(lat) and is_number(lng) and lat >= -90 and lat <= 90 and lng >= -180 and
         lng <= 180 do
      %{"lat" => lat, "lng" => lng}
    else
      nil
    end
  end

  def safe_url(v) when is_binary(v) do
    v = String.trim(v)

    if String.starts_with?(v, "https://") and not String.contains?(v, ["<", ">", "javascript:"]) do
      String.slice(v, 0, 500)
    else
      nil
    end
  end

  def safe_url(_), do: nil

  @doc "Walk map/list and coerce to bounded safe structure."
  def deep(value, depth \\ 0)
  def deep(_, depth) when depth > @max_depth, do: nil
  def deep(v, _) when is_binary(v), do: string(v)
  def deep(v, _) when is_number(v), do: v
  def deep(v, _) when is_boolean(v), do: v
  def deep(v, _) when is_nil(v), do: nil

  def deep(list, depth) when is_list(list) do
    list
    |> Enum.take(@max_list)
    |> Enum.map(&deep(&1, depth + 1))
    |> Enum.reject(&is_nil/1)
  end

  def deep(map, depth) when is_map(map) do
    map
    |> Enum.take(40)
    |> Map.new(fn {k, v} -> {to_string(k), deep(v, depth + 1)} end)
  end

  def deep(_, _), do: nil
end
