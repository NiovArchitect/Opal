defmodule OpalCore.Push.Payload do
  @moduledoc """
  Push notification payload. Plain-language title/body; data carries
  attention_item_id + level. Enforces APNs ~4KB limit by truncating body.
  """

  # APNs payload hard limit is 4096 bytes. Reserve headroom for JSON framing,
  # title, and data keys so the body never pushes the envelope over.
  @max_bytes 4096
  @framing_budget 512

  @type t :: %{
          title: String.t(),
          body: String.t(),
          data: %{String.t() => term()}
        }

  @doc """
  Build a safe payload map. Truncates body so encoded size stays ≤ 4KB.
  Never raises on oversize input.
  """
  def build(attrs) when is_map(attrs) do
    title = plain(attrs[:title] || attrs["title"] || "Opal")
    body = plain(attrs[:body] || attrs["body"] || "")
    data = normalize_data(attrs[:data] || attrs["data"] || %{})

    truncate(%{title: title, body: body, data: data})
  end

  def build(_), do: %{title: "Opal", body: "", data: %{}}

  @doc "JSON-encode size in bytes (UTF-8)."
  def encoded_size(%{title: title, body: body, data: data}) do
    Jason.encode!(%{title: title, body: body, data: data}) |> :erlang.byte_size()
  end

  defp truncate(%{title: title, body: body, data: data} = payload) do
    size = encoded_size(payload)

    if size <= @max_bytes do
      payload
    else
      overhead =
        Jason.encode!(%{title: title, body: "", data: data})
        |> :erlang.byte_size()

      allow = max(@max_bytes - overhead - @framing_budget, 0)
      %{title: title, body: truncate_utf8(body, allow), data: data}
    end
  end

  defp truncate_utf8(text, max) when is_binary(text) and is_integer(max) and max <= 0, do: ""

  defp truncate_utf8(text, max) when is_binary(text) and is_integer(max) do
    if :erlang.byte_size(text) <= max do
      text
    else
      text
      |> String.graphemes()
      |> Enum.reduce_while({"", 0}, fn g, {acc, n} ->
        gsize = :erlang.byte_size(g)

        if n + gsize > max do
          {:halt, {acc, n}}
        else
          {:cont, {acc <> g, n + gsize}}
        end
      end)
      |> elem(0)
    end
  end

  defp normalize_data(data) when is_map(data) do
    Map.new(data, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {to_string(k), stringify_val(v)}
    end)
  end

  defp normalize_data(_), do: %{}

  defp stringify_val(v) when is_atom(v), do: Atom.to_string(v)
  defp stringify_val(v), do: v

  defp plain(nil), do: ""
  defp plain(v) when is_binary(v), do: v
  defp plain(v), do: to_string(v)
end
