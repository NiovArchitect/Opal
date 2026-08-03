defmodule OpalCoreWeb.Plugs.FetchCookies do
  @moduledoc false
  import Plug.Conn

  def init(opts), do: opts
  def call(conn, _opts), do: fetch_cookies(conn)
end
