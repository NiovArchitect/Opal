defmodule OpalCoreWeb.ConversationChannel do
  use OpalCoreWeb, :channel

  import Ecto.Query

  alias OpalCore.{Messages, Repo}
  alias OpalCore.Messaging.{ConversationMember, Message, MessageDelivery}
  alias OpalCoreWeb.Presence

  @impl true
  def join("conversation:" <> conversation_id, _payload, socket) do
    user_id = socket.assigns.user_id

    if member?(conversation_id, user_id) do
      send(self(), :after_join)

      {:ok,
       %{
         "conversation_id" => conversation_id,
         "user_id" => user_id,
         "device_id" => socket.assigns.device_id
       }, assign(socket, :conversation_id, conversation_id)}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    meta = %{
      "user_id" => socket.assigns.user_id,
      "device_id" => socket.assigns.device_id,
      "connected_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
      "app_state" => socket.assigns.app_state,
      "client_version" => socket.assigns.client_version
    }

    {:ok, _} = Presence.track(socket, socket.assigns.user_id, meta)
    push(socket, "presence:state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_in("message:send", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id
    trace_id = payload["trace_id"] || "trace-channel-unknown"

    with :ok <- validate_send_payload(payload),
         true <- payload["conversation_id"] in [nil, conversation_id],
         {:ok, message, origin} <-
           Messages.accept_message(%{
             conversation_id: conversation_id,
             sender_user_id: user_id,
             client_message_id: payload["client_message_id"],
             message_type: "text",
             body: payload["body"] || "",
             source_language: payload["source_language"]
           }) do
      contract = Message.to_contract(message)

      # Always ack sender with authoritative ids
      push(socket, "message:accepted", %{
        "schema_version" => "0.1.0",
        "origin" => to_string(origin),
        "message" => contract,
        "trace_id" => trace_id
      })

      # Broadcast new message only for first create (idempotent retries skip rebroadcast)
      if origin == :created do
        broadcast_from!(socket, "message:new", %{
          "schema_version" => "0.1.0",
          "message" => contract,
          "trace_id" => trace_id
        })
      end

      {:reply, {:ok, %{"message" => contract, "origin" => to_string(origin)}}, socket}
    else
      false ->
        {:reply,
         {:error, error_envelope("conversation_mismatch", "Conversation mismatch", trace_id)},
         socket}

      {:error, :not_a_member} ->
        {:reply, {:error, error_envelope("not_a_member", "Not a member", trace_id)}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("message_failed", inspect(reason), trace_id)}, socket}

      {:error, _, _} = other ->
        {:reply, {:error, error_envelope("message_failed", inspect(other), trace_id)}, socket}
    end
  end

  def handle_in("message:ack_delivered", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id
    message_id = payload["message_id"]
    device_id = socket.assigns.device_id
    trace_id = payload["trace_id"] || "trace-ack-unknown"

    with %Message{} = message <- Messages.get_message(message_id),
         true <- message.conversation_id == conversation_id,
         true <- member?(conversation_id, user_id),
         true <- message.sender_user_id != user_id or payload["allow_self"] == true,
         {:ok, _delivery} <- record_delivery(message, user_id, device_id) do
      # Update message delivery_state when any recipient ack arrives
      message
      |> Ecto.Changeset.change(delivery_state: "delivered")
      |> Repo.update()

      event = %{
        "schema_version" => "0.1.0",
        "message_id" => message.id,
        "recipient_user_id" => user_id,
        "device_id" => device_id,
        "server_seq" => message.server_seq,
        "trace_id" => trace_id
      }

      broadcast!(socket, "message:delivered", event)
      {:reply, {:ok, event}, socket}
    else
      nil ->
        {:reply, {:error, error_envelope("message_not_found", "Message not found", trace_id)},
         socket}

      false ->
        {:reply, {:error, error_envelope("ack_unauthorized", "Ack not allowed", trace_id)},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("ack_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("history:sync", payload, socket) do
    conversation_id = socket.assigns.conversation_id
    after_seq = payload["after_server_seq"] || 0

    messages =
      from(m in Message,
        where: m.conversation_id == ^conversation_id and m.server_seq > ^after_seq,
        order_by: [asc: m.server_seq],
        limit: 100
      )
      |> Repo.all()
      |> Enum.map(&Message.to_contract/1)

    {:reply, {:ok, %{"messages" => messages, "after_server_seq" => after_seq}}, socket}
  end

  defp record_delivery(message, user_id, device_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %MessageDelivery{}
    |> MessageDelivery.changeset(%{
      message_id: message.id,
      recipient_user_id: user_id,
      device_id: device_id,
      delivered_at: now
    })
    |> Repo.insert(
      on_conflict: :nothing,
      conflict_target: [:message_id, :recipient_user_id, :device_id]
    )
    |> case do
      {:ok, delivery} -> {:ok, delivery}
      {:error, _} = err -> err
    end
  end

  defp member?(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  defp validate_send_payload(payload) do
    cond do
      not is_binary(payload["client_message_id"]) or byte_size(payload["client_message_id"]) > 128 ->
        {:error, :invalid_client_message_id}

      not is_binary(payload["body"] || "") or byte_size(payload["body"] || "") > 8000 ->
        {:error, :invalid_body}

      payload["schema_version"] not in [nil, "0.1.0"] ->
        {:error, :unsupported_schema_version}

      true ->
        :ok
    end
  end

  defp error_envelope(code, message, trace_id) do
    OpalCore.Contracts.error_envelope(code, message, trace_id: trace_id)
  end
end
