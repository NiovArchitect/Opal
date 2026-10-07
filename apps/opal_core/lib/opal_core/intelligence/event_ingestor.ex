defmodule OpalCore.Intelligence.EventIngestor do
  @moduledoc """
  Unified write-ahead signal stream. Persist first, then confirm.

  Idempotent on `idempotency_key` when provided (message id, rsvp tuple, etc.).
  """

  import Ecto.Query

  alias OpalCore.Intelligence.Event
  alias OpalCore.Repo

  @doc """
  Ingest one event.

  attrs: type, actor_id, payload, optional conversation_id / occurred_at / idempotency_key
  """
  def ingest(attrs) when is_map(attrs) do
    type = fetch!(attrs, :type)
    actor_id = fetch!(attrs, :actor_id)
    payload = Map.get(attrs, :payload) || Map.get(attrs, "payload") || %{}
    occurred_at =
      Map.get(attrs, :occurred_at) || Map.get(attrs, "occurred_at") ||
        DateTime.utc_now() |> DateTime.truncate(:microsecond)

    key = Map.get(attrs, :idempotency_key) || Map.get(attrs, "idempotency_key")

    cs =
      %Event{}
      |> Event.changeset(%{
        type: type,
        actor_id: actor_id,
        conversation_id: Map.get(attrs, :conversation_id) || Map.get(attrs, "conversation_id"),
        occurred_at: occurred_at,
        payload: stringify_keys(payload),
        idempotency_key: key
      })

    case Repo.insert(cs) do
      {:ok, event} ->
        {:ok, event}

      {:error, %Ecto.Changeset{errors: errors} = changeset} ->
        if unique_idempotency?(errors) and is_binary(key) do
          case Repo.get_by(Event, idempotency_key: key) do
            %Event{} = existing -> {:ok, existing}
            nil -> {:error, changeset}
          end
        else
          {:error, changeset}
        end
    end
  end

  def ingest(_), do: {:error, :invalid_attrs}

  @doc "Query events for an actor in a time range (inclusive)."
  def list_for_actor(actor_id, opts \\ []) when is_binary(actor_id) do
    from_dt = Keyword.get(opts, :from)
    to_dt = Keyword.get(opts, :to)
    type = Keyword.get(opts, :type)
    limit = Keyword.get(opts, :limit, 200)

    q =
      from(e in Event,
        where: e.actor_id == ^actor_id,
        order_by: [desc: e.occurred_at],
        limit: ^limit
      )

    q =
      if match?(%DateTime{}, from_dt),
        do: from(e in q, where: e.occurred_at >= ^from_dt),
        else: q

    q =
      if match?(%DateTime{}, to_dt),
        do: from(e in q, where: e.occurred_at <= ^to_dt),
        else: q

    q =
      if is_binary(type),
        do: from(e in q, where: e.type == ^type),
        else: q

    Repo.all(q)
  end

  @doc "Convenience: message.sent after Messages.accept_message creates."
  def ingest_message_sent(%{
        id: message_id,
        sender_user_id: actor_id,
        conversation_id: conversation_id,
        body: body
      } = msg) do
    ingest(%{
      type: "message.sent",
      actor_id: actor_id,
      conversation_id: conversation_id,
      idempotency_key: "message.sent:#{message_id}",
      payload: %{
        "message_id" => message_id,
        "body" => body || "",
        "server_seq" => Map.get(msg, :server_seq)
      }
    })
  end

  def ingest_message_sent(%{} = msg) do
    ingest_message_sent(%{
      id: Map.get(msg, :id) || Map.get(msg, "id"),
      sender_user_id: Map.get(msg, :sender_user_id) || Map.get(msg, "sender_user_id"),
      conversation_id: Map.get(msg, :conversation_id) || Map.get(msg, "conversation_id"),
      body: Map.get(msg, :body) || Map.get(msg, "body"),
      server_seq: Map.get(msg, :server_seq) || Map.get(msg, "server_seq")
    })
  end

  @doc "RSVP change with old/new states."
  def ingest_rsvp_changed(attrs) when is_map(attrs) do
    actor_id = fetch!(attrs, :actor_id)
    activity_id = fetch!(attrs, :activity_id)
    new_state = fetch!(attrs, :new_state)
    old_state = Map.get(attrs, :old_state) || Map.get(attrs, "old_state")

    ingest(%{
      type: "rsvp.changed",
      actor_id: actor_id,
      conversation_id: Map.get(attrs, :conversation_id),
      idempotency_key:
        Map.get(attrs, :idempotency_key) ||
          "rsvp.changed:#{activity_id}:#{actor_id}:#{new_state}:#{System.system_time(:millisecond)}",
      payload: %{
        "activity_id" => activity_id,
        "trip_id" => Map.get(attrs, :trip_id) || Map.get(attrs, "trip_id"),
        "old_state" => old_state,
        "new_state" => new_state,
        "venue_name" => Map.get(attrs, :venue_name) || Map.get(attrs, "venue_name"),
        "slot" => Map.get(attrs, :slot) || Map.get(attrs, "slot")
      }
    })
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{key}"
  end

  defp unique_idempotency?(errors) do
    Enum.any?(errors, fn
      {:idempotency_key, {_, opts}} -> opts[:constraint] == :unique
      _ -> false
    end)
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp stringify_keys(other), do: %{"value" => other}
end
