defmodule OpalCore.Events.Adapters.LocalAdapter do
  @moduledoc """
  Current event transport: in-process PubSub + structured log.

  Kafka is not operational. This adapter proves consumers can attach to the
  same envelopes later without changing domain code.
  """

  require Logger

  @pubsub OpalCore.PubSub

  def publish(
        %{"event_id" => event_id, "event_type" => type, "topic_family" => family} = envelope
      ) do
    Logger.info(fn ->
      "[domain_event] type=#{type} id=#{event_id} family=#{family} transport=local"
    end)

    # Topic names mirror future Kafka families without exposing brokers to users.
    :ok = Phoenix.PubSub.broadcast(@pubsub, "domain_events:#{family}", {:domain_event, envelope})
    :ok = Phoenix.PubSub.broadcast(@pubsub, "domain_events:all", {:domain_event, envelope})
    :ok
  end

  def publish(_), do: {:error, :invalid_envelope}
end
