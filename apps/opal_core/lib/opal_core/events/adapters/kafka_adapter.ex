defmodule OpalCore.Events.Adapters.KafkaAdapter do
  @moduledoc """
  Future Kafka transport stub.

  Not activated. Domain code must not call this directly. Activation requires
  managed brokers, schema registry policy, and explicit operator authorization
  per docs/architecture/KAFKA_ACTIVATION_ADR.md.
  """

  def publish(_envelope) do
    {:error, :kafka_not_operational}
  end

  def operational? do
    System.get_env("OPAL_KAFKA_ENABLED") in ~w(true 1 yes)
  end
end
