defmodule OpalCoreWeb.ConnectorController do
  @moduledoc """
  Real-world connector HTTP surface.

  No provider-specific UI chrome — status + OAuth start/callback/revoke only.
  Tokens never returned in JSON.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections
  alias OpalCore.SocialFlow.RealWorld.StepAudit

  # GET /api/v1/product/connectors
  def index(conn, _params) do
    user_id = conn.assigns.current_user_id

    json(conn, %{
      "connectors" => ProviderConnections.list_for_user(user_id),
      "google_calendar_oauth_configured" => GoogleAdapter.oauth_configured?(),
      "step_audits" => StepAudit.connector_audits()
    })
  end

  # GET /api/v1/product/connectors/google_calendar
  def google_status(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, ProviderConnections.public_status(user_id, "google_calendar"))
  end

  # POST /api/v1/product/connectors/google_calendar/start
  def google_start(conn, _params) do
    user_id = conn.assigns.current_user_id
    state = "opal:" <> user_id <> ":" <> Ecto.UUID.generate()

    case GoogleAdapter.authorize_url(state) do
      {:ok, url} ->
        json(conn, %{
          "authorize_url" => url,
          "state" => state,
          "scope" => GoogleAdapter.preferred_scope(),
          "exposes_event_titles" => false
        })

      {:error, :oauth_not_configured} ->
        conn
        |> put_status(503)
        |> json(%{
          "error_code" => "oauth_not_configured",
          "message" =>
            "Set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI",
          "manual_availability_works" => true
        })
    end
  end

  # POST /api/v1/product/connectors/google_calendar/callback
  # Body: code, state — server exchanges; never logs tokens
  def google_callback(conn, params) do
    user_id = conn.assigns.current_user_id
    code = params["code"]

    cond do
      not is_binary(code) or code == "" ->
        error(conn, 422, "code_required", "OAuth code required")

      not valid_state?(params["state"], user_id) ->
        error(conn, 400, "invalid_state", "OAuth state mismatch")

      true ->
        case GoogleAdapter.exchange_code(code) do
          {:ok, tokens} ->
            case ProviderConnections.upsert_tokens(user_id, "google_calendar", tokens) do
              {:ok, _} ->
                json(conn, %{
                  "connected" => true,
                  "provider" => "google_calendar",
                  "exposes_event_titles" => false,
                  "manual_fallback_available" => true
                })

              {:error, _} ->
                error(conn, 500, "persist_failed", "Could not store connection")
            end

          {:error, :oauth_not_configured} ->
            error(conn, 503, "oauth_not_configured", "OAuth credentials not configured")

          {:error, _} ->
            error(conn, 400, "oauth_exchange_failed", "Could not complete calendar connect")
        end
    end
  end

  # POST /api/v1/product/connectors/google_calendar/revoke
  def google_revoke(conn, _params) do
    user_id = conn.assigns.current_user_id

    case ProviderConnections.revoke(user_id, "google_calendar") do
      {:ok, _} ->
        json(conn, %{
          "connected" => false,
          "revoked" => true,
          "manual_availability_works" => true
        })

      {:error, :not_found} ->
        json(conn, %{
          "connected" => false,
          "revoked" => false,
          "manual_availability_works" => true
        })
    end
  end

  # POST /api/v1/product/connectors/google_calendar/simulate_tokens
  # Test/dev only path when DevAuth enabled — injects tokens without Google.
  def google_simulate(conn, params) do
    if Application.get_env(:opal_core, :dev_auth_enabled, false) do
      user_id = conn.assigns.current_user_id

      {:ok, _} =
        ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
          access_token: params["access_token"] || "test-access-token",
          refresh_token: params["refresh_token"] || "test-refresh-token",
          token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
          scopes: [GoogleAdapter.preferred_scope()],
          metadata: %{"calendar_id" => "primary", "simulated" => true}
        })

      json(conn, %{"connected" => true, "simulated" => true, "token_present" => true})
    else
      error(conn, 403, "forbidden", "Simulate only in dev_auth mode")
    end
  end

  defp valid_state?(state, user_id) when is_binary(state) and is_binary(user_id) do
    String.starts_with?(state, "opal:" <> user_id <> ":")
  end

  defp valid_state?(_, _), do: false

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end
end
