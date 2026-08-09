defmodule OpalCore.SocialFlow.Feasibility.Probing do
  @moduledoc """
  Rate-limit fake alignment scenarios used to probe private schedule/location.

  Prevents arbitrary peer APIs: is X free? where is X?
  """

  use Agent

  @window_sec 3_600
  @max_per_window 30

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

  @doc """
  Allow a feasibility evaluation only within legitimate conversation context
  and under rate limits.
  """
  def authorize_evaluation(actor_user_id, conversation_id, opts \\ [])
      when is_binary(actor_user_id) and is_binary(conversation_id) do
    ensure_started()
    now = System.system_time(:second)
    key = "#{actor_user_id}:#{conversation_id}"
    max = Keyword.get(opts, :max, @max_per_window)

    Agent.get_and_update(__MODULE__, fn state ->
      {count, last} = Map.get(state, key, {0, now})

      cond do
        now - last > @window_sec ->
          {:ok, Map.put(state, key, {1, now})}

        count >= max ->
          {{:error, :rate_limited}, state}

        true ->
          {:ok, Map.put(state, key, {count + 1, last})}
      end
    end)
  end

  def reset do
    ensure_started()
    Agent.update(__MODULE__, fn _ -> %{} end)
  end
end
