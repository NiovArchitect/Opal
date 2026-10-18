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

  # Real client structure — JWT + POST to api.push.apple.com.
  # Live delivery is gated on credentials; without them we never claim sent.
  #
  # HONESTY (Repair #18, BS-6): this path must NEVER raise into the
  # caller. Two raise vectors existed: (1) `opts["env"]` on the keyword
  # opts every real caller passes raised ArgumentError before anything
  # else ran; (2) jwt/0 raised when credentials were present but no
  # :apns_jwt_fun was configured, crashing the DeliverPushWorker Oban
  # job. Both now degrade to plain error tuples.
  defp deliver(token, payload, opts) do
    env = opt(opts, :env) || opt(opts, "env") || "sandbox"
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

    case jwt() do
      {:error, _} = err ->
        err

      {:ok, token_jwt} ->
        headers = [
          {"apns-topic", bundle},
          {"apns-push-type", "alert"},
          {"authorization", "bearer #{token_jwt}"},
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
  end

  # ES256 JWT provider seam (:apns_jwt_fun app env). Absent signer is a
  # configuration gap, reported as {:error, :jwt_not_configured} —
  # never a raise and never a forged token.
  defp jwt do
    case Application.get_env(:opal_core, :apns_jwt_fun) do
      fun when is_function(fun, 0) ->
        case fun.() do
          token when is_binary(token) and token != "" -> {:ok, token}
          _ -> {:error, :jwt_not_configured}
        end

      _ ->
        Logger.warning("push.apns jwt_not_configured — set :apns_jwt_fun or wire JOSE")
        {:error, :jwt_not_configured}
    end
  rescue
    e ->
      Logger.warning("push.apns jwt_provider_failed reason=#{Exception.message(e)}")
      {:error, :jwt_not_configured}
  end

  # Safe opt read for keyword lists and maps alike; never raises.
  # (Keyword.get/3 itself raises on string keys and on non-keyword
  # lists, so normalize to a string-keyed map first.)
  defp opt(opts, key) do
    opts
    |> normalize_opts()
    |> Map.get(to_string(key))
  end

  defp normalize_opts(opts) when is_list(opts) do
    opts
    |> Enum.filter(&match?({_, _}, &1))
    |> Map.new(fn {k, v} -> {to_string(k), v} end)
  end

  defp normalize_opts(opts) when is_map(opts) do
    Map.new(opts, fn {k, v} -> {to_string(k), v} end)
  end

  defp normalize_opts(_), do: %{}

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
