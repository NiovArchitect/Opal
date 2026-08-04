defmodule OpalCore.Events.Adapters.FoundationHttpAdapter do
  @moduledoc """
  Development-only bridge from Opal outbox publish to Foundation HTTP ingress.

  ## Enablement

  Enabled only when `OPAL_FOUNDATION_INGRESS_URL` is set to a non-empty URL
  (for example `http://127.0.0.1:4100`). Never the default for hosted production.
  Does not replace LocalAdapter PubSub. Opal domain transactions never call this
  module inline; Oban outbox delivery is the only path.

  ## Allowlist (Phase 2 development)

  Only these event types may be published:

  * `invitation.accepted`
  * `relationship.accepted`

  ## HTTP status classification

  | Class | Status / transport | Result |
  |-------|--------------------|--------|
  | success | 200, 202 | `:ok` |
  | permanent | 400, 401, 403, 404, 409, 422, other 4xx except below | `{:error, {:permanent_rejection, reason}}` |
  | retryable | 408, 429, 500, 502, 503, 504, other 5xx | `{:error, {:retryable_failure, reason}}` |
  | retryable | connection refused, timeout, network errors | `{:error, {:retryable_failure, reason}}` |

  Foundation Phase 2 ingress returns **202** on accept and **422** on privacy/schema
  rejection (permanent). **503** when ingress is not ready (retryable).

  ## Timeouts

  * connect timeout: 2_000 ms
  * request (receive) timeout: 5_000 ms

  ## Logging

  Logs only safe fields: event_id, event_type, attempt-safe error class, HTTP status,
  duration_ms. Never logs raw payloads, phones, tokens, contact names, or full bodies.
  """

  require Logger

  @allowed_event_types MapSet.new([
                         "invitation.accepted",
                         "relationship.accepted"
                       ])

  @forbidden_payload_keys MapSet.new([
                            "phone",
                            "phone_number",
                            "e164",
                            "raw_body",
                            "message",
                            "body",
                            "contact_list",
                            "contacts",
                            "location",
                            "precise_location",
                            "latitude",
                            "longitude",
                            "access_token",
                            "bearer",
                            "session_token",
                            "password",
                            "card_number",
                            "gift_surprise",
                            "private_guidance",
                            "youth_private",
                            "share_token",
                            "name",
                            "display_name",
                            "email"
                          ])

  @connect_timeout_ms 2_000
  @receive_timeout_ms 5_000

  @doc "Event types allowed on the development foundation bridge."
  def allowed_event_types, do: MapSet.to_list(@allowed_event_types)

  @doc "True when OPAL_FOUNDATION_INGRESS_URL is configured."
  def enabled? do
    is_binary(ingress_base())
  end

  @doc """
  POST allowlisted envelope to foundation `/v1/events`.

  Returns:
  * `:ok` on success
  * `{:error, :foundation_ingress_disabled}` when URL unset
  * `{:error, {:event_type_not_allowlisted, type}}`
  * `{:error, {:permanent_rejection, reason}}`
  * `{:error, {:retryable_failure, reason}}`
  * `{:error, :invalid_envelope}`
  """
  def publish(envelope, opts \\ [])

  def publish(%{"event_id" => event_id} = envelope, opts)
      when is_binary(event_id) or is_atom(event_id) do
    case validate_for_publish(envelope) do
      :ok ->
        case ingress_base() do
          nil ->
            {:error, :foundation_ingress_disabled}

          base ->
            post_event(base, envelope, opts)
        end

      {:error, _} = err ->
        err
    end
  end

  def publish(_, _opts), do: {:error, :invalid_envelope}

  @doc """
  Validates event type allowlist and payload privacy without network I/O.
  """
  def validate_for_publish(%{"event_type" => type} = envelope) when is_binary(type) do
    cond do
      type not in @allowed_event_types ->
        safe_log(:warning, "not_allowlisted", envelope, nil, nil)
        {:error, {:event_type_not_allowlisted, type}}

      true ->
        case forbidden_payload_keys(envelope["payload"]) do
          [] ->
            :ok

          keys ->
            safe_log(:warning, "forbidden_payload_keys", envelope, nil, %{keys: length(keys)})
            {:error, {:permanent_rejection, :forbidden_payload_keys}}
        end
    end
  end

  def validate_for_publish(_), do: {:error, :invalid_envelope}

  @doc false
  def classify_http_status(status) when is_integer(status) do
    cond do
      status in [200, 202] -> :success
      status in [408, 429] -> :retryable
      status >= 500 and status <= 599 -> :retryable
      status >= 400 and status <= 499 -> :permanent
      true -> :retryable
    end
  end

  @doc false
  def connect_timeout_ms, do: @connect_timeout_ms

  @doc false
  def receive_timeout_ms, do: @receive_timeout_ms

  defp ingress_base do
    case System.get_env("OPAL_FOUNDATION_INGRESS_URL") do
      url when is_binary(url) and url != "" -> String.trim_trailing(url, "/")
      _ -> nil
    end
  end

  defp post_event(base, envelope, opts) do
    url = base <> "/v1/events"
    body = Jason.encode!(envelope)
    started = System.monotonic_time(:millisecond)

    headers = [
      {"content-type", "application/json"},
      {"accept", "application/json"},
      {"x-opal-event-id", to_string(envelope["event_id"])},
      {"x-opal-producer", to_string(envelope["producer"] || "opal_core")}
    ]

    http_fun = Keyword.get(opts, :http_post) || http_post_fun()

    result =
      try do
        http_fun.(url, body, headers)
      rescue
        e ->
          {:error, {:exception, Exception.message(e)}}
      catch
        :exit, reason ->
          {:error, {:exit, inspect(reason)}}
      end

    duration = System.monotonic_time(:millisecond) - started
    classify_result(result, envelope, duration)
  end

  defp classify_result({:ok, status, resp_body}, envelope, duration) when is_integer(status) do
    case classify_http_status(status) do
      :success ->
        # Unexpected success body is still success if status is 200/202 (ingress contract)
        _ = resp_body
        safe_log(:info, "ok", envelope, status, %{duration_ms: duration})
        :ok

      :permanent ->
        safe_log(:warning, "permanent_rejection", envelope, status, %{duration_ms: duration})
        {:error, {:permanent_rejection, status}}

      :retryable ->
        safe_log(:warning, "retryable_failure", envelope, status, %{duration_ms: duration})
        {:error, {:retryable_failure, status}}
    end
  end

  defp classify_result({:error, reason}, envelope, duration) do
    class = classify_transport_error(reason)

    safe_log(:warning, to_string(class), envelope, nil, %{
      duration_ms: duration,
      error_class: class
    })

    {:error, {class, reason}}
  end

  defp classify_result(other, envelope, duration) do
    safe_log(:warning, "retryable_failure", envelope, nil, %{
      duration_ms: duration,
      error_class: :unexpected_http_result
    })

    {:error, {:retryable_failure, other}}
  end

  defp classify_transport_error(:timeout), do: :retryable_failure
  defp classify_transport_error({:timeout, _}), do: :retryable_failure
  defp classify_transport_error(:econnrefused), do: :retryable_failure
  defp classify_transport_error({:failed_connect, _}), do: :retryable_failure
  defp classify_transport_error({:error, :econnrefused}), do: :retryable_failure
  defp classify_transport_error({:error, :nxdomain}), do: :retryable_failure
  defp classify_transport_error(:nxdomain), do: :retryable_failure
  defp classify_transport_error({:closed, _}), do: :retryable_failure
  defp classify_transport_error(:closed), do: :retryable_failure
  defp classify_transport_error({:exception, _}), do: :retryable_failure
  defp classify_transport_error({:exit, _}), do: :retryable_failure
  defp classify_transport_error(_), do: :retryable_failure

  defp safe_log(level, class, envelope, status, extra) do
    event_id = envelope["event_id"]
    event_type = envelope["event_type"]
    status_part = if status, do: " status=#{status}", else: ""

    extra_part =
      case extra do
        %{duration_ms: d} = m ->
          rest =
            m
            |> Map.drop([:duration_ms])
            |> Enum.map(fn {k, v} -> "#{k}=#{v}" end)
            |> Enum.join(" ")

          " duration_ms=#{d}" <> if(rest == "", do: "", else: " " <> rest)

        _ ->
          ""
      end

    msg =
      "[domain_event] foundation_ingress class=#{class} id=#{event_id} type=#{event_type}#{status_part}#{extra_part}"

    case level do
      :info -> Logger.info(msg)
      :warning -> Logger.warning(msg)
    end
  end

  defp forbidden_payload_keys(payload) when is_map(payload) do
    payload
    |> walk_forbidden([])
    |> Enum.uniq()
  end

  defp forbidden_payload_keys(_), do: ["payload"]

  defp walk_forbidden(map, acc) when is_map(map) do
    Enum.reduce(map, acc, fn {k, v}, a ->
      key = k |> to_string() |> String.downcase()

      a =
        if MapSet.member?(@forbidden_payload_keys, key) or
             String.contains?(key, "phone") or
             String.contains?(key, "token") or
             String.contains?(key, "password") do
          [key | a]
        else
          a
        end

      if is_map(v) and not is_struct(v) do
        walk_forbidden(v, a)
      else
        a
      end
    end)
  end

  defp http_post_fun do
    Application.get_env(:opal_core, :foundation_http_post) || (&default_http_post/3)
  end

  defp default_http_post(url, body, headers) do
    :inets.start()
    :ssl.start()

    request = {String.to_charlist(url), encode_headers(headers), ~c"application/json", body}

    http_opts = [
      {:timeout, @receive_timeout_ms},
      {:connect_timeout, @connect_timeout_ms}
    ]

    case :httpc.request(:post, request, http_opts, []) do
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
