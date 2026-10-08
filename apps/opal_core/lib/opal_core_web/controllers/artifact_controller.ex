defmodule OpalCoreWeb.ArtifactController do
  @moduledoc """
  Paste G Phase 9 — product artifact create + public share HTML.

  Share route is intentionally outside product_auth (opaque expiring token).
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Artifacts
  alias OpalCore.Artifacts.Artifact

  @doc "POST /api/v1/product/artifacts — generate + return preview card payload."
  def create(conn, params) do
    user_id = conn.assigns.current_user_id
    kind = params["kind"]
    plan_id = params["plan_id"] || params["trip_id"] || params["source_id"]

    case Artifacts.generate(user_id, kind, plan_id) do
      {:ok, payload} ->
        conn
        |> put_status(:created)
        |> json(stringify(payload))

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

      {:error, :invalid_kind} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{"error" => "invalid_kind", "allowed" => Artifact.kinds()})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{"error" => error_string(reason)})
    end
  end

  @doc "GET /share/artifacts/:token — branded HTML (noindex)."
  def show_share(conn, %{"token" => token}) do
    case Artifacts.get_by_token(token) do
      {:ok, art} ->
        {:ok, html} = Artifacts.render_share_html(art)

        conn
        |> put_resp_header("x-robots-tag", "noindex, nofollow")
        |> put_resp_content_type("text/html")
        |> send_resp(200, html)

      {:error, :expired} ->
        friendly(conn, 410, "This shared plan link has expired.")

      {:error, _} ->
        friendly(conn, 404, "This shared plan link didn't work.")
    end
  end

  defp friendly(conn, status, message) do
    html = """
    <!doctype html><html lang="en"><head><meta charset="utf-8"/>
    <meta name="robots" content="noindex,nofollow"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Shared plan</title>
    <style>body{font-family:system-ui;background:#050816;color:#F8FAFF;margin:0;
      min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
      .card{max-width:420px;background:#0B1226;border-radius:20px;padding:28px}</style></head>
    <body><div class="card"><h1>#{esc(message)}</h1>
    <p>Ask your friend to share a fresh link from Opal.</p></div></body></html>
    """

    conn
    |> put_resp_header("x-robots-tag", "noindex, nofollow")
    |> put_resp_content_type("text/html")
    |> send_resp(status, html)
  end

  defp esc(nil), do: ""

  defp esc(s) when is_binary(s) do
    s
    |> String.replace("&", "&amp;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
    |> String.replace("\"", "&quot;")
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify(v)}
      {k, v} -> {to_string(k), stringify(v)}
    end)
  end

  defp stringify(list) when is_list(list), do: Enum.map(list, &stringify/1)
  defp stringify(other), do: other

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(reason) when is_binary(reason), do: reason
  defp error_string(reason), do: inspect(reason)
end
