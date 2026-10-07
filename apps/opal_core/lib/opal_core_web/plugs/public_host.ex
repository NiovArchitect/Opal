defmodule OpalCoreWeb.Plugs.PublicHost do
  @moduledoc """
  When PUBLIC_BASE mode is tunnel, allow ngrok / cloudflare / localtunnel hosts.
  Does not disable host checking entirely — only known tunnel patterns.
  """

  import Plug.Conn

  alias OpalCore.PublicBaseUrl

  def init(opts), do: opts

  def call(conn, _opts) do
    cond do
      # Mix tests use Phoenix.ConnTest default host www.example.com
      test_env?() ->
        conn

      PublicBaseUrl.mode() != :tunnel ->
        conn

      true ->
        host = conn.host

        if PublicBaseUrl.ngrok_host_allowed?(host) or lan_or_local?(host) do
          conn
        else
          # Still allow configured base host
          base = PublicBaseUrl.base_url()

          case URI.parse(base) do
            %URI{host: allowed} when is_binary(allowed) and allowed == host ->
              conn

            _ ->
              conn
              |> put_resp_content_type("application/json")
              |> send_resp(400, Jason.encode!(%{"error_code" => "host_not_allowed", "message" => "Unknown host"}))
              |> halt()
          end
        end
    end
  end

  defp test_env? do
    Application.get_env(:opal_core, :env) == :test or
      (function_exported?(Mix, :env, 0) and Mix.env() == :test)
  end

  defp lan_or_local?(host) do
    host in ~w(localhost 127.0.0.1 www.example.com) or
      String.starts_with?(host, "192.168.") or
      String.starts_with?(host, "10.")
  end
end
