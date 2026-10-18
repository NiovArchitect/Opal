defmodule OpalCore.SocialFlow.PhoneVerification.TwilioVerifyAdapter do
  @moduledoc """
  Twilio Verify v2 adapter for production SMS.

  Requires server-side env (never client):
  - OPAL_TWILIO_ACCOUNT_SID
  - OPAL_TWILIO_AUTH_TOKEN
  - OPAL_TWILIO_VERIFY_SERVICE_SID

  Does not log phone numbers, codes, or secrets.
  Does not fall back to synthetic when misconfigured — returns explicit errors.
  """

  @behaviour OpalCore.SocialFlow.PhoneVerification.Provider

  require Logger

  @impl true
  def start_challenge(e164, context) when is_binary(e164) do
    with {:ok, cfg} <- config(),
         {:ok, body} <- http_start(cfg, e164, context) do
      sid = Map.get(body, "sid") || Map.get(body, :sid)

      if is_binary(sid) do
        {:ok,
         %{
           provider_reference: sid,
           provider: "twilio_verify",
           message: "Your number verification was started."
         }}
      else
        Logger.warning("phone_verify.start_missing_sid")
        {:error, :provider_error}
      end
    end
  end

  @doc """
  Behaviour check (Repair #18, BS-17).

  Twilio Verify's VerificationCheck API identifies the challenge by
  To (E.164) + Code — a Verification SID alone cannot be checked. The
  old implementation therefore ALWAYS returned
  `{:error, :use_check_with_e164}`: a dead behaviour path that any
  caller through `Provider.check_challenge/3` would hit on every code.

  The coherent contract now: callers pass the E.164 in `context`
  (`:e164`, `"e164"`, `:phone`, or `:identifier_raw`) and this performs
  the same real VerificationCheck as `check_by_e164/2`. Without an
  E.164 it returns `{:error, :e164_required}`, naming exactly what is
  missing — it never pretends to have checked a code it did not check.
  """
  @impl true
  def check_challenge(provider_reference, code, context)
      when is_binary(provider_reference) and is_binary(code) do
    case e164_from_context(context) do
      e164 when is_binary(e164) and e164 != "" ->
        check_by_e164(e164, code)

      _ ->
        Logger.warning("phone_verify.check_missing_e164")
        {:error, :e164_required}
    end
  end

  defp e164_from_context(context) when is_map(context) do
    Map.get(context, :e164) || Map.get(context, "e164") || Map.get(context, :phone) ||
      Map.get(context, "phone") || Map.get(context, :identifier_raw) ||
      Map.get(context, "identifier_raw")
  end

  defp e164_from_context(_), do: nil

  defp config do
    sid = System.get_env("OPAL_TWILIO_ACCOUNT_SID")
    token = System.get_env("OPAL_TWILIO_AUTH_TOKEN")
    service = System.get_env("OPAL_TWILIO_VERIFY_SERVICE_SID")

    cond do
      is_binary(sid) and sid != "" and is_binary(token) and token != "" and is_binary(service) and
          service != "" ->
        {:ok, %{account_sid: sid, auth_token: token, service_sid: service}}

      true ->
        Logger.error("phone_verify.twilio_not_configured")
        {:error, :provider_not_configured}
    end
  end

  defp http_start(cfg, e164, _context) do
    url =
      "https://verify.twilio.com/v2/Services/#{cfg.service_sid}/Verifications"

    body = URI.encode_query(%{"To" => e164, "Channel" => "sms"})
    request(:post, url, body, cfg)
  end

  @doc "Check by E.164 + code (Twilio Verify Check API)."
  def check_by_e164(e164, code) when is_binary(e164) and is_binary(code) do
    with {:ok, cfg} <- config() do
      url =
        "https://verify.twilio.com/v2/Services/#{cfg.service_sid}/VerificationCheck"

      body = URI.encode_query(%{"To" => e164, "Code" => code})

      case request(:post, url, body, cfg) do
        {:ok, resp} ->
          case Map.get(resp, "status") || Map.get(resp, :status) do
            "approved" -> :ok
            _ -> {:error, :invalid_code}
          end

        {:error, _} = err ->
          err
      end
    end
  end

  defp request(method, url, body, cfg) do
    auth = Base.encode64("#{cfg.account_sid}:#{cfg.auth_token}")

    headers = [
      {"authorization", "Basic #{auth}"},
      {"content-type", "application/x-www-form-urlencoded"},
      {"accept", "application/json"}
    ]

    http = Application.get_env(:opal_core, :phone_verify_http_client, :httpc)

    case http do
      :httpc ->
        :inets.start()
        :ssl.start()

        request =
          {String.to_charlist(url),
           Enum.map(headers, fn {k, v} -> {String.to_charlist(k), v} end),
           ~c"application/x-www-form-urlencoded", body}

        http_method = if method == :post, do: :post, else: :get

        case :httpc.request(http_method, request, [{:timeout, 15_000}], []) do
          {:ok, {{_, status, _}, _headers, resp_body}} when status in 200..299 ->
            decode_json(resp_body)

          {:ok, {{_, status, _}, _, resp_body}} ->
            # Log status + Twilio error code only (never phone/code/secrets).
            twilio_code = twilio_error_code(resp_body)
            Logger.warning("phone_verify.http_status status=#{status} code=#{twilio_code || "none"}")

            cond do
              twilio_code in [21608, 21211, 21408] ->
                {:error, :number_not_enabled}

              status in [401, 403] ->
                {:error, :provider_not_configured}

              true ->
                {:error, :provider_error}
            end

          {:error, reason} ->
            Logger.warning("phone_verify.http_error")
            # Avoid logging reason if it might embed secrets; keep generic.
            _ = reason
            {:error, :provider_error}
        end

      fun when is_function(fun, 4) ->
        fun.(method, url, body, headers)
    end
  end

  defp decode_json(body) when is_list(body), do: decode_json(List.to_string(body))

  defp decode_json(body) when is_binary(body) do
    case Jason.decode(body) do
      {:ok, map} when is_map(map) -> {:ok, map}
      _ -> {:error, :provider_error}
    end
  end

  defp twilio_error_code(body) when is_list(body), do: twilio_error_code(List.to_string(body))

  defp twilio_error_code(body) when is_binary(body) do
    case Jason.decode(body) do
      {:ok, %{"code" => code}} when is_integer(code) -> code
      {:ok, %{"code" => code}} when is_binary(code) ->
        case Integer.parse(code) do
          {n, _} -> n
          :error -> nil
        end

      _ ->
        nil
    end
  end

  defp twilio_error_code(_), do: nil
end
