defmodule OpalCore.Events.Workers.PublishOutboxWorker do
  @moduledoc """
  Publishes pending outbox rows through LocalAdapter (PubSub), optional
  FoundationHttpAdapter, and KafkaAdapter when OPAL_KAFKA_ENABLED.

  Domain code never calls Kafka directly — only via Outbox relay.
  """

  use Oban.Worker, queue: :events, max_attempts: 5

  alias OpalCore.Events.Adapters.FoundationHttpAdapter
  alias OpalCore.Events.Adapters.KafkaAdapter
  alias OpalCore.Events.Adapters.LocalAdapter
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"outbox_id" => id}}) do
    case Repo.get(EventOutbox, id) do
      nil ->
        :ok

      %EventOutbox{status: status} when status in ~w(published dead) ->
        :ok

      %EventOutbox{} = row ->
        deliver(row)
    end
  end

  defp deliver(%EventOutbox{envelope: envelope} = row) do
    with :ok <- LocalAdapter.publish(envelope),
         :ok <- maybe_foundation(envelope),
         :ok <- maybe_kafka(envelope) do
      {:ok, _} = Publisher.mark_published(row)
      :ok
    else
      {:error, reason} ->
        handle_delivery_error(row, reason)
    end
  end

  # Permanent: privacy/schema/allowlist/4xx (except retryable 4xx handled in adapter)
  defp handle_delivery_error(row, {:permanent_rejection, _} = reason) do
    {:ok, _} = Publisher.mark_failed(row, inspect(reason))
    _ = mark_dead(row, inspect(reason))
    :ok
  end

  defp handle_delivery_error(row, {:event_type_not_allowlisted, _} = reason) do
    # Not on foundation allowlist: mark published for local path only is wrong.
    # Local already published; foundation skip is permanent for this bridge version.
    # Treat as permanent so Oban does not spin forever when bridge is enabled.
    {:ok, _} = Publisher.mark_failed(row, inspect(reason))
    _ = mark_dead(row, inspect(reason))
    :ok
  end

  defp handle_delivery_error(row, reason) do
    {:ok, _} = Publisher.mark_failed(row, inspect(reason))
    {:error, reason}
  end

  defp maybe_foundation(envelope) do
    if FoundationHttpAdapter.enabled?() do
      FoundationHttpAdapter.publish(envelope)
    else
      :ok
    end
  end

  defp maybe_kafka(envelope) do
    if KafkaAdapter.operational?() do
      case KafkaAdapter.publish(envelope) do
        :ok -> :ok
        {:error, :kafka_not_operational} -> :ok
        {:error, reason} -> {:error, reason}
      end
    else
      :ok
    end
  end

  defp mark_dead(%EventOutbox{} = row, reason) do
    row
    |> EventOutbox.changeset(%{
      status: "dead",
      last_error: String.slice(reason, 0, 240),
      attempts: row.attempts + 1
    })
    |> Repo.update()
  end
end
