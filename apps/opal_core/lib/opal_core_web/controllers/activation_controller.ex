defmodule OpalCoreWeb.ActivationController do
  use OpalCoreWeb, :controller

  alias OpalCore.Auth.ProductSession
  alias OpalCore.SocialFlow.Onboarding

  def start_challenge(conn, params) do
    attrs = %{
      identifier_raw: params["phone"] || params["identifier_raw"],
      purpose: params["purpose"] || "account_create",
      device_label: params["device_label"] || "WebBrowser",
      idempotency_key: params["idempotency_key"],
      trace_id: params["trace_id"] || "trace-activation"
    }

    case Onboarding.start_verification(attrs) do
      {:ok, challenge, origin} ->
        body = %{
          "challenge" => Map.drop(challenge, ["synthetic_provider_code"]),
          "origin" => to_string(origin),
          "provider" => "synthetic_development",
          "not_legal_identity" => true,
          "not_production_sms" => true,
          "development_verification" => true
        }

        # Development ergonomics: expose synthetic code only when enabled.
        body =
          if show_synthetic_code?() do
            Map.put(body, "development_code", challenge["synthetic_provider_code"])
          else
            body
          end

        conn
        |> put_status(if(origin == :idempotent, do: 200, else: 201))
        |> json(body)

      {:error, :invalid_identifier} ->
        error(conn, 422, "invalid_identifier", "Enter a valid phone number")

      {:error, :unsupported_region} ->
        error(conn, 422, "unsupported_region", "This region is not supported yet")

      {:error, :rate_limited} ->
        error(conn, 429, "rate_limited", "Too many attempts. Try again later")

      {:error, :identifier_quarantined} ->
        error(conn, 403, "identifier_quarantined", "This number cannot be used right now")

      {:error, reason} ->
        error(conn, 422, "verification_failed", inspect(reason))
    end
  end

  def verify(conn, params) do
    attrs = %{
      challenge_id: params["challenge_id"],
      code: params["code"],
      display_name: params["display_name"] || "Opal User",
      device_label: params["device_label"] || "WebBrowser",
      handle_hint: params["handle_hint"],
      platform: params["platform"] || "web",
      trace_id: params["trace_id"] || "trace-activation"
    }

    case Onboarding.complete_verification(attrs) do
      {:ok, done, _origin} ->
        case ProductSession.issue(done.session) do
          {:ok, token} ->
            json(conn, %{
              "account" => %{
                "id" => done.account_id,
                "outcome" => to_string(done.account_outcome)
              },
              "session" => token,
              "user" => ProductSession.public_user(OpalCore.Repo.get!(OpalCore.Accounts.User, done.account_id)),
              "not_legal_identity" => true,
              "no_auto_relationship" => true,
              "provider" => "synthetic_development",
              "not_production_sms" => true
            })

          {:error, reason} ->
            error(conn, 500, "session_issue_failed", inspect(reason))
        end

      {:error, :replay} ->
        error(conn, 409, "replay", "This code was already used")

      {:error, :expired} ->
        error(conn, 410, "expired", "This code expired")

      {:error, :locked} ->
        error(conn, 423, "locked", "Too many incorrect codes")

      {:error, :invalid_code} ->
        error(conn, 401, "invalid_code", "That code did not match")

      {:error, :not_found} ->
        error(conn, 404, "not_found", "Challenge not found")

      {:error, reason} ->
        error(conn, 422, "verify_failed", inspect(reason))
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
