defmodule OpalCoreWeb.ConnectorController do
  @moduledoc """
  Real-world connector HTTP surface.

  OAuth state is Phoenix.Token-signed, short-lived, single-use, user-bound, PKCE.
  Tokens never returned in JSON. Never logged.
  """

  use OpalCoreWeb, :controller

  require Logger

  alias OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter
  alias OpalCore.SocialFlow.RealWorld.OAuthState
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections
  alias OpalCore.SocialFlow.RealWorld.StepAudit
  alias OpalCore.SocialFlow.RealWorld.TokenVault

  # GET /api/v1/product/connectors
  def index(conn, _params) do
    user_id = conn.assigns.current_user_id

    json(conn, %{
      "connectors" => ProviderConnections.list_for_user(user_id),
      "google_calendar_oauth_configured" => GoogleAdapter.oauth_configured?(),
      "token_vault_configured" => TokenVault.configured?(),
      "step_audits" => StepAudit.connector_audits()
    })
  end

  # GET /api/v1/product/settings/connections
  # Repair #18 DIR-2 — the Connections status contract (verification
  # report Part 4.1). One explicit projection: the server computes
  # every status (OpalCore.Settings.Connections); the client renders
  # the payload verbatim and derives nothing. The Google row is built
  # from the same ProviderConnections read-back as google_status/2,
  # so Settings and the connector endpoints can never disagree.
  def settings_connections(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, OpalCore.Settings.Connections.build(user_id))
  end

  # GET /api/v1/product/connectors/google_calendar
  def google_status(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, ProviderConnections.public_status(user_id, "google_calendar"))
  end

  # POST /api/v1/product/connectors/google_calendar/start
  # Also served as GET /api/v1/product/oauth/google/start (Paste G alias).
  def google_start(conn, _params) do
    user_id = conn.assigns.current_user_id
    session_id = Map.get(conn.assigns, :current_session_id)

    with {:ok, state, meta} <-
           OAuthState.mint(user_id, session_id: session_id, provider: "google_calendar"),
         {:ok, url} <-
           GoogleAdapter.authorize_url(state, code_challenge: meta.code_challenge) do
      json(conn, %{
        "authorize_url" => url,
        "state" => state,
        "scope" => GoogleAdapter.oauth_scope_string(),
        "scopes" => GoogleAdapter.oauth_scopes(),
        "pkce" => true,
        "code_challenge_method" => "S256",
        # Titles available on-demand via OpalCore.Calendar.list_events/4
        "exposes_event_titles" => false,
        "event_titles_on_demand" => true,
        "consent_includes_gmail_readonly" => true,
        "state_max_age_sec" => OAuthState.max_age_sec()
      })
    else
      {:error, :oauth_not_configured} ->
        conn
        |> put_status(503)
        |> json(%{
          "error_code" => "oauth_not_configured",
          "message" =>
            "Set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_CALENDAR_CLIENT_SECRET, and redirect URI",
          "manual_availability_works" => true
        })

      {:error, _} ->
        error(conn, 500, "oauth_start_failed", "Could not start calendar connect")
    end
  end

  # GET alias used by product OAuth redirect flow
  def oauth_google_start(conn, params), do: google_start(conn, params)

  def oauth_google_callback(conn, params), do: google_callback(conn, params)

  # POST /api/v1/product/connectors/google_calendar/callback
  def google_callback(conn, params) do
    user_id = conn.assigns.current_user_id
    session_id = Map.get(conn.assigns, :current_session_id)
    code = params["code"]
    state = params["state"]

    cond do
      not is_binary(code) or code == "" ->
        error(conn, 422, "code_required", "OAuth code required")

      not is_binary(state) or state == "" ->
        error(conn, 400, "invalid_state", "OAuth state required")

      true ->
        case OAuthState.verify(state, user_id, session_id: session_id) do
          {:ok, verified} ->
            complete_google_exchange(conn, user_id, code, verified)

          {:error, reason} ->
            Logger.warning("oauth callback state rejected: #{reason}")
            error(conn, 400, "invalid_state", state_error_message(reason))
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
          "manual_availability_works" => true,
          "calendar_authority_removed" => true
        })

      {:error, :not_found} ->
        json(conn, %{
          "connected" => false,
          "revoked" => false,
          "manual_availability_works" => true
        })
    end
  end

  # POST /api/v1/product/connectors/google_calendar/simulate
  def google_simulate(conn, params) do
    # HA-01 (Repair #18 hunt-fix): the dev_auth boolean alone is
    # settable in ANY config_env (runtime.exs honors OPAL_DEV_AUTH in
    # prod), so it cannot be the only gate for minting a connection.
    # The strong gate is the runtime environment itself: simulate
    # exists only in dev/test builds. Provenance is also carried on
    # every read-back (ProviderConnections.public_status/2).
    if Application.get_env(:opal_core, :dev_auth_enabled, false) and
         Mix.env() in [:dev, :test] do
      user_id = conn.assigns.current_user_id

      case ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
             access_token: params["access_token"] || "test-access-token",
             refresh_token: params["refresh_token"] || "test-refresh-token",
             token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
             scopes: [GoogleAdapter.preferred_scope()],
             metadata: %{"calendar_ids" => ["primary"], "simulated" => true}
           }) do
        {:ok, _} ->
          json(conn, %{"connected" => true, "simulated" => true, "token_present" => true})

        {:error, :secret_missing} ->
          error(conn, 503, "token_vault_unconfigured", "OPAL_PROVIDER_TOKEN_SECRET required")

        {:error, reason} ->
          error(conn, 500, "persist_failed", to_string(reason))
      end
    else
      error(conn, 403, "forbidden", "Simulate only in dev_auth mode")
    end
  end

  defp complete_google_exchange(conn, user_id, code, verified) do
    case GoogleAdapter.exchange_code(code, code_verifier: verified.code_verifier) do
      {:ok, tokens} ->
        case ProviderConnections.upsert_tokens(user_id, "google_calendar", tokens) do
          {:ok, _} ->
            json(conn, %{
              "connected" => true,
              "provider" => "google_calendar",
              "exposes_event_titles" => false,
              "manual_fallback_available" => true,
              "access_token" => nil,
              "refresh_token" => nil
            })

          {:error, reason}
          when reason in [:secret_missing, :secret_too_short, :secret_too_weak] ->
            error(conn, 503, "token_vault_unconfigured", "Provider token secret invalid")

          {:error, _} ->
            error(conn, 500, "persist_failed", "Could not store connection")
        end

      {:error, :oauth_not_configured} ->
        error(conn, 503, "oauth_not_configured", "OAuth credentials not configured")

      {:error, _} ->
        # Manual availability remains intact — never corrupt social flow
        error(conn, 400, "oauth_exchange_failed", "Could not complete calendar connect")
    end
  end

  defp state_error_message(:state_replay), do: "OAuth state already used"
  defp state_error_message(:state_expired), do: "OAuth state expired"
  defp state_error_message(:user_mismatch), do: "OAuth state user mismatch"
  defp state_error_message(:session_mismatch), do: "OAuth state session mismatch"
  defp state_error_message(:state_forged), do: "OAuth state invalid"
  defp state_error_message(_), do: "OAuth state rejected"

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message, "manual_availability_works" => true})
  end
end
