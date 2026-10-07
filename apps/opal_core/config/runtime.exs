import Config

# Runtime configuration shared by all environments.
# Explicit env flags required for Docker E2E; never silently enable DevAuth.

# Load ~/.opal/tunnel.env when present (ngrok URLs — never committed).
# Skip in :test so ConnTest hosts (www.example.com) are not rejected by PublicHost
# and so founder tunnel/SMS env does not leak into the suite.
tunnel_env = Path.expand("~/.opal/tunnel.env")

if config_env() != :test and File.exists?(tunnel_env) do
  tunnel_env
  |> File.read!()
  |> String.split(~r/\r?\n/, trim: true)
  |> Enum.each(fn line ->
    case String.split(line, "=", parts: 2) do
      [k, v] ->
        k = String.trim(k)
        v = v |> String.trim() |> String.trim("\"")

        if k != "" and not String.starts_with?(k, "#") and System.get_env(k) in [nil, ""] do
          System.put_env(k, v)
        end

      _ ->
        :ok
    end
  end)
end

if System.get_env("PHX_SERVER") do
  config :opal_core, OpalCoreWeb.Endpoint, server: true
end

config :opal_core, OpalCoreWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))]

# PUBLIC_BASE_URL modes: lan | tunnel | production
case System.get_env("OPAL_PUBLIC_BASE_MODE") do
  "tunnel" -> config :opal_core, :public_base_mode, :tunnel
  "production" -> config :opal_core, :public_base_mode, :production
  "lan" -> config :opal_core, :public_base_mode, :lan
  _ -> config :opal_core, :public_base_mode, :lan
end

if base = System.get_env("OPAL_PUBLIC_BASE_URL") || System.get_env("OPAL_TUNNEL_API_URL") do
  if String.trim(base) != "" do
    config :opal_core, :public_base_url, String.trim_trailing(String.trim(base), "/")
  end
end

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

if m = System.get_env("OPAL_PLACE_PROVIDER_BACKEND") do
  config :opal_core, :place_provider_backend, m
end

if System.get_env("OPAL_ALLOW_OSM_PUBLIC") in ~w(false 0 no) do
  config :opal_core, :allow_osm_public, false
else
  if System.get_env("OPAL_ALLOW_OSM_PUBLIC") in ~w(true 1 yes) do
    config :opal_core, :allow_osm_public, true
  end
end

if u = System.get_env("OPAL_OVERPASS_URL") do
  config :opal_core, :openstreetmap_overpass_url, u
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

if System.get_env("OPAL_DECISION_RECOMPOSITION_CONSUMER") in ~w(true 1 yes) do
  config :opal_core, :decision_recomposition_consumer_enabled, true
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
#
# Prefer real when Twilio Verify creds are present and mode is unset.
# Explicit synthetic_development stays synthetic (tests / local only).
# Misconfigured production_sms returns provider errors — never a fake "real" OTP.
twilio_verify_creds? = fn ->
  sid = System.get_env("OPAL_TWILIO_ACCOUNT_SID")
  token = System.get_env("OPAL_TWILIO_AUTH_TOKEN")
  service = System.get_env("OPAL_TWILIO_VERIFY_SERVICE_SID")

  is_binary(sid) and sid != "" and is_binary(token) and token != "" and is_binary(service) and
    service != ""
end

case System.get_env("OPAL_PHONE_VERIFY_MODE") do
  "production_sms" ->
    config :opal_core, :phone_verify_mode, :production_sms

  "disabled" ->
    config :opal_core, :phone_verify_mode, :disabled

  "synthetic_development" ->
    config :opal_core, :phone_verify_mode, :synthetic_development

  _ ->
    cond do
      twilio_verify_creds?.() ->
        config :opal_core, :phone_verify_mode, :production_sms

      config_env() == :prod ->
        config :opal_core, :phone_verify_mode, :disabled

      true ->
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

  # Hosted managed Postgres (e.g. Render external) requires TLS with peer verification.
  # R1A: never verify_none — encrypt + authenticate server identity.
  use_ssl? = System.get_env("DATABASE_SSL") not in ~w(false 0 no)

  repo_opts = [
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6
  ]

  repo_opts =
    repo_opts ++
      OpalCore.Repo.SslConfig.repo_ssl_opts(
        enabled?: use_ssl?,
        hostname: OpalCore.Repo.SslConfig.hostname_from_url(database_url),
        fail_closed?: true
      )

  config :opal_core, OpalCore.Repo, repo_opts

  # Production SMS must not use the hardcoded onboarding pepper.
  if System.get_env("OPAL_PHONE_VERIFY_MODE") == "production_sms" do
    pepper = System.get_env("OPAL_PHONE_LOOKUP_PEPPER")

    if pepper in [nil, ""] do
      raise """
      OPAL_PHONE_LOOKUP_PEPPER is required when OPAL_PHONE_VERIFY_MODE=production_sms.
      """
    end

    config :opal_core, :phone_lookup_pepper, pepper
  end

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
