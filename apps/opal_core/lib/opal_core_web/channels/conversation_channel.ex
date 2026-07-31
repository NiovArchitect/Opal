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
      # Do not reveal whether conversation exists.
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

    # Key by user_id; metas list holds per-device entries for multi-device.
    {:ok, _} = Presence.track(socket, socket.assigns.user_id, meta)
    push(socket, "presence:state", Presence.list(socket))
    {:noreply, socket}
  end

  def handle_info(%Phoenix.Socket.Broadcast{event: "presence_diff", payload: diff}, socket) do
    push(socket, "presence:diff", stringify_diff(diff))
    {:noreply, socket}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def handle_in("message:send", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id
    trace_id = payload["trace_id"] || "trace-channel-unknown"
    client_message_id = payload["client_message_id"]

    # Sender identity is socket-derived only.
    if Map.has_key?(payload, "sender_user_id") do
      fail =
        error_envelope("sender_override_rejected", "Sender cannot be client-supplied", trace_id)

      push(socket, "message:failed", fail)
      {:reply, {:error, fail}, socket}
    else
      with :ok <- validate_send_payload(payload),
           true <- payload["conversation_id"] in [nil, conversation_id],
           {:ok, message, origin} <-
             Messages.accept_message(%{
               conversation_id: conversation_id,
               sender_user_id: user_id,
               client_message_id: client_message_id,
               message_type: "text",
               body: payload["body"] || "",
               source_language: payload["source_language"]
             }) do
        contract = Message.to_contract(message)

        push(socket, "message:accepted", %{
          "schema_version" => "0.1.0",
          "origin" => to_string(origin),
          "message" => contract,
          "trace_id" => trace_id
        })

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
          fail = error_envelope("conversation_mismatch", "Conversation mismatch", trace_id)
          push(socket, "message:failed", fail)
          {:reply, {:error, fail}, socket}

        {:error, :not_a_member} ->
          fail = error_envelope("not_a_member", "Not a member", trace_id)
          push(socket, "message:failed", fail)
          {:reply, {:error, fail}, socket}

        {:error, reason} ->
          fail = error_envelope("message_failed", inspect(reason), trace_id)
          push(socket, "message:failed", fail)
          {:reply, {:error, fail}, socket}
      end
    end
  end

  def handle_in("message:ack_delivered", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id
    message_id = payload["message_id"]
    device_id = socket.assigns.device_id
    trace_id = payload["trace_id"] || "trace-ack-unknown"

    with :ok <- validate_uuid(message_id),
         %Message{} = message <- Messages.get_message(message_id),
         true <- message.conversation_id == conversation_id,
         true <- member?(conversation_id, user_id),
         # Recipients only — sender cannot ack delivery as if they received it.
         true <- message.sender_user_id != user_id,
         {:ok, delivery, created?} <- record_delivery(message, user_id, device_id) do
      # Never move state backward; only promote to delivered.
      if message.delivery_state != "delivered" do
        message
        |> Ecto.Changeset.change(delivery_state: "delivered")
        |> Repo.update()
      end

      event = %{
        "schema_version" => "0.1.0",
        "message_id" => message.id,
        "recipient_user_id" => user_id,
        "device_id" => device_id,
        "server_seq" => message.server_seq,
        "trace_id" => trace_id,
        "origin" => if(created?, do: "created", else: "idempotent"),
        "delivery_id" => delivery.id
      }

      if created? do
        broadcast!(socket, "message:delivered", event)
      end

      {:reply, {:ok, event}, socket}
    else
      {:error, :invalid_uuid} ->
        {:reply, {:error, error_envelope("invalid_message_id", "Invalid message id", trace_id)},
         socket}

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
    after_seq = normalize_seq(payload["after_server_seq"])

    messages =
      from(m in Message,
        where: m.conversation_id == ^conversation_id and m.server_seq > ^after_seq,
        order_by: [asc: m.server_seq],
        limit: 200
      )
      |> Repo.all()
      |> Enum.map(&Message.to_contract/1)

    last_seq =
      case List.last(messages) do
        nil -> after_seq
        m -> m["server_seq"]
      end

    {:reply,
     {:ok,
      %{
        "schema_version" => "0.1.0",
        "messages" => messages,
        "after_server_seq" => after_seq,
        "latest_server_seq" => last_seq
      }}, socket}
  end

  defp record_delivery(message, user_id, device_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    case Repo.get_by(MessageDelivery,
           message_id: message.id,
           recipient_user_id: user_id,
           device_id: device_id
         ) do
      %MessageDelivery{} = existing ->
        {:ok, existing, false}

      nil ->
        %MessageDelivery{}
        |> MessageDelivery.changeset(%{
          message_id: message.id,
          recipient_user_id: user_id,
          device_id: device_id,
          delivered_at: now
        })
        |> Repo.insert()
        |> case do
          {:ok, delivery} ->
            {:ok, delivery, true}

          {:error, %Ecto.Changeset{} = cs} ->
            # Race: concurrent duplicate ack
            if unique_delivery_error?(cs) do
              existing =
                Repo.get_by!(MessageDelivery,
                  message_id: message.id,
                  recipient_user_id: user_id,
                  device_id: device_id
                )

              {:ok, existing, false}
            else
              {:error, cs}
            end
        end
    end
  end

  defp unique_delivery_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {_, {_, opts}} when is_list(opts) -> opts[:constraint] == :unique
      _ -> false
    end)
  end

  defp member?(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  defp validate_send_payload(payload) do
    cond do
      not is_binary(payload["client_message_id"]) or byte_size(payload["client_message_id"]) == 0 or
          byte_size(payload["client_message_id"]) > 128 ->
        {:error, :invalid_client_message_id}

      not is_binary(payload["body"] || "") or byte_size(payload["body"] || "") > 8000 ->
        {:error, :invalid_body}

      payload["schema_version"] not in [nil, "0.1.0"] ->
        {:error, :unsupported_schema_version}

      true ->
        :ok
    end
  end

  defp validate_uuid(id) when is_binary(id) do
    case Ecto.UUID.cast(id) do
      {:ok, _} -> :ok
      :error -> {:error, :invalid_uuid}
    end
  end

  defp validate_uuid(_), do: {:error, :invalid_uuid}

  defp normalize_seq(n) when is_integer(n) and n >= 0, do: n
  defp normalize_seq(n) when is_binary(n), do: String.to_integer(n)
  defp normalize_seq(_), do: 0

  defp stringify_diff(%{joins: joins, leaves: leaves}) do
    %{
      "joins" => joins,
      "leaves" => leaves
    }
  end

  defp stringify_diff(diff) when is_map(diff), do: diff

  defp error_envelope(code, message, trace_id) do
    OpalCore.Contracts.error_envelope(code, message, trace_id: trace_id)
  end
end
