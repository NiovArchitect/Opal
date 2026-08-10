defmodule OpalCore.SocialFlow.Physical.Providers.Metrics do
  @moduledoc """
  Privacy-safe provider observability.

  No raw private origins or hidden constraints in events.
  """

  use Agent

  @events ~w(
    provider.query_started
    provider.query_completed
    provider.query_avoided
    provider.cache_hit
    provider.result_stale
    provider.result_rejected
    provider.result_admitted
    provider.error
    provider.execution_ready
  )

  def events, do: @events

  def start_link(_opts \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          other -> other
        end

      _ ->
        :ok
    end
  end

  def reset do
    ensure_started()
    Agent.update(__MODULE__, fn _ -> %{} end)
  end

  def emit(event, attrs \\ %{}) when is_binary(event) do
    ensure_started()
    family = to_string(attrs[:family] || attrs["family"] || "unknown")
    key = {event, family}

    Agent.update(__MODULE__, fn state ->
      Map.update(state, key, 1, &(&1 + 1))
    end)

    :telemetry.execute(
      [:opal, :provider, String.to_atom(String.replace(event, "provider.", ""))],
      %{count: 1},
      %{family: family, event: event}
    )

    :ok
  rescue
    _ -> :ok
  end

  def snapshot do
    ensure_started()

    Agent.get(__MODULE__, fn state ->
      state
      |> Enum.map(fn {{event, family}, n} ->
        %{"event" => event, "family" => family, "count" => n}
      end)
      |> Enum.sort_by(&{&1["family"], &1["event"]})
    end)
  end

  def count(event, family \\ "unknown") do
    ensure_started()
    Agent.get(__MODULE__, &Map.get(&1, {event, to_string(family)}, 0))
  end
end
