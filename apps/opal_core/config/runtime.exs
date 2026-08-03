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

# Synthetic provider code exposure — never enable for public production.
if System.get_env("OPAL_SYNTHETIC_EXPOSE_CODE") in ~w(true 1 yes) do
  config :opal_core, :synthetic_provider_expose_code, true
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
