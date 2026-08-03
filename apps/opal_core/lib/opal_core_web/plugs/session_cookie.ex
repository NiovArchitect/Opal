defmodule OpalCoreWeb.Plugs.SessionCookie do
  @moduledoc """
  Helpers to set/clear product session and CSRF cookies.
  """

  import Plug.Conn

  alias OpalCore.Auth.ProductSession

  def put_session_cookies(conn, access_token) do
    csrf = ProductSession.new_csrf_token()
    opts = cookie_opts(conn)

    conn
    |> put_resp_cookie(
      ProductSession.cookie_name(),
      access_token,
      Keyword.put(opts, :http_only, true)
    )
    |> put_resp_cookie(
      ProductSession.csrf_cookie_name(),
      csrf,
      Keyword.put(opts, :http_only, false)
    )
    |> assign(:csrf_token, csrf)
  end

  def clear_session_cookies(conn) do
    opts = cookie_opts(conn)

    conn
    |> delete_resp_cookie(
      ProductSession.cookie_name(),
      Keyword.put(opts, :http_only, true)
    )
    |> delete_resp_cookie(
      ProductSession.csrf_cookie_name(),
      Keyword.put(opts, :http_only, false)
    )
  end

  # Cross-origin web (opal.niovlabs.com → Render): SameSite=None + Secure.
  # Partitioned (CHIPS via :extra) helps Chrome keep third-party cookies after refresh.
  defp cookie_opts(conn) do
    secure? = https?(conn)
    same_site = if secure?, do: "None", else: "Lax"

    base = [
      secure: secure?,
      same_site: same_site,
      max_age: ProductSession.max_age_sec(),
      path: "/"
    ]

    if secure? do
      Keyword.put(base, :extra, "Partitioned")
    else
      base
    end
  end

  defp https?(conn) do
    conn.scheme == :https or
      get_req_header(conn, "x-forwarded-proto") |> List.first() == "https"
  end
end
