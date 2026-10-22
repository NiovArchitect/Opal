defmodule OpalCoreWeb.MemoryStepUpController do
  @moduledoc """
  Repair #24 (WS-5) - memory step-up re-auth HTTP API.

  POST /api/v1/product/memory/step-up/challenges  start a fresh phone-code challenge
  POST /api/v1/product/memory/step-up/verify      complete it, receive the elevation token
  GET  /api/v1/product/memory/step-up             this session's live elevation, if any

  HONESTY: accounts have no password credential (the users schema
  carries no password field), so there is no password to check and
  none is painted. The step-up re-verifies the account's actual
  credential - a fresh code sent to the phone number already
  verified to this account - and grants a short-lived elevation
  bound to this account + this session. Manual memory mutations
  (capsule create/forget, fact forget) require that elevation.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Auth.StepUpElevation
  alias OpalCore.SocialFlow.Onboarding

  def show(conn, _params) do
    user_id = conn.assigns.current_user_id
    session_id = conn.assigns.current_session.id

    case StepUpElevation.live_elevation(user_id, session_id) do
      %StepUpElevation{} = elevation ->
        json(conn, %{
          "step_up" =>
            StepUpElevation.to_contract(elevation, nil) |> Map.delete("elevation_token")
        })

      _ ->
        json(conn, %{
          "step_up" => %{
            "elevated" => false,
            "credential_kind" => StepUpElevation.credential_kind(),
            "credential" => "phone_code",
            "password_credential_exists" => false,
            "granted_at" => nil,
            "expires_at" => nil
          }
        })
    end
  end

  def start_challenge(conn, params) do
    user_id = conn.assigns.current_user_id

    attrs = %{
      identifier_raw: params["phone"] || params["identifier_raw"] || params["phone_e164"],
      device_label: params["device_label"] || "WebBrowser",
      idempotency_key: params["idempotency_key"],
      trace_id: params["trace_id"] || "trace-memory-step-up",
      otp_consent_accepted: params["otp_consent_accepted"],
      otp_consent_policy_version:
        params["otp_consent_policy_version"] || Onboarding.otp_consent_policy_version(),
      otp_consent_at: params["otp_consent_at"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }

    if is_nil(attrs.identifier_raw) or
         (is_binary(attrs.identifier_raw) and String.trim(attrs.identifier_raw) == "") do
      render_error(conn, 422, "invalid_identifier", "Enter the phone number on this account.")
    else
      case Onboarding.start_step_up_verification(user_id, attrs) do
        {:ok, challenge, origin} ->
          body = %{
            "challenge" => Map.drop(challenge, ["synthetic_provider_code"]),
            "origin" => to_string(origin),
            "credential" => "phone_code",
            "password_credential_exists" => false,
            "not_legal_identity" => true
          }

          body =
            if show_synthetic_code?(challenge) do
              Map.put(body, "development_code", challenge["synthetic_provider_code"])
            else
              body
            end

          conn
          |> put_status(if(origin == :idempotent, do: 200, else: 201))
          |> json(body)

        {:error, reason} ->
          render_step_up_error(conn, reason)
      end
    end
  end

  def verify(conn, params) do
    user_id = conn.assigns.current_user_id
    session = conn.assigns.current_session

    attrs = %{
      challenge_id: params["challenge_id"],
      code: params["code"],
      # Re-submit phone for the production provider check (never reverse digests).
      identifier_raw: params["phone"] || params["identifier_raw"] || params["phone_e164"],
      trace_id: params["trace_id"] || "trace-memory-step-up"
    }

    case Onboarding.complete_step_up_verification(user_id, attrs) do
      {:ok, challenge} ->
        case StepUpElevation.grant(user_id, session.id, challenge.id) do
          {:ok, elevation, token} ->
            json(conn, %{"step_up" => StepUpElevation.to_contract(elevation, token)})

          {:error, _} ->
            render_error(
              conn,
              422,
              "step_up_failed",
              "That check could not be finished. Try again."
            )
        end

      {:error, reason} ->
        render_step_up_error(conn, reason)
    end
  end

  defp show_synthetic_code?(challenge) do
    Application.get_env(:opal_core, :synthetic_provider_expose_code, false) and
      challenge["provider"] == "synthetic_development" and
      is_binary(challenge["synthetic_provider_code"])
  end

  defp render_step_up_error(conn, :invalid_identifier),
    do: render_error(conn, 422, "invalid_identifier", "Enter the phone number on this account.")

  defp render_step_up_error(conn, :identifier_not_owned),
    do:
      render_error(
        conn,
        403,
        "identifier_not_owned",
        "That number is not the verified number on this account."
      )

  defp render_step_up_error(conn, :invalid_code),
    do: render_error(conn, 401, "invalid_code", "That code did not work. Try again.")

  defp render_step_up_error(conn, :replay),
    do: render_error(conn, 409, "replay", "That code was already used. Send a new one.")

  defp render_step_up_error(conn, :expired),
    do: render_error(conn, 410, "expired", "That code expired. Send a new one.")

  defp render_step_up_error(conn, :locked),
    do: render_error(conn, 423, "locked", "Too many tries. Wait a little and try again.")

  defp render_step_up_error(conn, :not_found),
    do: render_error(conn, 404, "not_found", "That code did not work. Try again.")

  defp render_step_up_error(conn, :rate_limited),
    do:
      render_error(
        conn,
        429,
        "rate_limited",
        "We could not send a code right now. Try again in a little while."
      )

  defp render_step_up_error(conn, :otp_consent_required),
    do:
      render_error(
        conn,
        422,
        "otp_consent_required",
        "Confirm we can text you a one-time code to continue."
      )

  defp render_step_up_error(conn, reason),
    do:
      render_error(
        conn,
        422,
        "step_up_failed",
        "We could not complete that check right now. (#{inspect(reason)})"
      )

  defp render_error(conn, status, code, message) do
    conn |> put_status(status) |> json(%{"error_code" => code, "message" => message})
  end
end
