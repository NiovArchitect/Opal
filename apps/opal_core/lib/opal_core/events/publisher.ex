defmodule OpalCore.Events.Publisher do
  @moduledoc """
  Transport-neutral domain event publisher.

  Domain code calls `record/1` inside a multi/transaction. Oban later delivers
  outbox rows through the configured adapter (local now, Kafka later).
  Business code must not branch on transport.
  """

  import Ecto.Query

  alias OpalCore.Events.DomainEvent
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Events.Workers.PublishOutboxWorker
  alias OpalCore.Repo

  @doc """
  Build envelope and insert outbox row. Call within the same transaction as
  authoritative state when possible.
  """
  def record(attrs) when is_map(attrs) do
    with {:ok, envelope} <- DomainEvent.build(attrs) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      %EventOutbox{}
      |> EventOutbox.changeset(%{
        event_id: envelope["event_id"],
        event_type: envelope["event_type"],
        event_version: envelope["event_version"],
        aggregate_type: envelope["aggregate_type"],
        aggregate_id: envelope["aggregate_id"],
        partition_key: envelope["partition_key"],
        topic_family: envelope["topic_family"],
        privacy_class: envelope["privacy_class"],
        purpose: envelope["purpose"],
        correlation_id: envelope["correlation_id"],
        causation_id: envelope["causation_id"],
        envelope: envelope,
        status: "pending",
        available_at: now
      })
      |> Repo.insert()
      |> case do
        {:ok, row} ->
          # Best-effort schedule; transaction may still be open. Worker reloads row.
          _ = schedule_publish(row.id)
          {:ok, row}

        {:error, %Ecto.Changeset{} = cs} ->
          if unique_event_id_error?(cs) do
            case Repo.get_by(EventOutbox, event_id: envelope["event_id"]) do
              %EventOutbox{} = existing -> {:ok, existing}
              nil -> {:error, cs}
            end
          else
            {:error, cs}
          end

        other ->
          other
      end
    end
  end

  defp unique_event_id_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:event_id, {_, meta}} -> meta[:constraint] == :unique
      _ -> false
    end)
  end

  def schedule_publish(outbox_id) when is_binary(outbox_id) do
    %{outbox_id: outbox_id}
    |> PublishOutboxWorker.new()
    |> Oban.insert()
  rescue
    _ -> {:error, :oban_unavailable}
  end

  def pending(limit \\ 50) do
    now = DateTime.utc_now()

    from(o in EventOutbox,
      where: o.status == "pending" and o.available_at <= ^now,
      order_by: [asc: o.available_at],
      limit: ^limit
    )
    |> Repo.all()
  end

  def mark_published(%EventOutbox{} = row) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    row
    |> EventOutbox.changeset(%{
      status: "published",
      published_at: now,
      last_error: nil
    })
    |> Repo.update()
  end

  def mark_failed(%EventOutbox{} = row, reason) when is_binary(reason) do
    attempts = row.attempts + 1
    status = if attempts >= 8, do: "dead", else: "pending"
    delay = min(trunc(:math.pow(2, attempts)), 300)

    available =
      DateTime.utc_now()
      |> DateTime.add(delay, :second)
      |> DateTime.truncate(:microsecond)

    row
    |> EventOutbox.changeset(%{
      status: status,
      attempts: attempts,
      available_at: available,
      last_error: String.slice(reason, 0, 240)
    })
    |> Repo.update()
  end
end
