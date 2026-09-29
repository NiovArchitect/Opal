defmodule OpalCore.Calls.ChannelPresence do
  @moduledoc """
  Who is currently joined to call:<id>.
  This is process memory only. A restart or a socket drop means the call
  is no longer live, even if the database row is still answered.
  """

  @table :opal_call_channel_presence

  def track(call_id, pid) when is_binary(call_id) and is_pid(pid) do
    ensure!()
    :ets.insert(@table, {call_id, pid})
    :ok
  end

  def untrack(call_id, pid) when is_binary(call_id) and is_pid(pid) do
    ensure!()
    :ets.delete_object(@table, {call_id, pid})
    :ok
  end

  def live?(call_id) when is_binary(call_id) do
    ensure!()

    @table
    |> :ets.lookup(call_id)
    |> Enum.any?(fn {_id, pid} -> is_pid(pid) and Process.alive?(pid) end)
  end

  defp ensure! do
    case :ets.whereis(@table) do
      :undefined ->
        try do
          :ets.new(@table, [:bag, :public, :named_table, read_concurrency: true])
        rescue
          ArgumentError -> :ets.whereis(@table)
        end

      table ->
        table
    end
  end
end
