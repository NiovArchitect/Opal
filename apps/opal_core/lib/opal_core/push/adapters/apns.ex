defmodule OpalCore.Push.Adapters.APNS do
  @moduledoc """
  APNs HTTP/2 push adapter. Credentials from env only:

    APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_AUTH_KEY (PEM contents or path)

  When credentials are absent, callers must fall back to Synthetic — this
  module returns `{:error, :credentials_absent}` and never fakes success.
  """

  @behaviour OpalCore.Push.Sender

  require Logger

  @impl OpalCore.Push.Sender
  def send(token, payload, opts \\ [])

  def send(token, payload, opts) when is_binary(token) and is_map(payload) do
    if credentials_present?() do
      deliver(token, payload, opts)
    else
      Logger.warning("push.apns credentials_absent — refusing fake success")
      {:error, :credentials_absent}
    end
  end

  def send(_, _, _), do: {:error, :invalid_payload}

  @doc "True when APNs key id, team id, bundle id, and auth key are configured."
  def credentials_present? do
    key_id = cred(:key_id) || System.get_env("APNS_KEY_ID")
    team_id = cred(:team_id) || System.get_env("APNS_TEAM_ID")
    bundle = cred(:bundle_id) || System.get_env("APNS_BUNDLE_ID")
    auth = cred(:auth_key) || System.get_env("APNS_AUTH_KEY") || System.get_env("APNS_KEY_PATH")

    present?(key_id) and present?(team_id) and present?(bundle) and present?(auth)
  end

  # Real client structure — JWT + HTTP/2 POST to api.push.apple.com.
  # Live delivery is gated on credentials; without them we never claim sent.
  defp deliver(token, payload, opts) do
    env = opts[:env] || opts["env"] || "sandbox"
    host = if env == "production", do: "api.push.apple.com", else: "api.sandbox.push.apple.com"
    bundle = cred(:bundle_id) || System.get_env("APNS_BUNDLE_ID")
    title = payload[:title] || payload["title"] || ""
    body = payload[:body] || payload["body"] || ""
    data = payload[:data] || payload["data"] || %{}

    aps = %{
      "aps" => %{
        "alert" => %{"title" => title, "body" => body},
        "sound" => "default"
      }
    }

    body_json = Jason.encode!(Map.merge(aps, stringify_data(data)))

    headers = [
      {"apns-topic", bundle},
      {"apns-push-type", "alert"},
      {"authorization", "bearer #{jwt()}"},
      {"content-type", "application/json"}
    ]

    url = "https://#{host}/3/device/#{token}"

    case http_post(url, body_json, headers) do
      {:ok, %{status: status}} when status in 200..299 ->
        Logger.info("push.apns sent status=#{status} token_suffix=#{suffix(token)}")
        {:ok, :sent}

      {:ok, %{status: status, body: resp}} ->
        Logger.warning("push.apns rejected status=#{status} body=#{inspect(resp)}")
        {:error, {:apns_rejected, status}}

      {:error, reason} ->
        Logger.warning("push.apns transport_error reason=#{inspect(reason)}")
        {:error, reason}
    end
  end

  defp jwt do
    # Structure reserved for ES256 JWT (key_id / team_id / auth_key).
    # Without a full JOSE dependency wired, live path returns a clear error
    # rather than a forged token — credentials_present? already gates entry.
    case Application.get_env(:opal_core, :apns_jwt_fun) do
      fun when is_function(fun, 0) -> fun.()
      _ -> raise "APNs JWT provider not configured (set :apns_jwt_fun or wire JOSE)"
    end
  end

  defp http_post(url, body, headers) do
    case Application.get_env(:opal_core, :apns_http_fun) do
      fun when is_function(fun, 3) ->
        fun.(url, body, headers)

      _ ->
        Req.post(url, body: body, headers: headers, receive_timeout: 10_000)
        |> case do
          {:ok, %Req.Response{status: status, body: resp}} ->
            {:ok, %{status: status, body: resp}}

          {:error, reason} ->
            {:error, reason}
        end
    end
  rescue
    e -> {:error, Exception.message(e)}
  end

  defp cred(key) do
    conf = Application.get_env(:opal_core, :apns, [])
    Keyword.get(conf, key)
  end

  defp present?(v) when is_binary(v), do: String.trim(v) != ""
  defp present?(_), do: false

  defp stringify_data(data) when is_map(data) do
    Map.new(data, fn {k, v} -> {to_string(k), if(is_atom(v), do: to_string(v), else: v)} end)
  end

  defp stringify_data(_), do: %{}

  defp suffix(token) when is_binary(token) and byte_size(token) > 8, do: String.slice(token, -8, 8)
  defp suffix(token) when is_binary(token), do: token
  defp suffix(_), do: ""
end
