defmodule OpalCore.SocialMemory.Cache do
  @moduledoc false
  use GenServer

  @table :opal_social_memory_recall
  @ttl_ms 60_000

  def start_link(_opts \\ []) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def get(account_id, conversation_id) do
    ensure_table()
    key = {account_id, conversation_id}

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

  def put(account_id, conversation_id, value) do
    ensure_table()
    expires = System.monotonic_time(:millisecond) + @ttl_ms
    :ets.insert(@table, {{account_id, conversation_id}, value, expires})
    :ok
  end

  def invalidate(account_id, conversation_id) do
    ensure_table()
    :ets.delete(@table, {account_id, conversation_id})
    :ok
  end

  def invalidate_account(account_id) do
    ensure_table()

    @table
    |> :ets.match({{account_id, :"$1"}, :_, :_})
    |> Enum.each(fn [conv] -> :ets.delete(@table, {account_id, conv}) end)

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
