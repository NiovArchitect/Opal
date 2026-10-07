defmodule OpalCoreWeb.InviteLandingController do
  @moduledoc """
  Lightweight HTML landing for invite links (Phase 3).

  Choice: server-rendered HTML (works over ngrok without Vite).
  "Continue in browser" deep-links into the FE origin with ?invite=CODE.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Invites
  alias OpalCore.PublicBaseUrl
  alias OpalCore.Repo
  alias OpalCore.Accounts.User

  def show(conn, %{"code" => code}) do
    case Invites.get_by_code(code) do
      %{code: invite_code, inviter_id: inviter_id} = _invite ->
        inviter = Repo.get(User, inviter_id)
        name = (inviter && inviter.display_name) || "A friend"
        fe = PublicBaseUrl.fe_base_url()
        continue = "#{fe}/?invite=#{URI.encode_www_form(invite_code)}"
        app_store = "https://apps.apple.com/app/opal"

        html = """
        <!doctype html>
        <html lang="en"><head><meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>You're invited to Opal</title>
        <style>
          body{font-family:system-ui,-apple-system,sans-serif;background:#0b0b0f;color:#f5f2ea;
            margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
          .card{max-width:420px;background:#16161d;border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
          h1{font-size:1.35rem;margin:0 0 8px;font-weight:600}
          p{opacity:.85;line-height:1.45;margin:0 0 20px}
          .btn{display:block;text-align:center;text-decoration:none;border-radius:12px;padding:14px 16px;margin:8px 0;font-weight:600}
          .primary{background:#c4a574;color:#1a1208}
          .ghost{background:transparent;border:1px solid rgba(245,242,234,.25);color:#f5f2ea}
        </style></head><body>
        <div class="card">
          <h1>#{escape(name)} invited you to Opal</h1>
          <p>Opal is the social layer for plans with your people — chats, graphs, and trips that stay in sync.</p>
          <a class="btn primary" href="#{escape(continue)}">Continue in browser</a>
          <a class="btn ghost" href="#{escape(app_store)}">Get the app</a>
        </div></body></html>
        """

        conn
        |> put_resp_content_type("text/html")
        |> send_resp(200, html)

      _ ->
        friendly_error(conn)
    end
  end

  def missing(conn, _params), do: friendly_error(conn)

  defp friendly_error(conn) do
    html = """
    <!doctype html>
    <html lang="en"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Invite didn't work</title>
    <style>
      body{font-family:system-ui,sans-serif;background:#0b0b0f;color:#f5f2ea;margin:0;
        min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
      .card{max-width:420px;background:#16161d;border-radius:20px;padding:28px}
    </style></head><body>
    <div class="card"><h1>This invite didn't work</h1>
    <p>The link may be expired or mistyped. Ask your friend to send a fresh invite.</p>
    </div></body></html>
    """

    conn
    |> put_resp_content_type("text/html")
    |> send_resp(404, html)
  end

  defp escape(nil), do: ""
  defp escape(s) when is_binary(s) do
    s
    |> String.replace("&", "&amp;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
    |> String.replace("\"", "&quot;")
  end
end
