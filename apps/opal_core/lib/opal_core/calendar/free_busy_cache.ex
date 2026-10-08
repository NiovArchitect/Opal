defmodule OpalCore.Calendar.FreeBusyCache do
  @moduledoc """
  Short-lived free/busy cache (≤1 hour).

  Trust guarantee: free/busy is queried per planning request when cache misses;
  we never warehouse calendar event bodies. Cache holds busy intervals only —
  no event titles. Started under the application supervisor.
  """

  use GenServer

  @table :opal_calendar_freebusy_cache
  # Cap at 1 hour as required by Paste G privacy rules.
  @max_ttl_ms 60 * 60 * 1000
  @default_ttl_ms @max_ttl_ms

  def start_link(_opts \\ []) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  @doc "Fetch cached busy list or `:miss`."
  def get(user_id, range_key) when is_binary(user_id) do
    ensure_table()
    key = {user_id, range_key}

    case :ets.lookup(@table, key) do
      [{^key, value, expires_at}] ->
        if System.monotonic_time(:millisecond) < expires_at do
          {:ok, value}
        else
          :ets.delete(@table, key)
          :miss
        end

      _ ->
        :miss
    end
  end

  def get(_, _), do: :miss

  @doc "Put busy intervals. TTL capped at 1 hour."
  def put(user_id, range_key, busy, opts \\ []) when is_binary(user_id) and is_list(busy) do
    ensure_table()
    ttl = min(Keyword.get(opts, :ttl_ms, @default_ttl_ms), @max_ttl_ms)
    expires = System.monotonic_time(:millisecond) + ttl
    :ets.insert(@table, {{user_id, range_key}, busy, expires})
    :ok
  end

  def invalidate(user_id) when is_binary(user_id) do
    ensure_table()

    @table
    |> :ets.match({{user_id, :"$1"}, :_, :_})
    |> Enum.each(fn [rk] -> :ets.delete(@table, {user_id, rk}) end)

    :ok
  end

  def reset do
    ensure_table()
    :ets.delete_all_objects(@table)
    :ok
  end

  @impl true
  def init(:ok) do
    ensure_table()
    {:ok, %{}}
  end

  defp ensure_table do
    case :ets.whereis(@table) do
      :undefined ->
        :ets.new(@table, [
          :named_table,
          :public,
          :set,
          read_concurrency: true,
          write_concurrency: true
        ])

      _ ->
        @table
    end
  end
end
