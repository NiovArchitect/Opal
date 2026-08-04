defmodule OpalCore.Events.Workers.PublishOutboxWorker do
  @moduledoc """
  Publishes pending outbox rows through the configured adapter.
  """

  use Oban.Worker, queue: :events, max_attempts: 5

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
    adapter = active_adapter()

    case adapter.publish(envelope) do
      :ok ->
        {:ok, _} = Publisher.mark_published(row)
        :ok

      {:error, reason} ->
        {:ok, _} = Publisher.mark_failed(row, inspect(reason))
        {:error, reason}
    end
  end

  defp active_adapter do
    if KafkaAdapter.operational?() do
      KafkaAdapter
    else
      LocalAdapter
    end
  end
end
