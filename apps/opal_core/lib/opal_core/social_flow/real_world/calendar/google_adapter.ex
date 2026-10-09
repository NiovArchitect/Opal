defmodule OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter do
  @moduledoc """
  Google Calendar freeBusy adapter.

  Uses minimum freebusy scope when possible:
  `https://www.googleapis.com/auth/calendar.freebusy`

  Response contains busy intervals only — never event titles.
  Provider fact about free/busy does NOT imply social willingness.

  Docs: POST https://www.googleapis.com/calendar/v3/freeBusy
  """

  @behaviour OpalCore.SocialFlow.RealWorld.Calendar.Connector

  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  @freebusy_url "https://www.googleapis.com/calendar/v3/freeBusy"
  @token_url "https://oauth2.googleapis.com/token"
  # Paste G Phase 3/4 — calendar.readonly covers freeBusy + list events;
  # gmail.readonly prepared on the same consent screen.
  @preferred_scope "https://www.googleapis.com/auth/calendar.readonly"
  @gmail_scope "https://www.googleapis.com/auth/gmail.readonly"
  @legacy_freebusy_scope "https://www.googleapis.com/auth/calendar.freebusy"

  def preferred_scope, do: @preferred_scope

  @doc "Consent scopes: calendar.readonly + gmail.readonly (Paste G)."
  def oauth_scopes, do: [@preferred_scope, @gmail_scope]

  def oauth_scope_string, do: Enum.join(oauth_scopes(), " ")

  def freebusy_url, do: @freebusy_url

  @doc "HTTP client module — overridable for tests."
  def http_client do
    Application.get_env(:opal_core, :google_calendar_http_client, __MODULE__.HTTP)
  end

  @impl true
  def free_busy(user_id, range) do
    alias OpalCore.SocialFlow.RealWorld.Calendar.Aggregation

    with {:ok, conn} <- require_connection(user_id),
         {:ok, token} <- ensure_access_token(conn),
         {:ok, time_min} <- iso(range[:start_at] || range["start_at"]),
         {:ok, time_max} <- iso(range[:end_at] || range["end_at"]) do
      calendar_ids = calendar_ids_from_meta(conn.metadata)

      body = %{
        "timeMin" => time_min,
        "timeMax" => time_max,
        "items" => Enum.map(calendar_ids, &%{"id" => &1})
      }

      case http_client().post_json(@freebusy_url, body, bearer: token) do
        {:ok, %{"calendars" => calendars}} when is_map(calendars) ->
          # Drop errors map entries that might include titles/messages; busy only
          busy_maps =
            calendars
            |> Enum.reject(fn {_id, cal} -> is_map(cal) and Map.has_key?(cal, "errors") end)
            |> Map.new()

          {:ok, busy} = Aggregation.merge_busy(busy_maps)
          _ = touch_sync(user_id)
          {:ok, busy}

        {:ok, %{"error" => %{"code" => 401}}} ->
          _ = ProviderConnections.mark_error(user_id, "google_calendar", "token_expired")
          {:error, :token_expired}

        {:ok, %{"error" => %{"code" => 403}}} ->
          {:error, :permission_denied}

        {:ok, %{"error" => %{"code" => 429}}} ->
          {:error, :rate_limited}

        {:error, :http_error} ->
          {:error, :unavailable}

        _ ->
          {:error, :unavailable}
      end
    end
  end

  @impl true
  def calendar_permission(user_id) do
    case ProviderConnections.get(user_id, "google_calendar") do
      nil ->
        {:ok,
         %{
           "granted" => false,
           "live_sync" => false,
           "provider" => "google_calendar",
           "exposes_event_titles" => false
         }}

      %{status: "connected"} = conn ->
        {:ok,
         %{
           "granted" => true,
           "live_sync" => true,
           "provider" => "google_calendar",
           "scopes" => conn.scopes,
           "exposes_event_titles" => false,
           "oauth_connected" => true
         }}

      %{status: status} ->
        {:ok,
         %{
           "granted" => false,
           "live_sync" => false,
           "provider" => "google_calendar",
           "status" => status,
           "exposes_event_titles" => false
         }}
    end
  end

  @impl true
  def calendar_freshness(user_id) do
    case ProviderConnections.get(user_id, "google_calendar") do
      %{status: "connected", last_synced_at: at} ->
        {:ok,
         %{
           "status" => "live",
           "observed_at" => at,
           "live_sync" => true,
           "provider" => "google_calendar"
         }}

      _ ->
        {:ok,
         %{"status" => "not_connected", "live_sync" => false, "provider" => "google_calendar"}}
    end
  end

  @doc """
  Normalize a Google freeBusy HTTP response body into Opal busy blocks.
  Pure — used by live path and fixture tests. Strips any title-like keys.
  """
  def normalize_freebusy_response(body) when is_map(body) do
    calendars = body["calendars"] || %{}

    busy =
      calendars
      |> Map.values()
      |> Enum.flat_map(fn cal -> List.wrap(cal["busy"]) end)
      |> Enum.map(&normalize_busy/1)
      |> Enum.reject(&is_nil/1)

    {:ok, busy}
  end

  def normalize_freebusy_response(_), do: {:error, :invalid_response}

  @doc "Build OAuth authorization URL with PKCE S256 (credentials from env/config)."
  def authorize_url(state, opts \\ []) when is_binary(state) do
    case client_id() do
      nil ->
        {:error, :oauth_not_configured}

      id ->
        code_challenge = Keyword.get(opts, :code_challenge)

        # access_type=offline + prompt=consent so server apps can obtain a refresh
        # token on the relevant consent grant (Google may omit refresh on re-auth).
        base = %{
          "client_id" => id,
          "redirect_uri" => redirect_uri(),
          "response_type" => "code",
          # Consent lists both calendar.readonly and gmail.readonly.
          "scope" => oauth_scope_string(),
          "access_type" => "offline",
          "include_granted_scopes" => "true",
          "prompt" => "consent",
          "state" => state
        }

        query =
          if is_binary(code_challenge) do
            Map.merge(base, %{
              "code_challenge" => code_challenge,
              "code_challenge_method" => "S256"
            })
          else
            base
          end
          |> URI.encode_query()

        {:ok, "https://accounts.google.com/o/oauth2/v2/auth?" <> query}
    end
  end

  @doc "Exchange authorization code for tokens (PKCE verifier when provided)."
  def exchange_code(code, opts \\ [])

  def exchange_code(code, opts) when is_binary(code) do
    with {:ok, id} <- require_client_id(),
         {:ok, secret} <- require_client_secret() do
      body =
        %{
          "code" => code,
          "client_id" => id,
          "client_secret" => secret,
          "redirect_uri" => redirect_uri(),
          "grant_type" => "authorization_code"
        }
        |> maybe_put("code_verifier", Keyword.get(opts, :code_verifier))

      case http_client().post_form(@token_url, body) do
        {:ok, %{"access_token" => access} = resp} ->
          expires_in = resp["expires_in"] || 3600

          expires_at =
            DateTime.add(DateTime.utc_now(), expires_in, :second)
            |> DateTime.truncate(:microsecond)

          # Keep calendar + gmail scopes Google actually granted.
          allowed = MapSet.new(oauth_scopes() ++ [@legacy_freebusy_scope])

          scopes =
            (resp["scope"] || oauth_scope_string())
            |> String.split(" ")
            |> Enum.filter(&MapSet.member?(allowed, &1))

          # Refresh token is often only present on first consent — never require it
          # on every exchange. Callers must preserve prior refresh when nil.
          {:ok,
           %{
             access_token: access,
             refresh_token: resp["refresh_token"],
             token_expires_at: expires_at,
             scopes: if(scopes == [], do: oauth_scopes(), else: scopes),
             metadata: %{
               "calendar_ids" => ["primary"],
               "provider" => "google_calendar",
               # Titles only when OpalCore.Calendar.list_events include_titles: true
               "event_titles_on_demand" => true,
               "offline_access" => true,
               "consent_scopes" => oauth_scopes()
             }
           }}

        {:ok, %{"error" => err}} ->
          {:error, {:oauth_error, err}}

        _ ->
          {:error, :oauth_exchange_failed}
      end
    end
  end

  def exchange_code(_, _), do: {:error, :invalid_code}

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, k, v), do: Map.put(map, k, v)

  @doc "Refresh access token using stored refresh token."
  def refresh_access_token(refresh_token) when is_binary(refresh_token) do
    with {:ok, id} <- require_client_id(),
         {:ok, secret} <- require_client_secret() do
      body = %{
        "client_id" => id,
        "client_secret" => secret,
        "refresh_token" => refresh_token,
        "grant_type" => "refresh_token"
      }

      case http_client().post_form(@token_url, body) do
        {:ok, %{"access_token" => access} = resp} ->
          expires_in = resp["expires_in"] || 3600

          expires_at =
            DateTime.add(DateTime.utc_now(), expires_in, :second)
            |> DateTime.truncate(:microsecond)

          # Some Google responses rotate refresh_token; most omit it — preserve old.
          {:ok,
           %{
             access_token: access,
             refresh_token: resp["refresh_token"],
             token_expires_at: expires_at
           }}

        {:ok, %{"error" => "invalid_grant"}} ->
          {:error, :refresh_revoked}

        _ ->
          {:error, :refresh_failed}
      end
    end
  end

  def oauth_configured? do
    match?({:ok, _}, require_client_id()) and match?({:ok, _}, require_client_secret())
  end

  # --- internals ---

  defp require_connection(user_id) do
    case ProviderConnections.get(user_id, "google_calendar") do
      %{status: "connected"} = c -> {:ok, c}
      %{status: "expired"} -> {:error, :token_expired}
      %{status: "revoked"} -> {:error, :permission_denied}
      nil -> {:error, :not_connected}
      _ -> {:error, :permission_denied}
    end
  end

  defp ensure_access_token(conn) do
    now = DateTime.utc_now()

    expired? =
      match?(%DateTime{}, conn.token_expires_at) and
        DateTime.compare(conn.token_expires_at, now) != :gt

    if expired? do
      with {:ok, refresh} <- ProviderConnections.refresh_token(conn),
           true <- (is_binary(refresh) and refresh != "") || {:error, :token_expired},
           {:ok, tokens} <- refresh_access_token(refresh),
           next_refresh <- tokens[:refresh_token] || tokens["refresh_token"] || refresh,
           {:ok, _} <-
             ProviderConnections.upsert_tokens(conn.user_id, "google_calendar", %{
               access_token: tokens.access_token,
               refresh_token: next_refresh,
               token_expires_at: tokens.token_expires_at,
               scopes: conn.scopes,
               metadata: conn.metadata
             }) do
        {:ok, tokens.access_token}
      else
        {:error, :refresh_revoked} ->
          _ = ProviderConnections.mark_error(conn.user_id, "google_calendar", "refresh_revoked")
          {:error, :token_expired}

        _ ->
          _ = ProviderConnections.mark_error(conn.user_id, "google_calendar", "token_expired")
          {:error, :token_expired}
      end
    else
      ProviderConnections.access_token(conn)
    end
  end

  defp calendar_ids_from_meta(meta) when is_map(meta) do
    ids =
      meta["calendar_ids"] ||
        (meta["calendar_id"] && [meta["calendar_id"]]) ||
        ["primary"]

    ids
    |> List.wrap()
    |> Enum.filter(&is_binary/1)
    |> Enum.uniq()
    |> then(fn
      [] -> ["primary"]
      list -> list
    end)
  end

  defp calendar_ids_from_meta(_), do: ["primary"]

  defp touch_sync(user_id) do
    case ProviderConnections.get(user_id, "google_calendar") do
      nil ->
        :ok

      row ->
        row
        |> OpalCore.SocialFlow.RealWorld.ProviderConnection.changeset(%{
          last_synced_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
        })
        |> OpalCore.Repo.update()
    end
  end

  defp normalize_busy(%{"start" => start_s, "end" => end_s}) do
    with {:ok, s, _} <- DateTime.from_iso8601(normalize_google_dt(start_s)),
         {:ok, e, _} <- DateTime.from_iso8601(normalize_google_dt(end_s)) do
      %{
        "start_at" => DateTime.truncate(s, :microsecond),
        "end_at" => DateTime.truncate(e, :microsecond),
        "busy" => true,
        "no_event_titles" => true,
        "calendar_id" => "primary"
      }
    else
      _ -> nil
    end
  end

  defp normalize_busy(_), do: nil

  # Google may return "2026-08-10T12:00:00Z" or without Z
  defp normalize_google_dt(s) when is_binary(s) do
    if String.ends_with?(s, "Z") or String.contains?(s, "+") or String.match?(s, ~r/T.*-/) do
      s
    else
      s <> "Z"
    end
  end

  defp iso(%DateTime{} = dt), do: {:ok, DateTime.to_iso8601(dt)}

  defp iso(s) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> {:ok, DateTime.to_iso8601(dt)}
      _ -> {:error, :invalid_datetime}
    end
  end

  defp iso(_), do: {:error, :invalid_datetime}

  defp client_id do
    Application.get_env(:opal_core, :google_calendar_client_id) ||
      System.get_env("GOOGLE_OAUTH_CLIENT_ID") ||
      System.get_env("GOOGLE_CALENDAR_CLIENT_ID")
  end

  defp client_secret do
    Application.get_env(:opal_core, :google_calendar_client_secret) ||
      System.get_env("GOOGLE_OAUTH_CLIENT_SECRET") ||
      System.get_env("GOOGLE_CALENDAR_CLIENT_SECRET")
  end

  @hosted_callback "https://api.opal.niovlabs.com/api/v1/product/connectors/google_calendar/callback"
  @local_callback "http://127.0.0.1:4000/api/v1/product/connectors/google_calendar/callback"
  @hosted_oauth_callback "https://api.opal.niovlabs.com/api/v1/product/oauth/google/callback"
  @local_oauth_callback "http://127.0.0.1:4000/api/v1/product/oauth/google/callback"

  def hosted_redirect_uri, do: @hosted_callback
  def local_redirect_uri, do: @local_callback
  def hosted_oauth_redirect_uri, do: @hosted_oauth_callback
  def local_oauth_redirect_uri, do: @local_oauth_callback

  @doc """
  Every redirect URI the backend can legally use. Paste ALL into Google Cloud
  → Credentials → OAuth client → Authorized redirect URIs.
  """
  def authorized_redirect_uris do
    [
      @hosted_callback,
      @hosted_oauth_callback,
      @local_callback,
      @local_oauth_callback
    ]
  end

  defp redirect_uri do
    # Hosted Opal API is the production default; local must set env explicitly.
    # Prefer GOOGLE_OAUTH_REDIRECT_URI, then calendar-specific, then hosted.
    Application.get_env(:opal_core, :google_calendar_redirect_uri) ||
      System.get_env("GOOGLE_OAUTH_REDIRECT_URI") ||
      System.get_env("GOOGLE_CALENDAR_REDIRECT_URI") ||
      @hosted_callback
  end

  defp require_client_id do
    case client_id() do
      id when is_binary(id) and id != "" -> {:ok, id}
      _ -> {:error, :oauth_not_configured}
    end
  end

  defp require_client_secret do
    case client_secret() do
      s when is_binary(s) and s != "" -> {:ok, s}
      _ -> {:error, :oauth_not_configured}
    end
  end

  defmodule HTTP do
    @moduledoc false

    def post_json(url, body, opts) do
      headers = [{"content-type", "application/json"}]

      headers =
        case Keyword.get(opts, :bearer) do
          nil -> headers
          t -> [{"authorization", "Bearer #{t}"} | headers]
        end

      case Req.post(url, json: body, headers: headers, receive_timeout: 8_000) do
        {:ok, %{status: status, body: resp}} when status in 200..299 ->
          {:ok, decode(resp)}

        {:ok, %{status: status, body: resp}} when status in [401, 403] ->
          {:ok, Map.put(decode(resp), "error", %{"code" => status})}

        {:ok, _} ->
          {:error, :http_error}

        {:error, _} ->
          {:error, :http_error}
      end
    end

    def post_form(url, body) do
      case Req.post(url, form: body, receive_timeout: 8_000) do
        {:ok, %{status: status, body: resp}} when status in 200..299 ->
          {:ok, decode(resp)}

        {:ok, %{body: resp}} ->
          {:ok, decode(resp)}

        {:error, _} ->
          {:error, :http_error}
      end
    end

    defp decode(body) when is_map(body), do: body

    defp decode(body) when is_binary(body) do
      case Jason.decode(body) do
        {:ok, map} -> map
        _ -> %{}
      end
    end

    defp decode(_), do: %{}
  end
end
