defmodule OpalCoreWeb.SessionController do
  use OpalCoreWeb, :controller

  alias OpalCore.Auth.ProductSession
  alias OpalCoreWeb.Plugs.SessionCookie

  def show(conn, _params) do
    user = conn.assigns.current_user
    session = conn.assigns.current_session

    # Honesty: report the live phone-verify mode — never hardcode synthetic when
    # OPAL_PHONE_VERIFY_MODE=production_sms (Tranche #2 RC auth law).
    provider_label =
      if OpalCore.SocialFlow.PhoneVerification.Provider.production_mode?() do
        "production_sms"
      else
        case OpalCore.SocialFlow.PhoneVerification.Provider.mode() do
          :disabled -> "disabled"
          _ -> "synthetic_development"
        end
      end

    json(conn, %{
      "user" => ProductSession.public_user(user),
      "session" => %{
        "id" => session.id,
        "device_label" => session.device_label,
        "platform" => session.platform,
        "status" => session.status
      },
      "provider" => provider_label,
      "not_production_sms" => provider_label != "production_sms",
      "auth_mode" => to_string(conn.assigns[:auth_mode] || :unknown)
    })
  end

  def messaging_preferences(conn, _params) do
    json(conn, ProductSession.messaging_preferences(conn.assigns.current_user))
  end

  def assist_preference(conn, _params) do
    json(conn, ProductSession.assist_preference(conn.assigns.current_user))
  end

  def update_assist_preference(conn, params) do
    case ProductSession.update_assist_preference(conn.assigns.current_user, params) do
      {:ok, user} -> json(conn, ProductSession.assist_preference(user))
      {:error, :invalid} -> 
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid", "message" => "Choose on or off"})
      {:error, _} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid", "message" => "Could not save Assist preference"})
    end
  end

  def update_messaging_preferences(conn, params) do
    case ProductSession.update_messaging_preferences(conn.assigns.current_user, params) do
      {:ok, user} ->
        json(conn, ProductSession.messaging_preferences(user))

      {:error, changeset} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "preferences_invalid", "message" => inspect(changeset.errors)})
    end
  end

  def delete(conn, _params) do
    user_id = conn.assigns.current_user_id
    session = conn.assigns.current_session

    case ProductSession.revoke_by_ids(user_id, session.id) do
      {:ok, _} ->
        conn
        |> SessionCookie.clear_session_cookies()
        |> json(%{"signed_out" => true})

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "sign_out_failed", "message" => inspect(reason)})
    end
  end

  @doc """
  S1 FR08 — persist display name and optional username (handle) to user authority.
  """
  def update_profile(conn, params) do
    user = conn.assigns.current_user

    case ProductSession.update_profile(user, params) do
      {:ok, updated} ->
        json(conn, %{
          "user" => ProductSession.public_user(updated),
          "profile_updated" => true
        })

      {:error, :display_name_required} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "display_name_required",
          "message" => "Enter a name so your people know it is you."
        })

      {:error, %Ecto.Changeset{} = cs} ->
        {code, message} =
          if Keyword.has_key?(cs.errors, :handle) do
            {"handle_taken", "That username is already taken. Try another."}
          else
            {"profile_invalid", "Could not update your profile. Check your name and try again."}
          end

        conn
        |> put_status(422)
        |> json(%{"error_code" => code, "message" => message})

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "profile_update_failed", "message" => inspect(reason)})
    end
  end

  def socket_ticket(conn, _params) do
    session = conn.assigns.current_session

    case ProductSession.issue_socket_ticket(session) do
      {:ok, ticket} ->
        json(conn, %{
          "ticket" => ticket.ticket,
          "expires_in" => ticket.expires_in
        })

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "ticket_failed", "message" => inspect(reason)})
    end
  end

  @doc """
  Phase 3.1 — refresh access token via refresh_token (no auth plug).
  """
  def refresh(conn, params) do
    refresh_token = params["refresh_token"]

    case ProductSession.refresh(refresh_token) do
      {:ok, payload} ->
        conn
        |> SessionCookie.put_session_cookies(payload.access_token)
        |> json(%{
          "access_token" => payload.access_token,
          "refresh_token" => payload.refresh_token,
          "token_type" => payload.token_type,
          "expires_in" => payload.expires_in,
          "refresh_expires_in" => payload.refresh_expires_in,
          "session_id" => payload.session_id,
          "user_id" => payload.user_id
        })

      {:error, :token_expired} ->
        conn
        |> put_status(401)
        |> json(%{"error_code" => "token_expired", "message" => "Refresh token expired. Sign in again."})

      {:error, :session_revoked} ->
        conn
        |> put_status(401)
        |> json(%{"error_code" => "session_revoked", "message" => "Session was signed out."})

      {:error, _} ->
        conn
        |> put_status(401)
        |> json(%{"error_code" => "invalid_token", "message" => "Could not refresh session."})
    end
  end
end
