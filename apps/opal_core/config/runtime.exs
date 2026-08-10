import Config

# Runtime configuration shared by all environments.
# Explicit env flags required for Docker E2E; never silently enable DevAuth.

if System.get_env("PHX_SERVER") do
  config :opal_core, OpalCoreWeb.Endpoint, server: true
end

config :opal_core, OpalCoreWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))]

if ai_url = System.get_env("OPAL_AI_URL") do
  config :opal_core, :ai_service_url, ai_url
end

# Always use live HTTP client when OPAL_AI_CLIENT=http (container E2E proof).
case System.get_env("OPAL_AI_CLIENT") do
  "http" -> config :opal_core, :ai_client, OpalCore.AI.HTTPClient
  "test" -> config :opal_core, :ai_client, OpalCore.AI.TestClient
  _ -> :ok
end

# Synthetic DevAuth only when explicitly enabled. Production must leave this unset.
if System.get_env("OPAL_DEV_AUTH") in ~w(true 1 yes) do
  config :opal_core, :dev_auth_enabled, true
end

if System.get_env("OPAL_EVENT_PROBE") in ~w(true 1 yes) do
  config :opal_core, :event_probe_enabled, true
end

# --- World opportunity thin adapters (server-side keys only; never commit) ---
# Modes: synthetic | connected | disabled  (auto: key present → connected else synthetic)
if m = System.get_env("OPAL_PLACE_PROVIDER_MODE") do
  config :opal_core, :place_provider_mode, m
end

if m = System.get_env("OPAL_EVENT_PROVIDER_MODE") do
  config :opal_core, :event_provider_mode, m
end

if k = System.get_env("GOOGLE_PLACES_API_KEY") || System.get_env("OPAL_GOOGLE_PLACES_API_KEY") do
  config :opal_core, :google_places_api_key, k
end

if k = System.get_env("TICKETMASTER_API_KEY") || System.get_env("OPAL_TICKETMASTER_API_KEY") do
  config :opal_core, :ticketmaster_api_key, k
end

# Google Calendar free/busy OAuth (minimum freebusy scope). Never commit secrets.
if cid = System.get_env("GOOGLE_CALENDAR_CLIENT_ID") do
  config :opal_core, :google_calendar_client_id, cid
end

if csec = System.get_env("GOOGLE_CALENDAR_CLIENT_SECRET") do
  config :opal_core, :google_calendar_client_secret, csec
end

if redir = System.get_env("GOOGLE_CALENDAR_REDIRECT_URI") do
  config :opal_core, :google_calendar_redirect_uri, redir
end

if pts = System.get_env("OPAL_PROVIDER_TOKEN_SECRET") do
  config :opal_core, :provider_token_secret, pts
end

# Fail closed in production if provider token secret is missing when OAuth is configured.
if config_env() == :prod do
  config :opal_core, :env, :prod

  if System.get_env("GOOGLE_CALENDAR_CLIENT_ID") &&
       System.get_env("OPAL_PROVIDER_TOKEN_SECRET") in [nil, ""] do
    raise """
    OPAL_PROVIDER_TOKEN_SECRET is required in production when Google Calendar OAuth is configured.
    Generate with: openssl rand -base64 48
    """
  end
end

# Synthetic provider code exposure — never enable for public production.
if System.get_env("OPAL_SYNTHETIC_EXPOSE_CODE") in ~w(true 1 yes) do
  config :opal_core, :synthetic_provider_expose_code, true
end

# Hosted preview: only approved fixture numbers (no SMS).
if System.get_env("OPAL_SYNTHETIC_FIXTURE_ONLY") in ~w(true 1 yes) do
  config :opal_core, :synthetic_fixture_only, true
end

# Phone verification mode — never silently fall back from production_sms to synthetic.
# Values: synthetic_development | production_sms | disabled
case System.get_env("OPAL_PHONE_VERIFY_MODE") do
  "production_sms" ->
    config :opal_core, :phone_verify_mode, :production_sms

  "disabled" ->
    config :opal_core, :phone_verify_mode, :disabled

  "synthetic_development" ->
    config :opal_core, :phone_verify_mode, :synthetic_development

  _ ->
    # Default: synthetic for non-prod; production hosts must set mode explicitly.
    if config_env() == :prod do
      config :opal_core, :phone_verify_mode, :disabled
    else
      config :opal_core, :phone_verify_mode, :synthetic_development
    end
end

if database_url = System.get_env("DATABASE_URL") do
  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :opal_core, OpalCore.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6,
    show_sensitive_data_on_connection_error: config_env() != :prod
end

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  # Hosted managed Postgres (e.g. Render external) requires TLS.
  use_ssl? = System.get_env("DATABASE_SSL") not in ~w(false 0 no)

  repo_opts = [
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6
  ]

  repo_opts =
    if use_ssl? do
      Keyword.merge(repo_opts,
        ssl: true,
        ssl_opts: [
          verify: :verify_none
        ]
      )
    else
      repo_opts
    end

  config :opal_core, OpalCore.Repo, repo_opts

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "example.com"

  config :opal_core, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :opal_core, OpalCoreWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: String.to_integer(System.get_env("PORT", "4000"))
    ],
    secret_key_base: secret_key_base,
    check_origin: false,
    server: true

  # check_origin is enforced in Cors plug for HTTP; sockets use explicit connect auth.
  # Prefer OPAL_CORS_ORIGINS for browser origins.
end
