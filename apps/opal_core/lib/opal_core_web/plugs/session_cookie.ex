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

  # Cookie policy:
  # - Same-site Opal hosts (*.niovlabs.com API): SameSite=Lax + Secure + host-only (no Domain).
  #   Prefer this for Safari refresh reliability with opal.niovlabs.com web.
  # - Cross-site fallback (*.onrender.com): SameSite=None + Secure + Partitioned (CHIPS).
  # Never set a broad Domain=.niovlabs.com (would share with unrelated products).
  defp cookie_opts(conn) do
    secure? = https?(conn)
    mode = cookie_mode(conn)

    base = [
      secure: secure?,
      same_site: if(mode == :same_site, do: "Lax", else: if(secure?, do: "None", else: "Lax")),
      max_age: ProductSession.max_age_sec(),
      path: "/"
    ]

    cond do
      mode == :cross_site and secure? ->
        Keyword.put(base, :extra, "Partitioned")

      true ->
        base
    end
  end

  defp cookie_mode(conn) do
    case System.get_env("OPAL_COOKIE_SAMESITE") do
      v when v in ["Lax", "lax", "same_site", "SAME_SITE"] ->
        :same_site

      v when v in ["None", "none", "cross_site", "CROSS_SITE"] ->
        :cross_site

      _ ->
        host = conn.host || ""

        if String.ends_with?(host, ".niovlabs.com") or host == "niovlabs.com" do
          :same_site
        else
          :cross_site
        end
    end
  end

  defp https?(conn) do
    conn.scheme == :https or
      get_req_header(conn, "x-forwarded-proto") |> List.first() == "https"
  end
end
