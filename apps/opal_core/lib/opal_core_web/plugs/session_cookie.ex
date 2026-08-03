defmodule OpalCoreWeb.Plugs.SessionCookie do
  @moduledoc """
  Helpers to set/clear product session and CSRF cookies.
  """

  import Plug.Conn

  alias OpalCore.Auth.ProductSession

  def put_session_cookies(conn, access_token) do
    csrf = ProductSession.new_csrf_token()
    secure? = https?(conn)
    same_site = if secure?, do: "None", else: "Lax"

    conn
    |> put_resp_cookie(ProductSession.cookie_name(), access_token,
      http_only: true,
      secure: secure?,
      same_site: same_site,
      max_age: ProductSession.max_age_sec(),
      path: "/"
    )
    |> put_resp_cookie(ProductSession.csrf_cookie_name(), csrf,
      http_only: false,
      secure: secure?,
      same_site: same_site,
      max_age: ProductSession.max_age_sec(),
      path: "/"
    )
    |> assign(:csrf_token, csrf)
  end

  def clear_session_cookies(conn) do
    secure? = https?(conn)
    same_site = if secure?, do: "None", else: "Lax"

    conn
    |> delete_resp_cookie(ProductSession.cookie_name(),
      http_only: true,
      secure: secure?,
      same_site: same_site,
      path: "/"
    )
    |> delete_resp_cookie(ProductSession.csrf_cookie_name(),
      http_only: false,
      secure: secure?,
      same_site: same_site,
      path: "/"
    )
  end

  defp https?(conn) do
    conn.scheme == :https or
      get_req_header(conn, "x-forwarded-proto") |> List.first() == "https"
  end
end
