defmodule OpalCore.Events.Adapters.FoundationHttpAdapter do
  @moduledoc """
  Development-only bridge from Opal outbox publish to Foundation ingress.

  Enabled only when `OPAL_FOUNDATION_INGRESS_URL` is set (e.g. http://127.0.0.1:4100).
  Never the default for hosted production. Does not replace LocalAdapter PubSub.

  Foundation ingress remains the governance boundary — Opal does not produce to
  Kafka/Redpanda directly from business modules.
  """

  require Logger

  @doc """
  POST envelope to foundation `/v1/events`. Returns :ok | {:error, reason}.
  """
  def publish(%{"event_id" => _} = envelope) do
    case ingress_base() do
      nil ->
        {:error, :foundation_ingress_disabled}

      base ->
        post_event(base, envelope)
    end
  end

  def publish(_), do: {:error, :invalid_envelope}

  def enabled? do
    is_binary(ingress_base())
  end

  defp ingress_base do
    case System.get_env("OPAL_FOUNDATION_INGRESS_URL") do
      url when is_binary(url) and url != "" -> String.trim_trailing(url, "/")
      _ -> nil
    end
  end

  defp post_event(base, envelope) do
    url = base <> "/v1/events"
    body = Jason.encode!(envelope)

    headers = [
      {"content-type", "application/json"},
      {"accept", "application/json"},
      {"x-opal-event-id", to_string(envelope["event_id"])},
      {"x-opal-producer", to_string(envelope["producer"] || "opal_core")}
    ]

    case http_post(url, body, headers) do
      {:ok, status, resp_body} when status in 200..299 ->
        Logger.info(fn ->
          "[domain_event] foundation_ingress ok id=#{envelope["event_id"]} status=#{status}"
        end)

        _ = resp_body
        :ok

      {:ok, status, resp_body} when status in 400..499 ->
        # Permanent validation rejection at governance boundary
        Logger.warning(fn ->
          "[domain_event] foundation_ingress reject id=#{envelope["event_id"]} status=#{status} body=#{String.slice(resp_body || "", 0, 200)}"
        end)

        {:error, {:permanent_rejection, status}}

      {:ok, status, _resp_body} ->
        {:error, {:retryable_failure, status}}

      {:error, reason} ->
        {:error, {:retryable_failure, reason}}
    end
  end

  defp http_post(url, body, headers) do
    :inets.start()
    :ssl.start()

    request = {String.to_charlist(url), encode_headers(headers), ~c"application/json", body}

    case :httpc.request(:post, request, [{:timeout, 5_000}], []) do
      {:ok, {{_, status, _}, _headers, resp}} ->
        {:ok, status, List.to_string(resp)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp encode_headers(headers) do
    Enum.map(headers, fn {k, v} -> {String.to_charlist(k), String.to_charlist(v)} end)
  end
end
