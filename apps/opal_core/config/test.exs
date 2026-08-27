import Config

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :opal_core, OpalCore.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "opal_core_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :opal_core, OpalCoreWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "/N1/FNcHEOWSwVr25InkcB6B0t6HXIPg7qeCrfdcm3PcP9Kz6o85jPGL73M2yKg1",
  server: false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Sort query params output of verified routes for robust url comparisons
config :phoenix,
  sort_verified_routes_query_params: true

config :opal_core, :dev_auth_enabled, true
config :opal_core, :synthetic_provider_expose_code, true
config :opal_core, :allow_founder_communication_seed, true
config :opal_core, :ai_client, OpalCore.AI.TestClient
config :opal_core, :ai_service_url, "http://127.0.0.1:9"
# High-entropy vault secret for tests (not a human password; ≥32 bytes).
config :opal_core,
       :provider_token_secret,
       "OpalTestVaultKey_9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"

config :opal_core,
       :calendar_connector_adapter,
       OpalCore.SocialFlow.RealWorld.Calendar.CompositeAdapter

config :opal_core, :env, :test
# Native calendar is core; external Google is optional (tests toggle as needed)
config :opal_core, :external_calendar_enabled, true

config :opal_core, Oban,
  testing: :inline,
  queues: false,
  plugins: false
