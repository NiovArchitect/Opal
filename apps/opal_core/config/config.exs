# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :opal_core,
  ecto_repos: [OpalCore.Repo],
  generators: [timestamp_type: :utc_datetime, binary_id: true]

# Configure the endpoint
config :opal_core, OpalCoreWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: OpalCoreWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: OpalCore.PubSub,
  live_view: [signing_salt: "woi0xzG8"]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :trace_id, :job_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Accepted consent policy versions for Slice 1
config :opal_core, :accepted_policy_versions, ["slice1-0.1.0"]

# Path to monorepo contracts (relative to opal_core app root)
config :opal_core, :contracts_path, Path.expand("../../../packages/contracts", __DIR__)

config :opal_core, :ai_service_url, "http://127.0.0.1:8000"
config :opal_core, :ai_client, OpalCore.AI.HTTPClient
config :opal_core, :ai_request_timeout_ms, 5_000
config :opal_core, :dev_auth_enabled, false
config :opal_core, :event_probe_enabled, false

# P4.1 Kafka (local/dev). Empty brokers => adapter not operational.
config :opal_core, :kafka_brokers, System.get_env("OPAL_KAFKA_BROKERS") || ""

# Phase 2A — push adapters. Default :auto → Synthetic when creds absent.
config :opal_core, :push_adapter, :auto

config :opal_core, Oban,
  repo: OpalCore.Repo,
  queues: [ai: 10, events: 10, push: 10],
  plugins: [
    {Oban.Plugins.Pruner, max_age: 60 * 60 * 24 * 7},
    # TFT maturity tick — every minute in compile-time configs; test.exs disables plugins.
    {Oban.Plugins.Cron,
     crontab: [
       {"* * * * *", OpalCore.SocialFlow.TemporalFollowThroughTickWorker},
       # Phase 5D — temporal habit miner (weekly; Sunday 02:00 UTC)
       {"0 2 * * 0", OpalCore.SocialFlow.TemporalHabitMinerWorker},
       # Phase 10A — celebration reminders (daily 09:00 UTC)
       {"0 9 * * *", OpalCore.Celebrations.CelebrationReminderWorker}
     ]}
  ]

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
