defmodule OpalCoreWeb.ActivationController do
  use OpalCoreWeb, :controller

  alias OpalCore.Auth.ProductSession
  alias OpalCore.SocialFlow.Onboarding

  def start_challenge(conn, params) do
    attrs = challenge_attrs(params)

    case Onboarding.start_verification(attrs) do
      {:ok, challenge, origin} ->
        render_challenge_started(conn, challenge, origin)

      {:error, reason} ->
        render_challenge_error(conn, reason)
    end
  end

  defp challenge_attrs(params) do
    %{
      identifier_raw: params["phone"] || params["identifier_raw"],
      purpose: params["purpose"] || "account_create",
      device_label: params["device_label"] || "WebBrowser",
      idempotency_key: params["idempotency_key"],
      trace_id: params["trace_id"] || "trace-activation",
      otp_consent_accepted: params["otp_consent_accepted"],
      otp_consent_policy_version:
        params["otp_consent_policy_version"] || Onboarding.otp_consent_policy_version(),
      otp_consent_at: params["otp_consent_at"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }
  end

  defp render_challenge_started(conn, challenge, origin) do
    provider = challenge["provider"] || "synthetic_development"
    production? = provider != "synthetic_development"

    body = %{
      "challenge" => Map.drop(challenge, ["synthetic_provider_code"]),
      "origin" => to_string(origin),
      "provider" => provider,
      "not_legal_identity" => true,
      "not_production_sms" => not production?,
      "development_verification" => not production?
    }

    # Development ergonomics: expose synthetic code only when enabled and synthetic.
    body =
      if show_synthetic_code?() and not production? do
        Map.put(body, "development_code", challenge["synthetic_provider_code"])
      else
        body
      end

    conn
    |> put_status(if(origin == :idempotent, do: 200, else: 201))
    |> json(body)
  end

  defp render_challenge_error(conn, reason) do
    {status, code, message} = challenge_error(reason)
    error(conn, status, code, message)
  end

  defp challenge_error(:invalid_identifier),
    do: {422, "invalid_identifier", "Enter a valid phone number"}

  defp challenge_error(:unsupported_region),
    do: {422, "unsupported_region", "This region is not supported yet"}

  defp challenge_error(:rate_limited),
    do: {429, "rate_limited", "We couldn’t send a code right now. Try again in a little while."}

  defp challenge_error(:identifier_quarantined),
    do: {403, "identifier_quarantined", "This number cannot be used right now"}

  defp challenge_error(:number_not_enabled),
    do:
      {422, "number_not_enabled",
       "This number is not enabled for the preview. Use an approved test line."}

  defp challenge_error(:verification_disabled),
    do:
      {503, "verification_disabled",
       "We couldn’t send a code right now. Try again in a little while."}

  defp challenge_error(:provider_not_configured),
    do:
      {503, "provider_not_configured",
       "We couldn’t send a code right now. Try again in a little while."}

  defp challenge_error(:provider_error),
    do: {502, "provider_error", "We couldn’t send a code right now. Try again soon."}

  defp challenge_error(:otp_consent_required),
    do: {422, "otp_consent_required", "Confirm we can text you a one-time code to continue."}

  defp challenge_error(:otp_consent_policy_rejected),
    do: {422, "otp_consent_required", "Confirm we can text you a one-time code to continue."}

  defp challenge_error(_reason),
    do: {422, "verification_failed", "We couldn’t send a code right now. Try again soon."}

  def verify(conn, params) do
    attrs = %{
      challenge_id: params["challenge_id"],
      code: params["code"],
      # Re-submit phone for production provider check (never reverse digests).
      identifier_raw: params["phone"] || params["identifier_raw"],
      display_name: params["display_name"] || "Opal User",
      device_label: params["device_label"] || "WebBrowser",
      handle_hint: params["handle_hint"],
      platform: params["platform"] || "web",
      trace_id: params["trace_id"] || "trace-activation"
    }

    case Onboarding.complete_verification(attrs) do
      {:ok, done, _origin} ->
        case ProductSession.issue(done.session) do
          {:ok, token_payload} ->
            # Prefer HttpOnly cookie for browsers; omit long-lived token from JSON unless requested.
            include_bearer? = params["include_bearer"] in [true, "true", "1"]

            provider_label =
              if OpalCore.SocialFlow.PhoneVerification.Provider.production_mode?() do
                "production_sms"
              else
                "synthetic_development"
              end

            session_public = %{
              "token_type" => "cookie",
              "expires_in" => token_payload.expires_in,
              "session_id" => token_payload.session_id,
              "user_id" => token_payload.user_id,
              "device_label" => token_payload.device_label,
              "platform" => token_payload.platform,
              "provider" => provider_label
            }

            session_public =
              if include_bearer? do
                Map.merge(session_public, %{
                  "access_token" => token_payload.access_token,
                  "token_type" => "Bearer"
                })
              else
                session_public
              end

            conn =
              OpalCoreWeb.Plugs.SessionCookie.put_session_cookies(
                conn,
                token_payload.access_token
              )

            csrf = conn.assigns[:csrf_token]

            conn
            |> put_resp_header("x-csrf-token", csrf || "")
            |> json(%{
              "account" => %{
                "id" => done.account_id,
                "outcome" => to_string(done.account_outcome)
              },
              "session" => session_public,
              "csrf_token" => csrf,
              "user" =>
                ProductSession.public_user(
                  OpalCore.Repo.get!(OpalCore.Accounts.User, done.account_id)
                ),
              "not_legal_identity" => true,
              "no_auto_relationship" => true,
              "provider" => provider_label,
              "not_production_sms" => provider_label != "production_sms",
              "auth_transport" => if(include_bearer?, do: "cookie_and_bearer", else: "cookie")
            })

          {:error, _reason} ->
            error(conn, 500, "session_issue_failed", "We couldn’t finish that. Try again soon.")
        end

      {:error, :replay} ->
        error(conn, 409, "replay", "That code was already used. Send a new one.")

      {:error, :expired} ->
        error(conn, 410, "expired", "That code expired. Send a new one.")

      {:error, :locked} ->
        error(conn, 423, "locked", "Too many tries. Wait a little and try again.")

      {:error, :invalid_code} ->
        error(conn, 401, "invalid_code", "That code didn’t work. Try again.")

      {:error, :not_found} ->
        error(conn, 404, "not_found", "That code didn’t work. Try again.")

      {:error, _reason} ->
        error(conn, 422, "verify_failed", "That code didn’t work. Try again.")
    end
  end

  defp show_synthetic_code? do
    Application.get_env(:opal_core, :synthetic_provider_expose_code, false)
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end
end
