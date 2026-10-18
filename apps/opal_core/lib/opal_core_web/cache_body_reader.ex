defmodule OpalCoreWeb.CacheBodyReader do
  @moduledoc """
  Plug.Parsers body reader that caches the raw request body in
  `conn.assigns[:raw_body]`.

  Stripe webhook signature verification (HMAC over
  `"<timestamp>.<raw payload>"`) is only meaningful over the exact
  bytes received. Without this reader the parsed body was consumed by
  Plug.Parsers and the webhook controller's raw-body fallback read an
  empty string — signatures could never verify against real payloads
  (Repair #18, BS-16).
  """

  def read_body(conn, opts) do
    case Plug.Conn.read_body(conn, opts) do
      {:ok, body, conn} ->
        {:ok, body, put_raw(conn, body)}

      {:more, body, conn} ->
        {:more, body, put_raw(conn, body)}

      {:error, _} = error ->
        error
    end
  end

  defp put_raw(conn, chunk) do
    existing =
      case conn.assigns[:raw_body] do
        body when is_binary(body) -> body
        _ -> ""
      end

    Plug.Conn.assign(conn, :raw_body, existing <> chunk)
  end
end
