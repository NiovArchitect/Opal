defmodule OpalCoreWeb.Plugs.Cors do
  @moduledoc """
  Credentialed CORS for approved Opal client origins.
  """

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    origin = conn |> get_req_header("origin") |> List.first()
    allowed = allowed_origins()

    conn =
      if origin && origin in allowed do
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
end
