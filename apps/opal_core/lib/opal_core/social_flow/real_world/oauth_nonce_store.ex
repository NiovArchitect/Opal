defmodule OpalCore.SocialFlow.RealWorld.OAuthNonceStore do
  @moduledoc """
  Single-use OAuth state jti store with TTL.

  In-process Agent for now (sufficient for single-node / test).
  Production multi-node can swap for Redis/DB without changing callers.
  """

  use Agent

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

  def put_pending(jti, meta) when is_binary(jti) and is_map(meta) do
    ensure_started()
    Agent.update(__MODULE__, &Map.put(&1, jti, Map.put(meta, "status", "pending")))
    :ok
  end

  def consume(jti) when is_binary(jti) do
    ensure_started()
    now = System.system_time(:second)

    Agent.get_and_update(__MODULE__, fn state ->
      case Map.get(state, jti) do
        nil ->
          {{:error, :not_found}, state}

        %{"status" => "used"} ->
          {{:error, :already_used}, state}

        %{"expires_at" => exp} when is_integer(exp) and exp < now ->
          {{:error, :expired}, Map.delete(state, jti)}

        meta ->
          {{:ok, meta}, Map.put(state, jti, Map.put(meta, "status", "used"))}
      end
    end)
  end

  def reset do
    ensure_started()
    Agent.update(__MODULE__, fn _ -> %{} end)
  end

  def pending?(jti) do
    ensure_started()

    case Agent.get(__MODULE__, &Map.get(&1, jti)) do
      %{"status" => "pending"} -> true
      _ -> false
    end
  end
end
