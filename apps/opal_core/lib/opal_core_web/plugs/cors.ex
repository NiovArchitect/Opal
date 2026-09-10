defmodule OpalCoreWeb.Plugs.Cors do
  @moduledoc """
  Credentialed CORS for approved Opal client origins.

  Production: explicit allow-list (+ OPAL_CORS_ORIGINS).

  Development only: also allow private-LAN Vite origins
  (http://192.168.x.x:5173–5176, 10.x, 172.16–31) so a physical iPhone
  WebView loading Vite over LAN can call Phoenix when not using the
  same-origin Vite proxy. Never enables wildcard production CORS.
  """

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    origin = conn |> get_req_header("origin") |> List.first()

    conn =
      if origin_allowed?(origin) do
        conn
        |> put_resp_header("access-control-allow-origin", origin)
        |> put_resp_header("access-control-allow-credentials", "true")
        |> put_resp_header(
          "access-control-allow-headers",
          "authorization, content-type, x-csrf-token, x-opal-dev-user-id"
        )
        |> put_resp_header(
          "access-control-allow-methods",
          "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
        |> put_resp_header("access-control-expose-headers", "x-csrf-token")
        |> put_resp_header("vary", "Origin")
      else
        conn
      end

    if conn.method == "OPTIONS" do
      conn
      |> send_resp(204, "")
      |> halt()
    else
      conn
    end
  end

  def allowed_origins do
    # Vite may bump ports when 5173 is occupied (5174+). Include common local origins.
    defaults =
      for host <- ["localhost", "127.0.0.1"],
          port <- [5173, 5174, 5175, 5176, 4173, 4174] do
        "http://#{host}:#{port}"
      end ++
        [
          "https://opal.niovlabs.com",
          "http://opal.niovlabs.com"
        ]

    extra =
      (System.get_env("OPAL_CORS_ORIGINS") || "")
      |> String.split(",", trim: true)
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 == ""))

    Enum.uniq(defaults ++ extra)
  end

  @doc false
  def origin_allowed?(origin) when is_binary(origin) do
    origin in allowed_origins() or (dev_env?() and private_lan_vite_origin?(origin))
  end

  def origin_allowed?(_), do: false

  defp dev_env? do
    System.get_env("MIX_ENV", "prod") in ["dev", "test"]
  end

  defp private_lan_vite_origin?(origin) do
    case URI.parse(origin) do
      %URI{scheme: "http", host: host, port: port}
      when is_binary(host) and port in 5173..5176 ->
        private_ipv4?(host)

      _ ->
        false
    end
  end

  defp private_ipv4?(host) do
    case :inet.parse_address(String.to_charlist(host)) do
      {:ok, {a, b, _c, _d}} ->
        a == 10 or (a == 192 and b == 168) or (a == 172 and b >= 16 and b <= 31)

      _ ->
        false
    end
  end
end
