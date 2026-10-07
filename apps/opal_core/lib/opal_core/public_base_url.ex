defmodule OpalCore.PublicBaseUrl do
  @moduledoc """
  Absolute public base URL for webhooks, invite links, push deep links, OAuth.

  Modes (`OPAL_PUBLIC_BASE_MODE` or Application `:public_base_mode`):
  - `:lan` (default) — Mac LAN IP + Phoenix port (or `OPAL_PUBLIC_BASE_URL` override)
  - `:tunnel` — ngrok/cloudflared URL from `~/.opal/tunnel.env` or `OPAL_PUBLIC_BASE_URL`
  - `:production` — production domain (`OPAL_PUBLIC_BASE_URL` or https://opal.niovlabs.com)

  Tunnel file is NEVER committed; written by `scripts/opal_tunnel_start.sh`.
  """

  @tunnel_env_path Path.expand("~/.opal/tunnel.env")
  @default_prod "https://opal.niovlabs.com"
  @default_port 4000

  def tunnel_env_path, do: @tunnel_env_path

  def mode do
    case Application.get_env(:opal_core, :public_base_mode) ||
           System.get_env("OPAL_PUBLIC_BASE_MODE") ||
           "lan" do
      m when m in [:lan, "lan"] -> :lan
      m when m in [:tunnel, "tunnel"] -> :tunnel
      m when m in [:production, "production"] -> :production
      _ -> :lan
    end
  end

  @doc "Absolute origin without trailing slash (https://….ngrok-free.app)."
  def base_url do
    explicit = Application.get_env(:opal_core, :public_base_url) || System.get_env("OPAL_PUBLIC_BASE_URL")

    cond do
      is_binary(explicit) and String.trim(explicit) != "" ->
        trim_slash(explicit)

      mode() == :tunnel ->
        tunnel_api_url() || lan_url()

      mode() == :production ->
        @default_prod

      true ->
        lan_url()
    end
  end

  @doc "Build an absolute path under the public base."
  def url(path) when is_binary(path) do
    base = base_url()
    path = if String.starts_with?(path, "/"), do: path, else: "/" <> path
    base <> path
  end

  def url(_), do: base_url()

  @doc "Vite FE public URL when tunneling (URL_B)."
  def fe_base_url do
    explicit = System.get_env("OPAL_PUBLIC_FE_BASE_URL")

    cond do
      is_binary(explicit) and String.trim(explicit) != "" ->
        trim_slash(explicit)

      mode() == :tunnel ->
        read_tunnel_env("OPAL_TUNNEL_FE_URL") || lan_fe_url()

      true ->
        lan_fe_url()
    end
  end

  @doc "Reload ~/.opal/tunnel.env into process env (dev convenience)."
  def load_tunnel_env! do
    path = @tunnel_env_path

    if File.exists?(path) do
      path
      |> File.read!()
      |> String.split(~r/\r?\n/, trim: true)
      |> Enum.each(fn line ->
        case String.split(line, "=", parts: 2) do
          [k, v] ->
            k = String.trim(k)
            v = String.trim(v) |> String.trim("\"")

            if k != "" and not String.starts_with?(k, "#") do
              System.put_env(k, v)
            end

          _ ->
            :ok
        end
      end)

      :ok
    else
      {:error, :missing}
    end
  end

  def tunnel_api_url, do: read_tunnel_env("OPAL_TUNNEL_API_URL") || System.get_env("OPAL_TUNNEL_API_URL")

  def ngrok_host_allowed?(host) when is_binary(host) do
    String.ends_with?(host, ".ngrok.io") or
      String.ends_with?(host, ".ngrok-free.app") or
      String.ends_with?(host, ".ngrok.app") or
      String.ends_with?(host, ".loca.lt") or
      String.ends_with?(host, ".trycloudflare.com")
  end

  def ngrok_host_allowed?(_), do: false

  defp read_tunnel_env(key) do
    path = @tunnel_env_path

    if File.exists?(path) do
      path
      |> File.read!()
      |> String.split(~r/\r?\n/, trim: true)
      |> Enum.find_value(fn line ->
        case String.split(line, "=", parts: 2) do
          [^key, v] -> String.trim(v) |> String.trim("\"")
          [k, v] -> if String.trim(k) == key, do: String.trim(v) |> String.trim("\""), else: nil
          _ -> nil
        end
      end)
    else
      nil
    end
  end

  defp lan_url do
    ip = lan_ip()
    port = System.get_env("PORT") || Integer.to_string(@default_port)
    "http://#{ip}:#{port}"
  end

  defp lan_fe_url do
    ip = lan_ip()
    "http://#{ip}:5173"
  end

  defp lan_ip do
    System.get_env("OPAL_LAN_IP") || detect_lan_ip() || "127.0.0.1"
  end

  defp detect_lan_ip do
    case :inet.getifaddrs() do
      {:ok, ifs} ->
        ifs
        |> Enum.flat_map(fn {_name, opts} ->
          opts
          |> Keyword.get_values(:addr)
          |> Enum.filter(&match?({a, _, _, _} when a != 127, &1))
          |> Enum.map(&tuple_to_ip/1)
        end)
        |> Enum.find(&(String.starts_with?(&1, "192.168.") or String.starts_with?(&1, "10.") or
                         String.match?(&1, ~r/^172\.(1[6-9]|2\d|3[0-1])\./)))

      _ ->
        nil
    end
  rescue
    _ -> nil
  end

  defp tuple_to_ip({a, b, c, d}), do: "#{a}.#{b}.#{c}.#{d}"
  defp tuple_to_ip(_), do: nil

  defp trim_slash(url), do: String.trim_trailing(String.trim(url), "/")
end
