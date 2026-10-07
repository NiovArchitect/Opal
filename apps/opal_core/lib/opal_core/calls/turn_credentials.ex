defmodule OpalCore.Calls.TurnCredentials do
  @moduledoc """
  Per-call TURN credential cache + participant authorization.

  Mints Twilio NTS tokens once per call_session and reuses them for ICE
  restarts within the call (Twilio TTL is typically 24h).
  """

  require Logger

  alias OpalCore.Calls
  alias OpalCore.Calls.TwilioNts

  @table :opal_call_turn_credentials
  # Refresh 5 minutes before Twilio TTL expires.
  @skew_seconds 300

  @doc """
  Fetch ice_servers for a call participant.

  Returns:
  - `{:ok, %{ice_servers: [...], ttl: n, source: "twilio_nts"}}`
  - `{:disabled, "TURN not configured"}` — client must fall back to STUN-only
  - `{:error, :not_found | :forbidden | reason}`
  """
  def for_participant(call_id, user_id)
      when is_binary(call_id) and is_binary(user_id) do
    with {:ok, session} <- Calls.get(call_id, user_id) do
      _ = session
      resolve(call_id)
    end
  end

  def for_participant(_, _), do: {:error, :invalid}

  defp resolve(call_id) do
    case cached(call_id) do
      {:ok, payload} ->
        {:ok, payload}

      :miss ->
        case TwilioNts.mint() do
          {:ok, minted} ->
            store(call_id, minted)
            {:ok, public_payload(minted)}

          {:disabled, reason} ->
            Logger.info("turn.disabled call_id=#{call_id} reason=#{inspect(reason)}")
            {:disabled, reason}

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  defp public_payload(minted) do
    %{
      "ice_servers" => minted.ice_servers,
      "ttl" => minted.ttl,
      "source" => "twilio_nts"
    }
  end

  defp cached(call_id) do
    ensure!()
    now = System.system_time(:second)

    case :ets.lookup(@table, call_id) do
      [{^call_id, payload, expires_at}] when is_integer(expires_at) and expires_at > now ->
        {:ok, payload}

      [{^call_id, _, _}] ->
        :ets.delete(@table, call_id)
        :miss

      [] ->
        :miss
    end
  end

  defp store(call_id, minted) do
    ensure!()
    ttl = minted.ttl || 86_400
    expires_at = System.system_time(:second) + max(ttl - @skew_seconds, 60)
    payload = public_payload(minted)
    :ets.insert(@table, {call_id, payload, expires_at})
    :ok
  end

  @doc "Test helper — clear cache."
  def clear_cache! do
    ensure!()
    :ets.delete_all_objects(@table)
    :ok
  end

  defp ensure! do
    case :ets.whereis(@table) do
      :undefined ->
        try do
          :ets.new(@table, [:named_table, :public, :set, read_concurrency: true])
        rescue
          ArgumentError -> :ets.whereis(@table)
        end

      table ->
        table
    end
  end
end
