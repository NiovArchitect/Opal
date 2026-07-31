defmodule OpalCore.Application do
  # See https://elixir.hexdocs.pm/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children =
      [
        OpalCoreWeb.Telemetry,
        OpalCore.Repo,
        {DNSCluster, query: Application.get_env(:opal_core, :dns_cluster_query) || :ignore},
        {Phoenix.PubSub, name: OpalCore.PubSub},
        OpalCoreWeb.Presence,
        {Oban, Application.fetch_env!(:opal_core, Oban)},
        OpalCoreWeb.Endpoint
      ]
      |> maybe_start_test_client()
      |> maybe_start_event_probe()

    # See https://elixir.hexdocs.pm/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: OpalCore.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    OpalCoreWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp maybe_start_test_client(children) do
    if Application.get_env(:opal_core, :ai_client) == OpalCore.AI.TestClient do
      children ++ [{OpalCore.AI.TestClient, []}]
    else
      children
    end
  end

  defp maybe_start_event_probe(children) do
    if Application.get_env(:opal_core, :event_probe_enabled, false) do
      children ++ [{OpalCore.AI.EventProbe, []}]
    else
      children
    end
  end
end
