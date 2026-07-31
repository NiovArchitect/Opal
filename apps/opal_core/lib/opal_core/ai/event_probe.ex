defmodule OpalCore.AI.EventProbe do
  @moduledoc """
  Optional in-memory PubSub event capture for container E2E.

  Enabled only when `:event_probe_enabled` is true.
  """

  use GenServer

  @topic_prefix "ai_jobs:"

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def enabled? do
    Application.get_env(:opal_core, :event_probe_enabled, false)
  end

  def reset do
    if enabled?(), do: GenServer.call(__MODULE__, :reset), else: :ok
  end

  def events do
    if enabled?(), do: GenServer.call(__MODULE__, :events), else: []
  end

  @impl true
  def init(_opts) do
    if enabled?() do
      # Subscribe to a broad pattern via Phoenix.PubSub is not supported;
      # journeys subscribe to known user topics after seeding fixtures.
      {:ok, %{events: []}}
    else
      :ignore
    end
  end

  def subscribe_user(user_id) when is_binary(user_id) do
    if enabled?() do
      Phoenix.PubSub.subscribe(OpalCore.PubSub, @topic_prefix <> user_id)
      :ok
    else
      :ok
    end
  end

  def record(event) when is_map(event) do
    if enabled?() and Process.whereis(__MODULE__) do
      GenServer.cast(__MODULE__, {:record, event})
    else
      :ok
    end
  end

  @impl true
  def handle_call(:reset, _from, state), do: {:reply, :ok, %{state | events: []}}
  def handle_call(:events, _from, state), do: {:reply, Enum.reverse(state.events), state}

  @impl true
  def handle_cast({:record, event}, state) do
    {:noreply, %{state | events: [event | state.events]}}
  end

  @impl true
  def handle_info(event, state) when is_map(event) do
    {:noreply, %{state | events: [event | state.events]}}
  end

  def handle_info(_msg, state), do: {:noreply, state}
end
