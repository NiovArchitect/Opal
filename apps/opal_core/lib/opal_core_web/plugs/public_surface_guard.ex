defmodule OpalCoreWeb.Plugs.PublicSurfaceGuard do
  @moduledoc """
  Hostname-keyed refusal of dev/seed surfaces on public (funnel) hosts.

  Added 2026-10-22 for the Tailscale Funnel enablement (walk stack;
  proven locally as uncommitted edits in the opal-walk checkout, then
  landed on muse/repair-28 in Repair #28 so no stack advance drops
  them — see coordination/repair19/funnel-enablement-2026-10-22.md).

  When the request Host is one of OPAL_FUNNEL_HOSTS (comma-separated),
  the dev and founder-seed endpoints answer 404, as if unrouted.
  On any other host (localhost / LAN) this plug is a no-op, so the
  founder's local walk path is unchanged. With OPAL_FUNNEL_HOSTS
  unset or empty, the plug is entirely inert.
  """

  import Plug.Conn

  @refused_prefixes ["/api/dev", "/api/v1/dev"]
  @refused_paths [
    "/api/v1/product/dev/founder-communication-seed",
    "/api/v1/product/dev/founder-graph-commitment-seed"
  ]

  def init(opts), do: opts

  def call(conn, _opts) do
    if public_host?(conn.host) and refused?(conn.request_path) do
      conn
      |> put_resp_content_type("application/json")
      |> send_resp(
        404,
        Jason.encode!(%{"error_code" => "not_found", "message" => "Not found"})
      )
      |> halt()
    else
      conn
    end
  end

  defp public_host?(host) do
    hosts =
      (System.get_env("OPAL_FUNNEL_HOSTS") || "")
      |> String.split(",", trim: true)
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 == ""))

    host in hosts
  end

  defp refused?(path) do
    path in @refused_paths or
      Enum.any?(@refused_prefixes, fn prefix ->
        path == prefix or String.starts_with?(path, prefix <> "/")
      end)
  end
end
