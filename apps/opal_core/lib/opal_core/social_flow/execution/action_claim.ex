defmodule OpalCore.SocialFlow.Execution.ActionClaim do
  @moduledoc """
  Short-lived device claim/lease so multi-device presentation is once-only.

  Not a distributed-lock architecture. Minimum solution:

  claim(action_id, device_id) → exclusive present/execute window
  release / expire / supersede on plan_version change

  ExecutionAction remains user/plan scoped; claim is delivery presentation only.
  External side effects still use ReminderTransport / BookingTransport idempotency.
  """

  use Agent

  @default_ttl_seconds 120

  def start_link(_ \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          _ -> :ok
        end

      pid ->
        if Process.alive?(pid), do: :ok, else: restart_agent()
    end
  end

  def reset do
    ensure_started()
    safe_clear()
    :ok
  end

  defp restart_agent do
    case start_link([]) do
      {:ok, _} -> :ok
      {:error, {:already_started, _}} -> :ok
      _ -> :ok
    end
  end

  defp safe_clear do
    try do
      case Process.whereis(__MODULE__) do
        nil ->
          restart_agent()
          if Process.whereis(__MODULE__), do: Agent.update(__MODULE__, fn _ -> %{} end)

        pid ->
          if Process.alive?(pid) do
            Agent.update(__MODULE__, fn _ -> %{} end)
          else
            restart_agent()
            if Process.whereis(__MODULE__), do: Agent.update(__MODULE__, fn _ -> %{} end)
          end
      end
    catch
      :exit, _ ->
        restart_agent()

        try do
          if Process.whereis(__MODULE__), do: Agent.update(__MODULE__, fn _ -> %{} end)
        catch
          :exit, _ -> :ok
        end
    end
  end

  @doc """
  Attempt to claim an action for a device.

  Returns:
  - {:ok, claim} when acquired or same device renews
  - {:error, :claimed_elsewhere} when another device holds active claim
  """
  def claim(action_id, device_id, opts \\ [])

  def claim(action_id, device_id, opts)
      when is_binary(action_id) and is_binary(device_id) do
    ensure_started()
    now = Keyword.get(opts, :now) || DateTime.utc_now()
    ttl = Keyword.get(opts, :ttl_seconds, @default_ttl_seconds)
    plan_version = Keyword.get(opts, :plan_version)

    try do
      Agent.get_and_update(__MODULE__, fn state ->
        purge_expired(state, now)
        |> then(fn state2 ->
          case Map.get(state2, action_id) do
            nil ->
              c = new_claim(action_id, device_id, plan_version, now, ttl)
              {{:ok, c}, Map.put(state2, action_id, c)}

            %{"device_id" => ^device_id} = existing ->
              # Same device renews
              c =
                Map.merge(existing, %{
                  "expires_at" => DateTime.add(now, ttl, :second),
                  "renewed_at" => now,
                  "plan_version" => plan_version || existing["plan_version"]
                })

              {{:ok, Map.put(c, "renewed", true)}, Map.put(state2, action_id, c)}

            %{"expires_at" => exp} = other ->
              if DateTime.compare(exp, now) == :lt do
                c = new_claim(action_id, device_id, plan_version, now, ttl)
                {{:ok, c}, Map.put(state2, action_id, c)}
              else
                {{:error, :claimed_elsewhere, other}, state2}
              end

            _ ->
              {{:error, :invalid_claim_state}, state2}
          end
        end)
      end)
    catch
      :exit, _ ->
        ensure_started()

        c = new_claim(action_id, device_id, plan_version, now, ttl)

        try do
          Agent.update(__MODULE__, fn state -> Map.put(state, action_id, c) end)
          {:ok, c}
        catch
          :exit, _ -> {:ok, c}
        end
    end
  end

  def claim(_, _, _), do: {:error, :invalid}

  @doc "Release claim (after execute or dismiss)."
  def release(action_id, device_id) when is_binary(action_id) and is_binary(device_id) do
    ensure_started()

    Agent.get_and_update(__MODULE__, fn state ->
      case Map.get(state, action_id) do
        %{"device_id" => ^device_id} ->
          {{:ok, :released}, Map.delete(state, action_id)}

        nil ->
          {{:ok, :already_clear}, state}

        other ->
          {{:error, :not_holder, other}, state}
      end
    end)
  end

  def release(_, _), do: {:error, :invalid}

  @doc "Invalidate claims for a plan_version supersede or action id prefix."
  def invalidate_for_action(action_id) when is_binary(action_id) do
    ensure_started()
    Agent.update(__MODULE__, &Map.delete(&1, action_id))
    :ok
  end

  def invalidate_for_action(_), do: :ok

  @doc "Mark action executed — blocks other devices from re-presenting."
  def mark_executed(action_id, device_id, opts \\ [])

  def mark_executed(action_id, device_id, opts)
      when is_binary(action_id) and is_binary(device_id) do
    ensure_started()
    now = Keyword.get(opts, :now) || DateTime.utc_now()

    Agent.get_and_update(__MODULE__, fn state ->
      c = %{
        "action_id" => action_id,
        "device_id" => device_id,
        "status" => "executed",
        "executed_at" => now,
        "expires_at" => DateTime.add(now, 86_400, :second),
        "once_only" => true
      }

      {{:ok, c}, Map.put(state, action_id, c)}
    end)
  end

  def mark_executed(_, _, _), do: {:error, :invalid}

  @doc "Peek claim without acquiring."
  def peek(action_id) when is_binary(action_id) do
    ensure_started()
    now = DateTime.utc_now()

    Agent.get(__MODULE__, fn state ->
      case Map.get(state, action_id) do
        %{"expires_at" => exp} = c ->
          if DateTime.compare(exp, now) == :lt, do: nil, else: c

        other ->
          other
      end
    end)
  end

  def peek(_), do: nil

  @doc "True when another device already executed this action."
  def executed_elsewhere?(action_id, device_id) when is_binary(action_id) do
    case peek(action_id) do
      %{"status" => "executed", "device_id" => other} when other != device_id -> true
      _ -> false
    end
  end

  def executed_elsewhere?(_, _), do: false

  defp new_claim(action_id, device_id, plan_version, now, ttl) do
    %{
      "action_id" => action_id,
      "device_id" => device_id,
      "plan_version" => plan_version,
      "status" => "claimed",
      "claimed_at" => now,
      "expires_at" => DateTime.add(now, ttl, :second),
      "once_only" => true,
      "distributed_lock_architecture" => false
    }
  end

  defp purge_expired(state, now) do
    Enum.reduce(state, %{}, fn {id, c}, acc ->
      case c do
        %{"expires_at" => %DateTime{} = exp} ->
          if DateTime.compare(exp, now) == :lt, do: acc, else: Map.put(acc, id, c)

        _ ->
          Map.put(acc, id, c)
      end
    end)
  end
end
