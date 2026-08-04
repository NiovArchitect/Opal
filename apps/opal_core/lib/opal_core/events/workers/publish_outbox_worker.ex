defmodule OpalCore.Events.Workers.PublishOutboxWorker do
  @moduledoc """
  Publishes pending outbox rows through LocalAdapter (PubSub) and, when
  configured for development, FoundationHttpAdapter (ingress governance).

  Kafka/Redpanda is never contacted directly from Opal business code.
  """

  use Oban.Worker, queue: :events, max_attempts: 5

  alias OpalCore.Events.Adapters.FoundationHttpAdapter
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
         :ok <- maybe_foundation(envelope) do
      {:ok, _} = Publisher.mark_published(row)
      :ok
    else
      {:error, {:permanent_rejection, _} = reason} ->
        {:ok, _} = Publisher.mark_failed(row, inspect(reason))
        # Permanent rejection should not retry forever
        _ = mark_dead(row, inspect(reason))
        :ok

      {:error, reason} ->
        {:ok, _} = Publisher.mark_failed(row, inspect(reason))
        {:error, reason}
    end
  end

  defp maybe_foundation(envelope) do
    if FoundationHttpAdapter.enabled?() do
      FoundationHttpAdapter.publish(envelope)
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
