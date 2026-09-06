defmodule OpalCore.Events.Adapters.KafkaAdapter do
  @moduledoc """
  Kafka protocol producer (via brod) for durable outbox fanout.

  Enabled when `OPAL_KAFKA_ENABLED` is truthy and brokers are configured.
  Never source of truth — Postgres + Outbox remain authoritative.
  Clients must not connect here.
  """

  require Logger

  @client :opal_kafka_client

  def operational? do
    System.get_env("OPAL_KAFKA_ENABLED") in ~w(true 1 yes) and brokers() != []
  end

  def publish(%{"event_id" => event_id, "topic_family" => family, "partition_key" => key} = envelope) do
    if not operational?() do
      {:error, :kafka_not_operational}
    else
      topic = topic_name(family)
      value = Jason.encode!(envelope)
      ensure_client!()

      # Partition 0 for foundation proof; partition_key travels in envelope for ordering semantics.
      # Multi-partition hash routing can be enabled later without changing Outbox contracts.
      case :brod.produce_sync(@client, topic, 0, key, value) do
        :ok ->
          log_ok(event_id, envelope, family)
          :ok

        {:ok, _} ->
          log_ok(event_id, envelope, family)
          :ok

        {:error, reason} = err ->
          Logger.warning("[kafka] publish failed id=#{event_id} reason=#{inspect(reason)}")
          err
      end
    end
  end

  def publish(_), do: {:error, :invalid_envelope}

  def health do
    cond do
      not operational?() ->
        %{ok: false, reason: :not_enabled, brokers: brokers()}

      true ->
        try do
          ensure_client!()

          case :brod.get_metadata(brokers()) do
            {:ok, _} -> %{ok: true, brokers: brokers(), client: @client}
            {:error, reason} -> %{ok: false, reason: reason, brokers: brokers()}
          end
        rescue
          e -> %{ok: false, reason: Exception.message(e), brokers: brokers()}
        end
    end
  end

  defp log_ok(event_id, envelope, family) do
    Logger.info(fn ->
      "[domain_event] type=#{envelope["event_type"]} id=#{event_id} family=#{family} transport=kafka"
    end)
  end

  defp ensure_client! do
    case Process.whereis(@client) do
      pid when is_pid(pid) ->
        _ = :brod.start_producer(@client, "opal.decision.events", [])
        :ok

      _ ->
        case :brod.start_client(brokers(), @client, reconnect_cool_down_seconds: 2) do
          :ok -> :ok
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          {:error, :already_present} ->
            _ = :brod.stop_client(@client)
            :ok = restart_client()
          {:error, reason} -> raise "kafka client start failed: #{inspect(reason)}"
        end

        _ = :brod.start_producer(@client, "opal.decision.events", [])
        _ = :brod.start_producer(@client, "opal.audit.events", [])
        :ok
    end
  end

  defp restart_client do
    case :brod.start_client(brokers(), @client, reconnect_cool_down_seconds: 2) do
      :ok -> :ok
      {:ok, _} -> :ok
      {:error, {:already_started, _}} -> :ok
      {:error, reason} -> raise "kafka client restart failed: #{inspect(reason)}"
    end
  end

  defp brokers do
    (System.get_env("OPAL_KAFKA_BROKERS") || Application.get_env(:opal_core, :kafka_brokers) || "")
    |> String.split(",", trim: true)
    |> Enum.map(fn hostport ->
      case String.split(hostport, ":") do
        [host, port] -> {String.to_charlist(host), String.to_integer(port)}
        [host] -> {String.to_charlist(host), 9092}
      end
    end)
  end

  defp topic_name(family) when is_binary(family), do: family
  defp topic_name(_), do: "opal.audit.events"
end
