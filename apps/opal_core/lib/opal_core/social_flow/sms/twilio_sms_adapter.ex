defmodule OpalCore.SocialFlow.Sms.TwilioSmsAdapter do
  @moduledoc """
  Twilio Programmable Messaging adapter for outbound SMS (invitations).

  Requires server-side env (never client):
  - OPAL_TWILIO_ACCOUNT_SID
  - OPAL_TWILIO_AUTH_TOKEN
  - OPAL_TWILIO_FROM_NUMBER **or** OPAL_TWILIO_MESSAGING_SERVICE_SID

  Distinct from Twilio Verify (OTP). Does not log phone numbers, bodies, or secrets.
  Logs Twilio error codes verbatim on failure. Truncates body to 1600 chars.
  """

  require Logger

  @max_body 1600
  @messages_path "/2010-04-01/Accounts"

  @doc """
  True when account creds + a From number or Messaging Service SID are present.
  """
  def configured? do
    match?({:ok, _}, config())
  end

  @doc """
  Honest readiness for invitation SMS.

  Returns:
  - `:ready` — creds + From/Messaging Service present
  - `{:disabled, reason}` — missing pieces (never fakes ready)
  """
  def readiness do
    sid = env("OPAL_TWILIO_ACCOUNT_SID")
    token = env("OPAL_TWILIO_AUTH_TOKEN")
    from = env("OPAL_TWILIO_FROM_NUMBER")
    msid = env("OPAL_TWILIO_MESSAGING_SERVICE_SID")

    cond do
      blank?(sid) or blank?(token) ->
        {:disabled, :account_creds_missing}

      blank?(from) and blank?(msid) ->
        {:disabled, :from_or_messaging_service_missing}

      true ->
        :ready
    end
  end

  @doc """
  Send one SMS. `to_e164` must be E.164. Body truncated to #{@max_body} chars.

  Returns `{:ok, message_sid}` | `{:error, reason}` where reason may be
  `{:twilio, code, message}` for provider errors.
  """
  def send(to_e164, body) when is_binary(to_e164) and is_binary(body) do
    with {:ok, cfg} <- config() do
      truncated = truncate(body)
      form = build_form(cfg, to_e164, truncated)
      url = messages_url(cfg.account_sid)
      request(url, form, cfg)
    end
  end

  def send(_, _), do: {:error, :invalid}

  defp config do
    case readiness() do
      :ready ->
        {:ok,
         %{
           account_sid: env("OPAL_TWILIO_ACCOUNT_SID"),
           auth_token: env("OPAL_TWILIO_AUTH_TOKEN"),
           from_number: env("OPAL_TWILIO_FROM_NUMBER"),
           messaging_service_sid: env("OPAL_TWILIO_MESSAGING_SERVICE_SID")
         }}

      {:disabled, reason} ->
        Logger.warning("sms.twilio_not_configured reason=#{reason}")
        {:error, :provider_not_configured}
    end
  end

  defp build_form(cfg, to_e164, body) do
    base = %{"To" => to_e164, "Body" => body}

    cond do
      is_binary(cfg.messaging_service_sid) and cfg.messaging_service_sid != "" ->
        Map.put(base, "MessagingServiceSid", cfg.messaging_service_sid)

      is_binary(cfg.from_number) and cfg.from_number != "" ->
        Map.put(base, "From", cfg.from_number)

      true ->
        base
    end
    |> URI.encode_query()
  end

  defp messages_url(account_sid) do
    "https://api.twilio.com#{@messages_path}/#{account_sid}/Messages.json"
  end

  defp request(url, body, cfg) do
    auth = Base.encode64("#{cfg.account_sid}:#{cfg.auth_token}")

    headers = [
      {"authorization", "Basic #{auth}"},
      {"content-type", "application/x-www-form-urlencoded"},
      {"accept", "application/json"}
    ]

    http = Application.get_env(:opal_core, :sms_http_client, :httpc)

    case http do
      :httpc ->
        httpc_request(url, body, headers)

      fun when is_function(fun, 4) ->
        case fun.(:post, url, body, headers) do
          {:ok, map} when is_map(map) ->
            sid = Map.get(map, "sid") || Map.get(map, :sid)

            if is_binary(sid) and sid != "" do
              {:ok, sid}
            else
              Logger.warning("sms.twilio_missing_sid")
              {:error, :provider_error}
            end

          {:error, _} = err ->
            err

          other ->
            # Allow mock to return raw Twilio error shape
            other
        end
    end
  end

  defp httpc_request(url, body, headers) do
    :inets.start()
    :ssl.start()

    request =
      {String.to_charlist(url),
       Enum.map(headers, fn {k, v} -> {String.to_charlist(k), v} end),
       ~c"application/x-www-form-urlencoded", body}

    case :httpc.request(:post, request, [{:timeout, 15_000}], []) do
      {:ok, {{_, status, _}, _headers, resp_body}} when status in 200..299 ->
        case decode_json(resp_body) do
          {:ok, map} ->
            sid = Map.get(map, "sid")

            if is_binary(sid) and sid != "" do
              {:ok, sid}
            else
              Logger.warning("sms.twilio_missing_sid status=#{status}")
              {:error, :provider_error}
            end

          {:error, _} = err ->
            err
        end

      {:ok, {{_, status, _}, _, resp_body}} ->
        {code, message} = twilio_error(resp_body)

        Logger.warning(
          "sms.twilio_http_status status=#{status} code=#{code || "none"} message=#{inspect(message)}"
        )

        {:error, {:twilio, code, message}}

      {:error, reason} ->
        Logger.warning("sms.twilio_http_error")
        _ = reason
        {:error, :provider_error}
    end
  end

  defp truncate(body) do
    graphemes = String.graphemes(body)

    if length(graphemes) <= @max_body do
      body
    else
      graphemes |> Enum.take(@max_body) |> Enum.join()
    end
  end

  defp decode_json(body) when is_list(body), do: decode_json(List.to_string(body))

  defp decode_json(body) when is_binary(body) do
    case Jason.decode(body) do
      {:ok, map} when is_map(map) -> {:ok, map}
      _ -> {:error, :provider_error}
    end
  end

  defp twilio_error(body) when is_list(body), do: twilio_error(List.to_string(body))

  defp twilio_error(body) when is_binary(body) do
    case Jason.decode(body) do
      {:ok, map} when is_map(map) ->
        code = normalize_code(Map.get(map, "code"))
        message = Map.get(map, "message") || Map.get(map, "error_message")
        {code, message}

      _ ->
        {nil, nil}
    end
  end

  defp twilio_error(_), do: {nil, nil}

  defp normalize_code(code) when is_integer(code), do: code

  defp normalize_code(code) when is_binary(code) do
    case Integer.parse(code) do
      {n, _} -> n
      :error -> nil
    end
  end

  defp normalize_code(_), do: nil

  defp env(key) do
    case System.get_env(key) do
      v when is_binary(v) -> String.trim(v)
      _ -> nil
    end
  end

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false
end
