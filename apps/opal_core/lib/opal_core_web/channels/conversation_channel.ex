defmodule OpalCoreWeb.ConversationChannel do
  use OpalCoreWeb, :channel

  import Ecto.Query

  alias OpalCore.{Messages, Repo, SocialFlow, AI}
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

    # Dedicated Social Flow topic (must not share the channel topic with Presence).
    :ok =
      Phoenix.PubSub.subscribe(
        OpalCore.PubSub,
        "social_flow:conversation:#{socket.assigns.conversation_id}"
      )

    {:noreply, socket}
  end

  def handle_info(%Phoenix.Socket.Broadcast{event: "presence_diff", payload: diff}, socket) do
    push(socket, "presence:diff", stringify_diff(diff))
    {:noreply, socket}
  end

  def handle_info({:social_flow_event, event, envelope}, socket) do
    payload = envelope["payload"] || %{}
    user_id = socket.assigns.user_id

    if social_flow_visible_to?(payload, user_id) do
      push(socket, event, envelope)
    end

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

  def handle_in("social_flow:request_extract", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id
    trace_id = payload["trace_id"] || "trace-sf-extract"
    message_id = payload["message_id"]
    consent_proof_id = payload["consent_proof_id"]
    idempotency_key = payload["idempotency_key"] || "sf-extract-" <> Ecto.UUID.generate()

    if Map.has_key?(payload, "requester_user_id") do
      fail =
        error_envelope(
          "requester_override_rejected",
          "Requester cannot be client-supplied",
          trace_id
        )

      {:reply, {:error, fail}, socket}
    else
      with :ok <- validate_uuid(message_id),
           :ok <- validate_uuid(consent_proof_id),
           {:ok, job, origin} <-
             AI.request_job(%{
               message_id: message_id,
               requester_user_id: user_id,
               capability: "social_flow_plan_extract",
               consent_proof_id: consent_proof_id,
               idempotency_key: idempotency_key,
               trace_id: trace_id
             }) do
        {:reply,
         {:ok,
          %{
            "job" => AI.job_to_api(job),
            "origin" => to_string(origin),
            "conversation_id" => conversation_id
          }}, socket}
      else
        {:error, reason} ->
          {:reply, {:error, error_envelope("extract_failed", inspect(reason), trace_id)}, socket}

        _ ->
          {:reply, {:error, error_envelope("extract_failed", "invalid request", trace_id)},
           socket}
      end
    end
  end

  def handle_in("social_flow:coordinate", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf-coordinate"

    case SocialFlow.approve_coordination(%{
           proposal_id: payload["proposal_id"],
           user_id: user_id,
           trace_id: trace_id
         }) do
      {:ok, result} ->
        {:reply,
         {:ok,
          %{
            "proposal" => OpalCore.SocialFlow.Proposal.to_contract(result.proposal),
            "options" => Enum.map(result.options, &OpalCore.SocialFlow.PlanOption.to_contract/1),
            "signal" => OpalCore.SocialFlow.Signal.to_contract(result.signal)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("coordinate_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:dismiss_proposal", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf-dismiss"

    case SocialFlow.dismiss_proposal(%{
           proposal_id: payload["proposal_id"],
           user_id: user_id,
           trace_id: trace_id
         }) do
      {:ok, proposal} ->
        {:reply, {:ok, %{"proposal" => OpalCore.SocialFlow.Proposal.to_contract(proposal)}},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("dismiss_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:respond_option", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf-option"

    case SocialFlow.respond_to_option(%{
           option_id: payload["option_id"],
           user_id: user_id,
           response: payload["response"] || "accept",
           trace_id: trace_id
         }) do
      {:ok, %{plan: plan, signal: signal}} ->
        {:reply,
         {:ok,
          %{
            "status" => "plan_created",
            "plan" => OpalCore.SocialFlow.SharedPlan.to_contract(plan),
            "signal" => OpalCore.SocialFlow.Signal.to_contract(signal)
          }}, socket}

      {:ok, :awaiting_others} ->
        {:reply, {:ok, %{"status" => "awaiting_others"}}, socket}

      {:ok, :recorded} ->
        {:reply, {:ok, %{"status" => "recorded"}}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("option_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:confirm_commitment", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf-commit"

    case SocialFlow.confirm_commitment(%{
           commitment_id: payload["commitment_id"],
           user_id: user_id,
           trace_id: trace_id
         }) do
      {:ok, c} ->
        {:reply, {:ok, %{"commitment" => OpalCore.SocialFlow.PlanCommitment.to_contract(c)}},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("commitment_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:create_private_reminder", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf-reminder"

    case SocialFlow.create_private_reminder(%{
           plan_id: payload["plan_id"],
           user_id: user_id,
           content_summary: payload["content_summary"] || "Private reminder",
           commitment_id: payload["commitment_id"],
           trace_id: trace_id
         }) do
      {:ok, %{reminder: r, signal: s}} ->
        {:reply,
         {:ok,
          %{
            "reminder" => OpalCore.SocialFlow.PlanReminder.to_contract(r),
            "signal" => OpalCore.SocialFlow.Signal.to_contract(s)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("reminder_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:propose_revision", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf-rev"

    case SocialFlow.propose_revision(%{
           plan_id: payload["plan_id"],
           proposed_by_user_id: user_id,
           changes: payload["changes"] || %{"time_label" => payload["time_label"] || "7:30 PM"},
           trace_id: trace_id
         }) do
      {:ok, %{revision: rev, signal: s}} ->
        {:reply,
         {:ok,
          %{
            "revision" => OpalCore.SocialFlow.PlanRevision.to_contract(rev),
            "signal" => OpalCore.SocialFlow.Signal.to_contract(s)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("revision_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:respond_revision", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf-rev-resp"

    case SocialFlow.respond_to_revision(%{
           revision_id: payload["revision_id"],
           user_id: user_id,
           decision: payload["decision"] || "accept",
           trace_id: trace_id
         }) do
      {:ok, %{plan: plan, revision: rev, signal: s}} ->
        {:reply,
         {:ok,
          %{
            "status" => "accepted",
            "plan" => OpalCore.SocialFlow.SharedPlan.to_contract(plan),
            "revision" => OpalCore.SocialFlow.PlanRevision.to_contract(rev),
            "signal" => OpalCore.SocialFlow.Signal.to_contract(s)
          }}, socket}

      {:ok, rev} ->
        {:reply,
         {:ok,
          %{
            "status" => rev.status,
            "revision" => OpalCore.SocialFlow.PlanRevision.to_contract(rev)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("revision_response_failed", inspect(reason), trace_id)},
         socket}
    end
  end

  def handle_in("social_flow:sync", _payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case SocialFlow.sync_for_user(conversation_id, user_id) do
      {:ok, state} ->
        {:reply, {:ok, state}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("sync_failed", inspect(reason), "trace-sf-sync")},
         socket}
    end
  end

  defp social_flow_visible_to?(payload, user_id) do
    cond do
      is_map(payload["reminder"]) and payload["reminder"]["visibility"] == "private" ->
        payload["reminder"]["owner_user_id"] == user_id or
          payload["audience_user_id"] == user_id

      is_map(payload["signal"]) and payload["signal"]["visibility"] == "private" ->
        payload["signal"]["audience_user_id"] == user_id

      is_map(payload["commitment"]) and payload["commitment"]["visibility"] == "private" ->
        payload["commitment"]["owner_user_id"] == user_id

      true ->
        true
    end
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
