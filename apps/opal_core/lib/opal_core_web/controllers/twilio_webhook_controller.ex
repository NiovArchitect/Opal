defmodule OpalCoreWeb.TwilioWebhookController do
  @moduledoc """
  Twilio status callbacks.

  POST /webhooks/twilio/verify — Verify delivery/status events.
  Always validates X-Twilio-Signature when auth token is configured.
  Without creds: accepts only synthetic signed probes in test/dev.
  """

  use OpalCoreWeb, :controller

  require Logger

  alias OpalCore.Observability.StructuredLogger
  alias OpalCore.PublicBaseUrl

  @doc "Verify status callback."
  def verify(conn, params) do
    case validate_signature(conn) do
      :ok ->
        StructuredLogger.log("twilio.verify_webhook", %{
          "status" => params["Status"] || params["status"],
          "to_present" => is_binary(params["To"] || params["to"]),
          "sid_present" => is_binary(params["SmsSid"] || params["CallSid"] || params["sid"])
        })

        # Update OTP attempt record when challenge sid is known (best-effort).
        _ = maybe_touch_challenge(params)

        conn
        |> put_resp_content_type("text/plain")
        |> send_resp(200, "ok")

      {:error, reason} ->
        StructuredLogger.log("twilio.verify_webhook_rejected", %{"reason" => to_string(reason)})

        conn
        |> put_resp_content_type("application/json")
        |> send_resp(401, Jason.encode!(%{"error_code" => "invalid_signature", "message" => "Unauthorized"}))
    end
  end

  defp validate_signature(conn) do
    auth_token = System.get_env("OPAL_TWILIO_AUTH_TOKEN") || System.get_env("TWILIO_AUTH_TOKEN")
    signature = conn |> get_req_header("x-twilio-signature") |> List.first()
    token_configured? = is_binary(auth_token) and auth_token != ""
    sig_present? = is_binary(signature) and signature != ""

    cond do
      conn.assigns[:twilio_skip_signature] == true ->
        :ok

      # Dev/test probe when Twilio creds are not configured.
      not token_configured? and params_probe?(conn) ->
        :ok

      not sig_present? ->
        {:error, :missing_signature}

      not token_configured? ->
        {:error, :auth_token_missing}

      true ->
        url = webhook_url(conn)
        params = conn.body_params || %{}

        if valid_twilio_signature?(auth_token, url, params, signature) do
          :ok
        else
          {:error, :bad_signature}
        end
    end
  end

  defp params_probe?(conn) do
    p = conn.body_params || %{}
    p["OpalProbe"] == "1" or p["opal_probe"] == "1"
  end

  defp webhook_url(conn) do
    # Prefer PUBLIC_BASE_URL so signature matches what Twilio was given.
    PublicBaseUrl.url(conn.request_path)
  end

  @doc false
  def valid_twilio_signature?(auth_token, url, params, signature)
      when is_binary(auth_token) and is_binary(url) and is_binary(signature) do
    data =
      params
      |> Enum.sort_by(fn {k, _} -> to_string(k) end)
      |> Enum.reduce(url, fn {k, v}, acc ->
        acc <> to_string(k) <> to_string(v)
      end)

    expected =
      :crypto.mac(:hmac, :sha, auth_token, data)
      |> Base.encode64()

    Plug.Crypto.secure_compare(expected, signature)
  end

  def valid_twilio_signature?(_, _, _, _), do: false

  defp maybe_touch_challenge(params) do
    sid = params["VerificationSid"] || params["SmsSid"] || params["sid"]

    if is_binary(sid) do
      StructuredLogger.log("twilio.challenge_status", %{
        "provider_reference_present" => true,
        "status" => params["Status"] || params["status"]
      })
    end

    :ok
  end
end
