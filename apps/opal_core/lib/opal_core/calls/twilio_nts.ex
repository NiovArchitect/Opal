defmodule OpalCore.Calls.TwilioNts do
  @moduledoc """
  Twilio Network Traversal Service (NTS) — time-limited TURN credentials.

  Why Twilio NTS (not coturn / Cloudflare Calls TURN):
  - Twilio account is already live for Verify + Messaging (no new vendor).
  - NTS returns STUN + TURN ice_servers with ephemeral username/password.
  - Operational burden stays on Twilio; self-hosted coturn is deferred.

  API: POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Tokens.json
  Auth: Basic SID:AUTH_TOKEN
  """

  require Logger

  @tokens_path "/2010-04-01/Accounts"

  @doc """
  Mint NTS credentials.

  Returns `{:ok, %{ice_servers: [...], ttl: integer, username: ..., password: ...}}`
  or `{:disabled, reason}` when Twilio account creds are missing,
  or `{:error, reason}` on HTTP failure.
  """
  def mint do
    case account_creds() do
      {:ok, cfg} -> request_token(cfg)
      {:disabled, reason} -> {:disabled, reason}
    end
  end

  @doc "True when account SID + auth token are present (NTS does not need Verify SID)."
  def configured? do
    match?({:ok, _}, account_creds())
  end

  defp account_creds do
    sid = blank_to_nil(System.get_env("OPAL_TWILIO_ACCOUNT_SID"))
    token = blank_to_nil(System.get_env("OPAL_TWILIO_AUTH_TOKEN"))

    cond do
      is_binary(sid) and is_binary(token) ->
        {:ok, %{account_sid: sid, auth_token: token}}

      true ->
        {:disabled, "TURN not configured"}
    end
  end

  defp request_token(cfg) do
    url = "https://api.twilio.com#{@tokens_path}/#{cfg.account_sid}/Tokens.json"
    auth = Base.encode64("#{cfg.account_sid}:#{cfg.auth_token}")

    headers = [
      {"authorization", "Basic #{auth}"},
      {"content-type", "application/x-www-form-urlencoded"},
      {"accept", "application/json"}
    ]

    http = Application.get_env(:opal_core, :twilio_nts_http_client, :httpc)

    case do_request(http, url, headers) do
      {:ok, body} when is_map(body) ->
        ice = normalize_ice_servers(body["ice_servers"] || body[:ice_servers] || [])
        ttl = parse_ttl(body["ttl"] || body[:ttl])

        {:ok,
         %{
           ice_servers: ice,
           ttl: ttl,
           username: body["username"] || body[:username],
           password: body["password"] || body[:password]
         }}

      {:ok, _} ->
        {:error, :unexpected_body}

      {:error, reason} ->
        Logger.warning("turn.nts_mint_failed reason=#{inspect(reason)}")
        {:error, reason}
    end
  end

  defp do_request(:httpc, url, headers) do
    _ = Application.ensure_all_started(:inets)
    _ = Application.ensure_all_started(:ssl)

    request = {
      String.to_charlist(url),
      Enum.map(headers, fn {k, v} -> {String.to_charlist(k), String.to_charlist(v)} end),
      ~c"application/x-www-form-urlencoded",
      ~c""
    }

    case :httpc.request(:post, request, [timeout: 15_000, connect_timeout: 8_000], body_format: :binary) do
      {:ok, {{_, 201, _}, _, response}} -> decode_body(response)
      {:ok, {{_, 200, _}, _, response}} -> decode_body(response)
      {:ok, {{_, status, _}, _, response}} -> {:error, {:http_status, status, io_to_bin(response)}}
      {:error, reason} -> {:error, reason}
    end
  end

  defp do_request(fun, url, headers) when is_function(fun, 2) do
    fun.(url, headers)
  end

  defp do_request(other, url, headers) do
    case other do
      mod when is_atom(mod) ->
        if function_exported?(mod, :post, 2) do
          mod.post(url, headers)
        else
          do_request(:httpc, url, headers)
        end

      _ ->
        do_request(:httpc, url, headers)
    end
  end

  defp decode_body(response) do
    bin = io_to_bin(response)

    case Jason.decode(bin) do
      {:ok, map} -> {:ok, map}
      {:error, _} -> {:error, :undecodable_body}
    end
  end

  defp normalize_ice_servers(list) when is_list(list) do
    Enum.map(list, fn entry ->
      urls = entry["urls"] || entry[:urls] || entry["url"] || entry[:url]
      username = entry["username"] || entry[:username]
      credential = entry["credential"] || entry[:credential] || entry["password"] || entry[:password]

      base = %{"urls" => urls}
      base = if is_binary(username) and username != "", do: Map.put(base, "username", username), else: base
      base = if is_binary(credential) and credential != "", do: Map.put(base, "credential", credential), else: base
      base
    end)
  end

  defp normalize_ice_servers(_), do: []

  defp parse_ttl(ttl) when is_integer(ttl) and ttl > 0, do: ttl

  defp parse_ttl(ttl) when is_binary(ttl) do
    case Integer.parse(ttl) do
      {n, _} when n > 0 -> n
      _ -> 86_400
    end
  end

  defp parse_ttl(_), do: 86_400

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(v) when is_binary(v), do: v
  defp blank_to_nil(_), do: nil

  defp io_to_bin(bin) when is_binary(bin), do: bin
  defp io_to_bin(charlist) when is_list(charlist), do: List.to_string(charlist)
  defp io_to_bin(other), do: to_string(other)
end
