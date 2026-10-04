defmodule OpalCore.Push.Adapters.Expo do
  @moduledoc """
  Expo Push Service adapter (Phase 2C).

  POST https://exp.host/--/api/v2/push/send with `{to, title, body, data}`.
  No APNs/FCM credentials required — Expo sandbox accepts ExponentPushToken[].

  Returns `{:ok, :expo}` on ticket status ok, or `{:error, reason}`.
  Ticket errors are logged verbatim.
  """

  @behaviour OpalCore.Push.Sender

  require Logger

  @expo_url "https://exp.host/--/api/v2/push/send"

  @impl OpalCore.Push.Sender
  def send(token, payload, opts \\ [])

  def send(token, payload, opts) when is_binary(token) and is_map(payload) do
    if expo_token?(token) do
      deliver(token, payload, opts)
    else
      Logger.warning("push.expo invalid_token_prefix token_suffix=#{suffix(token)}")
      {:error, :invalid_expo_token}
    end
  end

  def send(_, _, _), do: {:error, :invalid_payload}

  @doc "True when token is an Expo push token."
  def expo_token?(token) when is_binary(token),
    do: String.starts_with?(token, "ExponentPushToken[")

  def expo_token?(_), do: false

  defp deliver(token, payload, _opts) do
    title = payload[:title] || payload["title"] || ""
    body = payload[:body] || payload["body"] || ""
    data = payload[:data] || payload["data"] || %{}

    message = %{
      "to" => token,
      "title" => title,
      "body" => body,
      "data" => stringify_data(data),
      "sound" => "default"
    }

    headers = [
      {"accept", "application/json"},
      {"accept-encoding", "gzip, deflate"},
      {"content-type", "application/json"}
    ]

    case http_post(@expo_url, Jason.encode!(message), headers) do
      {:ok, %{status: status, body: resp}} when status in 200..299 ->
        interpret_ticket(resp, token)

      {:ok, %{status: status, body: resp}} ->
        Logger.warning(
          "push.expo http_rejected status=#{status} body=#{inspect(resp)} token_suffix=#{suffix(token)}"
        )

        {:error, {:expo_http_rejected, status}}

      {:error, reason} ->
        Logger.warning("push.expo transport_error reason=#{inspect(reason)}")
        {:error, reason}
    end
  end

  defp interpret_ticket(resp, token) when is_map(resp) do
    ticket = first_ticket(resp)

    case ticket do
      %{"status" => "ok", "id" => id} ->
        Logger.info(
          "push.expo ticket_ok id=#{id} token_suffix=#{suffix(token)}"
        )

        {:ok, :expo}

      %{"status" => "ok"} = t ->
        Logger.info(
          "push.expo ticket_ok ticket=#{inspect(t)} token_suffix=#{suffix(token)}"
        )

        {:ok, :expo}

      %{"status" => "error"} = t ->
        Logger.warning(
          "push.expo ticket_error verbatim=#{inspect(t)} token_suffix=#{suffix(token)}"
        )

        {:error, {:expo_ticket_error, t}}

      other ->
        Logger.warning(
          "push.expo unexpected_ticket verbatim=#{inspect(other)} token_suffix=#{suffix(token)}"
        )

        {:error, {:expo_unexpected_ticket, other}}
    end
  end

  defp interpret_ticket(resp, token) when is_binary(resp) do
    case Jason.decode(resp) do
      {:ok, map} -> interpret_ticket(map, token)
      {:error, _} ->
        Logger.warning(
          "push.expo undecodable_body verbatim=#{inspect(resp)} token_suffix=#{suffix(token)}"
        )

        {:error, :expo_undecodable_body}
    end
  end

  defp interpret_ticket(resp, token) do
    Logger.warning(
      "push.expo unexpected_body verbatim=#{inspect(resp)} token_suffix=#{suffix(token)}"
    )

    {:error, :expo_unexpected_body}
  end

  defp first_ticket(%{"data" => [ticket | _]}) when is_map(ticket), do: ticket
  defp first_ticket(%{"data" => ticket}) when is_map(ticket), do: ticket
  defp first_ticket(%{data: [ticket | _]}) when is_map(ticket), do: ticket
  defp first_ticket(%{data: ticket}) when is_map(ticket), do: ticket
  defp first_ticket(other), do: other

  defp http_post(url, body, headers) do
    case Application.get_env(:opal_core, :expo_http_fun) do
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

  defp stringify_data(data) when is_map(data) do
    Map.new(data, fn {k, v} ->
      {to_string(k), if(is_binary(v), do: v, else: to_string(v))}
    end)
  end

  defp stringify_data(_), do: %{}

  defp suffix(token) when is_binary(token) and byte_size(token) > 8,
    do: String.slice(token, -8, 8)

  defp suffix(token) when is_binary(token), do: token
  defp suffix(_), do: ""
end
