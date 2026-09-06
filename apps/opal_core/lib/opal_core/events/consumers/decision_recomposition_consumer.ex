defmodule OpalCore.Events.Consumers.DecisionRecompositionConsumer do
  @moduledoc """
  P4.5 recomposition consumer.

  - Kafka (brod) when KafkaAdapter.operational?
  - LocalAdapter PubSub `{:domain_event, envelope}` when Kafka off (tests)
  - Dedupe via event_processing_records; poison → quarantine (no infinite retry)
  """

  use GenServer

  require Logger

  alias OpalCore.DecisionIntelligence.EventProcessingRecord
  alias OpalCore.DecisionIntelligence.Recomposer
  alias OpalCore.Events.Adapters.KafkaAdapter

  @pubsub OpalCore.PubSub
  @group "opal-decision-recomposition-v1"
  @topic "opal.decision.events"
  @client :opal_kafka_recomposition_client

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: Keyword.get(opts, :name, __MODULE__))
  end

  @impl true
  def init(opts) do
    if Keyword.get(opts, :subscribe_pubsub, true) do
      :ok = Phoenix.PubSub.subscribe(@pubsub, "domain_events:#{@topic}")
      :ok = Phoenix.PubSub.subscribe(@pubsub, "domain_events:all")
    end

    state = %{
      kafka?: KafkaAdapter.operational?() and Keyword.get(opts, :kafka, true),
      group: @group,
      topic: @topic
    }

    if state.kafka? do
      send(self(), :start_kafka_consumer)
    end

    {:ok, state}
  end

  @impl true
  def handle_info(:start_kafka_consumer, state) do
    _ = start_brod_group(state)
    {:noreply, state}
  rescue
    e ->
      Logger.warning("[recomposition] kafka consumer start failed: #{Exception.message(e)}")
      {:noreply, %{state | kafka?: false}}
  end

  def handle_info({:domain_event, envelope}, state) when is_map(envelope) do
    _ = handle_envelope(envelope)
    {:noreply, state}
  end

  def handle_info(_msg, state), do: {:noreply, state}

  @doc false
  def handle_envelope(envelope) when is_map(envelope) do
    event_id = envelope["event_id"]
    event_type = envelope["event_type"]
    payload = envelope["payload"] || %{}

    cond do
      not is_binary(event_id) or event_id == "" ->
        {:error, :missing_event_id}

      EventProcessingRecord.already_processed?(event_id) ->
        {:ok, :duplicate}

      not recomposition_relevant?(event_type) ->
        _ = EventProcessingRecord.record_processed(event_id)
        {:ok, :ignored}

      true ->
        attrs =
          payload
          |> Map.merge(%{
            "event_id" => event_id,
            "event_type" => event_type
          })

        try do
          case Recomposer.apply_world_event(attrs) do
            {:ok, _} = ok ->
              _ = EventProcessingRecord.record_processed(event_id)
              ok

            {:error, reason} = err ->
              if poison?(reason) do
                _ = EventProcessingRecord.record_quarantine(event_id, reason)
              end

              err
          end
        rescue
          e ->
            _ = EventProcessingRecord.record_quarantine(event_id, Exception.message(e))
            Logger.error("[recomposition] poison event=#{event_id} #{Exception.message(e)}")
            {:error, :quarantined}
        end
    end
  end

  def handle_envelope(_), do: {:error, :invalid_envelope}

  defp recomposition_relevant?(type) when is_binary(type) do
    String.starts_with?(type, "provider.") or
      String.starts_with?(type, "availability.") or
      String.starts_with?(type, "location.") or
      String.starts_with?(type, "graph.") or
      String.starts_with?(type, "journey.") or
      type in ~w(provider_unavailable evidence.refreshed world_fact.observed)
  end

  defp recomposition_relevant?(_), do: false

  defp poison?(reason) do
    reason in [:invalid, :invalid_envelope] or match?({:exception, _}, reason)
  end

  defp start_brod_group(state) do
    brokers = kafka_brokers()

    case :brod.start_client(brokers, @client, reconnect_cool_down_seconds: 2) do
      :ok -> :ok
      {:ok, _} -> :ok
      {:error, {:already_started, _}} -> :ok
      {:error, :already_present} -> :ok
      {:error, reason} -> raise "brod client failed: #{inspect(reason)}"
    end

    # Group subscriber callback module — message-driven via PubSub for foundation;
    # brod group is started when operational for local Kafka proofs.
    cb = OpalCore.Events.Consumers.DecisionRecompositionBrodHandler

    case :brod.start_link_group_subscriber(
           @client,
           String.to_charlist(state.group),
           [String.to_charlist(state.topic)],
           [offset_reset_policy: :reset_to_earliest],
           [],
           cb,
           []
         ) do
      {:ok, _pid} -> :ok
      {:error, reason} -> raise "brod group subscriber failed: #{inspect(reason)}"
    end
  end

  defp kafka_brokers do
    (System.get_env("OPAL_KAFKA_BROKERS") || Application.get_env(:opal_core, :kafka_brokers) || "")
    |> String.split(",", trim: true)
    |> Enum.map(fn hostport ->
      case String.split(hostport, ":") do
        [host, port] -> {String.to_charlist(host), String.to_integer(port)}
        [host] -> {String.to_charlist(host), 9092}
      end
    end)
  end
end
