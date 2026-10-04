defmodule OpalCore.Push.Adapters.FCM do
  @moduledoc """
  FCM HTTP v1 / legacy server-key push adapter. Credentials from env only:

    FCM_SERVER_KEY  — legacy server key, or
    FCM_SERVICE_ACCOUNT_JSON / FCM_SERVICE_ACCOUNT_PATH — service account

  When credentials are absent, callers must fall back to Synthetic — this
  module returns `{:error, :credentials_absent}` and never fakes success.
  """

  @behaviour OpalCore.Push.Sender

  require Logger

  @fcm_url "https://fcm.googleapis.com/fcm/send"

  @impl OpalCore.Push.Sender
  def send(token, payload, opts \\ [])

  def send(token, payload, opts) when is_binary(token) and is_map(payload) do
    if credentials_present?() do
      deliver(token, payload, opts)
    else
      Logger.warning("push.fcm credentials_absent — refusing fake success")
      {:error, :credentials_absent}
    end
  end

  def send(_, _, _), do: {:error, :invalid_payload}

  @doc "True when an FCM server key or service-account JSON is configured."
  def credentials_present? do
    present?(cred(:server_key) || System.get_env("FCM_SERVER_KEY")) or
      present?(
        cred(:service_account_json) || System.get_env("FCM_SERVICE_ACCOUNT_JSON") ||
          System.get_env("FCM_SERVICE_ACCOUNT_PATH")
      )
  end

  defp deliver(token, payload, _opts) do
    title = payload[:title] || payload["title"] || ""
    body = payload[:body] || payload["body"] || ""
    data = payload[:data] || payload["data"] || %{}

    message = %{
      "to" => token,
      "notification" => %{"title" => title, "body" => body},
      "data" => stringify_data(data)
    }

    headers = [
      {"authorization", "key=#{server_key()}"},
      {"content-type", "application/json"}
    ]

    case http_post(@fcm_url, Jason.encode!(message), headers) do
      {:ok, %{status: status}} when status in 200..299 ->
        Logger.info("push.fcm sent status=#{status} token_suffix=#{suffix(token)}")
        {:ok, :sent}

      {:ok, %{status: status, body: resp}} ->
        Logger.warning("push.fcm rejected status=#{status} body=#{inspect(resp)}")
        {:error, {:fcm_rejected, status}}

      {:error, reason} ->
        Logger.warning("push.fcm transport_error reason=#{inspect(reason)}")
        {:error, reason}
    end
  end

  defp server_key do
    cred(:server_key) || System.get_env("FCM_SERVER_KEY") || ""
  end

  defp http_post(url, body, headers) do
    case Application.get_env(:opal_core, :fcm_http_fun) do
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
    conf = Application.get_env(:opal_core, :fcm, [])
    Keyword.get(conf, key)
  end

  defp present?(v) when is_binary(v), do: String.trim(v) != ""
  defp present?(_), do: false

  defp stringify_data(data) when is_map(data) do
    Map.new(data, fn {k, v} ->
      {to_string(k), if(is_binary(v), do: v, else: to_string(v))}
    end)
  end

  defp stringify_data(_), do: %{}

  defp suffix(token) when is_binary(token) and byte_size(token) > 8, do: String.slice(token, -8, 8)
  defp suffix(token) when is_binary(token), do: token
  defp suffix(_), do: ""
end
