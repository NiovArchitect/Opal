defmodule OpalCore.SocialFlow.Feasibility.Metrics do
  @moduledoc """
  Privacy-safe step-elimination counters.

  No raw schedule/location content.
  """

  use Agent

  @keys ~w(
    calendar_checks_avoided
    schedule_conflicts_auto_detected
    map_searches_avoided
    travel_comparisons_avoided
    place_searches_avoided
    option_comparisons_avoided
    manual_reminders_avoided
  )

  def start_link(_ \\ []) do
    Agent.start_link(fn -> Map.new(@keys, &{&1, 0}) end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          o -> o
        end

      _ ->
        :ok
    end
  end

  def incr(key, n \\ 1) when key in @keys do
    ensure_started()
    Agent.update(__MODULE__, fn m -> Map.update(m, key, n, &(&1 + n)) end)
    :ok
  end

  def snapshot do
    ensure_started()
    Agent.get(__MODULE__, & &1)
  end

  def reset do
    ensure_started()
    Agent.update(__MODULE__, fn _ -> Map.new(@keys, &{&1, 0}) end)
  end

  def keys, do: @keys
end
