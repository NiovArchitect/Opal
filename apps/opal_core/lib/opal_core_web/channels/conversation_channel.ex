defmodule OpalCoreWeb.ConversationChannel do
  use OpalCoreWeb, :channel

  import Ecto.Query

  alias OpalCore.{Messages, Repo, SocialFlow, AI}
  alias OpalCore.SocialFlow.FollowThrough
  alias OpalCore.SocialFlow.Meaning
  alias OpalCore.SocialFlow.Collective
  alias OpalCore.SocialFlow.Discovery
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
        case FollowThrough.sync_follow_through(user_id, conversation_id) do
          {:ok, ft} ->
            {:reply, {:ok, Map.merge(state, ft)}, socket}

          {:error, _} ->
            {:reply, {:ok, state}, socket}
        end

      {:error, reason} ->
        {:reply, {:error, error_envelope("sync_failed", inspect(reason), "trace-sf-sync")},
         socket}
    end
  end

  def handle_in("social_flow:needs_you", _payload, socket) do
    user_id = socket.assigns.user_id
    items = FollowThrough.needs_you(user_id)

    {:reply,
     {:ok,
      %{
        "items" => items,
        "empty_copy" => if(items == [], do: FollowThrough.needs_you_empty_copy(), else: nil)
      }}, socket}
  end

  def handle_in("social_flow:evaluate_follow_through", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf2-eval"

    case FollowThrough.evaluate_follow_through(%{
           owner_user_id: user_id,
           commitment_id: payload["commitment_id"],
           force_due: payload["force_due"] == true,
           shadow: payload["shadow"] == true,
           idempotency_key: payload["idempotency_key"],
           trace_id: trace_id
         }) do
      {:ok, signal, origin} ->
        {:reply,
         {:ok,
          %{
            "attention_signal" => OpalCore.SocialFlow.AttentionSignal.to_contract(signal),
            "origin" => to_string(origin)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("eval_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:act_attention", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf2-act"

    case FollowThrough.act_on_signal(%{
           signal_id: payload["signal_id"],
           user_id: user_id,
           action: payload["action"],
           trace_id: trace_id
         }) do
      {:ok, result, origin} when is_map(result) ->
        {:reply,
         {:ok,
          %{
            "origin" => to_string(origin),
            "completion" =>
              if(result[:completion],
                do: OpalCore.SocialFlow.CompletionEvent.to_contract(result.completion),
                else: nil
              ),
            "gratification_copy" =>
              if(result[:gratification], do: result.gratification.copy, else: nil)
          }}, socket}

      {:ok, signal} ->
        {:reply,
         {:ok, %{"attention_signal" => OpalCore.SocialFlow.AttentionSignal.to_contract(signal)}},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("act_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:complete_commitment", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf2-complete"

    case FollowThrough.complete_commitment(%{
           commitment_id: payload["commitment_id"],
           user_id: user_id,
           share: payload["share"] == true,
           shared_message: payload["shared_message"],
           idempotency_key: payload["idempotency_key"] || "complete-" <> Ecto.UUID.generate(),
           trace_id: trace_id
         }) do
      {:ok, result, origin} ->
        {:reply,
         {:ok,
          %{
            "origin" => to_string(origin),
            "completion" => OpalCore.SocialFlow.CompletionEvent.to_contract(result.completion),
            "gratification_copy" => result.gratification.copy
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("complete_failed", inspect(reason), trace_id)}, socket}
    end
  end

  def handle_in("social_flow:memory_candidate_create", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id
    trace_id = payload["trace_id"] || "trace-sf2-mem"

    case FollowThrough.create_memory_candidate(%{
           owner_user_id: user_id,
           conversation_id: conversation_id,
           counterpart_user_id: payload["counterpart_user_id"],
           candidate_summary: payload["candidate_summary"],
           candidate_type: payload["candidate_type"] || "gift_preference",
           source_message_ids: payload["source_message_ids"] || [],
           confidence: payload["confidence"],
           uncertainty: payload["uncertainty"] || [],
           proposed_purpose: payload["proposed_purpose"],
           trace_id: trace_id
         }) do
      {:ok, %{candidate: c, signal: s}} ->
        {:reply,
         {:ok,
          %{
            "memory_candidate" => OpalCore.SocialFlow.MemoryCandidate.to_contract(c),
            "attention_signal" => OpalCore.SocialFlow.AttentionSignal.to_contract(s)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("memory_candidate_failed", inspect(reason), trace_id)},
         socket}
    end
  end

  def handle_in("social_flow:memory_approve", payload, socket) do
    user_id = socket.assigns.user_id
    trace_id = payload["trace_id"] || "trace-sf2-mem-appr"

    case FollowThrough.approve_memory_candidate(%{
           candidate_id: payload["candidate_id"],
           user_id: user_id,
           trace_id: trace_id
         }) do
      {:ok, %{memory: m, candidate: c}} ->
        {:reply,
         {:ok,
          %{
            "memory" => OpalCore.SocialFlow.RelationshipMemory.to_contract(m),
            "candidate" => OpalCore.SocialFlow.MemoryCandidate.to_contract(c)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("memory_approve_failed", inspect(reason), trace_id)},
         socket}
    end
  end

  def handle_in("social_flow:memory_handle", payload, socket) do
    user_id = socket.assigns.user_id

    case FollowThrough.handle_memory(%{
           memory_id: payload["memory_id"],
           user_id: user_id,
           action: payload["action"] || "handled"
         }) do
      {:ok, result} ->
        {:reply,
         {:ok,
          %{
            "memory" => OpalCore.SocialFlow.RelationshipMemory.to_contract(result.memory),
            "gratification_copy" => result.gratification_copy
          }}, socket}

      {:error, reason} ->
        {:reply,
         {:error, error_envelope("memory_handle_failed", inspect(reason), "trace-sf2-mh")},
         socket}
    end
  end

  def handle_in("social_flow:attention_snapshot", _payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case FollowThrough.attention_snapshot(user_id, conversation_id) do
      {:ok, snap} ->
        {:reply, {:ok, snap}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("snapshot_failed", inspect(reason), "trace-sf2-snap")},
         socket}
    end
  end

  def handle_in("social_flow:pre_send_check", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id
    trace_id = payload["trace_id"] || "trace-sf3-presend"

    if Map.has_key?(payload, "owner_user_id") do
      {:reply,
       {:error,
        error_envelope("owner_override_rejected", "Owner cannot be client-supplied", trace_id)},
       socket}
    else
      prior =
        from(m in Message,
          where: m.conversation_id == ^conversation_id,
          order_by: [desc: m.server_seq],
          limit: 10
        )
        |> Repo.all()
        |> Enum.reverse()
        |> Enum.map(&%{id: &1.id, body: &1.body})

      case Meaning.pre_send_check(%{
             owner_user_id: user_id,
             conversation_id: conversation_id,
             draft_text: payload["draft_text"] || "",
             prior_messages: prior,
             idempotency_key: payload["idempotency_key"],
             trace_id: trace_id
           }) do
        {:ok, :no_insight} ->
          {:reply, {:ok, %{"status" => "no_insight"}}, socket}

        {:ok, result, origin} ->
          {:reply,
           {:ok,
            %{
              "origin" => to_string(origin),
              "insight" => OpalCore.SocialFlow.ConversationInsight.to_contract(result.insight),
              "draft_assist" =>
                if(result[:draft_assist],
                  do: OpalCore.SocialFlow.PrivateDraftAssist.to_contract(result.draft_assist),
                  else: nil
                )
            }}, socket}

        {:error, reason} ->
          {:reply, {:error, error_envelope("pre_send_failed", inspect(reason), trace_id)}, socket}
      end
    end
  end

  def handle_in("social_flow:act_insight", payload, socket) do
    user_id = socket.assigns.user_id
    action = payload["action"]

    result =
      case action do
        a when a in ~w(help_answer send_as_written dismiss use_draft) ->
          Meaning.act_pre_send(%{
            insight_id: payload["insight_id"],
            user_id: user_id,
            action: a,
            edited_draft: payload["edited_draft"]
          })

        "opal_misunderstood" ->
          Meaning.correct_insight(%{
            insight_id: payload["insight_id"],
            user_id: user_id,
            label: "opal_misunderstood"
          })

        "resolve_loop" ->
          Meaning.resolve_open_loop(%{
            open_loop_id: payload["open_loop_id"],
            user_id: user_id,
            action: "resolved"
          })

        "dismiss_loop" ->
          Meaning.resolve_open_loop(%{
            open_loop_id: payload["open_loop_id"],
            user_id: user_id,
            action: "dismiss"
          })

        _ ->
          {:error, :unknown_action}
      end

    case result do
      {:ok, data} when is_map(data) ->
        {:reply, {:ok, stringify_meaning_result(data)}, socket}

      {:ok, %OpalCore.SocialFlow.ConversationInsight{} = i} ->
        {:reply, {:ok, %{"insight" => OpalCore.SocialFlow.ConversationInsight.to_contract(i)}},
         socket}

      {:ok, %OpalCore.SocialFlow.OpenLoop{} = o} ->
        {:reply, {:ok, %{"open_loop" => OpalCore.SocialFlow.OpenLoop.to_contract(o)}}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("act_insight_failed", inspect(reason), "trace-sf3-act")},
         socket}
    end
  end

  def handle_in("social_flow:detect_open_loops", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Meaning.detect_open_loops(%{
           owner_user_id: user_id,
           conversation_id: conversation_id,
           idempotency_key: payload["idempotency_key"],
           trace_id: payload["trace_id"] || "trace-sf3-loops"
         }) do
      {:ok, results} ->
        {:reply, {:ok, %{"results_count" => length(results), "status" => "ok"}}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("open_loop_failed", inspect(reason), "trace-sf3-ol")},
         socket}
    end
  end

  def handle_in("social_flow:what_did_we_decide", _payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Meaning.what_did_we_decide(%{
           owner_user_id: user_id,
           conversation_id: conversation_id
         }) do
      {:ok, summary} ->
        {:reply, {:ok, %{"decision_summary" => summary}}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("summary_failed", inspect(reason), "trace-sf3-sum")},
         socket}
    end
  end

  def handle_in("social_flow:detect_ambiguity", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Meaning.detect_ambiguity(%{
           owner_user_id: user_id,
           conversation_id: conversation_id,
           message_id: payload["message_id"],
           body: payload["body"] || "",
           idempotency_key: payload["idempotency_key"]
         }) do
      {:ok, :no_insight} ->
        {:reply, {:ok, %{"status" => "no_insight"}}, socket}

      {:ok, insight, origin} ->
        {:reply,
         {:ok,
          %{
            "origin" => to_string(origin),
            "insight" => OpalCore.SocialFlow.ConversationInsight.to_contract(insight)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("ambiguity_failed", inspect(reason), "trace-sf3-amb")},
         socket}
    end
  end

  def handle_in("social_flow:detect_repair", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Meaning.detect_repair_opportunity(%{
           owner_user_id: user_id,
           conversation_id: conversation_id,
           message_id: payload["message_id"],
           body: payload["body"] || "",
           idempotency_key: payload["idempotency_key"]
         }) do
      {:ok, :no_insight} ->
        {:reply, {:ok, %{"status" => "no_insight"}}, socket}

      {:ok, insight, origin} ->
        {:reply,
         {:ok,
          %{
            "origin" => to_string(origin),
            "insight" => OpalCore.SocialFlow.ConversationInsight.to_contract(insight)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("repair_failed", inspect(reason), "trace-sf3-rep")},
         socket}
    end
  end

  def handle_in("social_flow:meaning_sync", _payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Meaning.sync_meaning(user_id, conversation_id) do
      {:ok, state} ->
        {:reply, {:ok, state}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("meaning_sync_failed", inspect(reason), "trace-sf3-ms")},
         socket}
    end
  end

  def handle_in("social_flow:group_create_proposal", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id
    trace_id = payload["trace_id"] || "trace-sf4-prop"

    if Map.has_key?(payload, "created_by_user_id") do
      {:reply,
       {:error,
        error_envelope("creator_override_rejected", "Creator is socket-derived", trace_id)},
       socket}
    else
      case Collective.create_group_proposal(%{
             conversation_id: conversation_id,
             created_by_user_id: user_id,
             activity: payload["activity"] || "dinner",
             recommended_copy: payload["recommended_copy"],
             options: payload["options"] || ["Saturday after 7"],
             constraints: payload["constraints"] || [],
             source_message_ids: payload["source_message_ids"] || [],
             idempotency_key: payload["idempotency_key"],
             trace_id: trace_id
           }) do
        {:ok, result, origin} ->
          {:reply,
           {:ok,
            %{
              "origin" => to_string(origin),
              "proposal" => OpalCore.SocialFlow.GroupPlanProposal.to_contract(result.proposal),
              "options" =>
                Enum.map(result.options, &OpalCore.SocialFlow.GroupOption.to_contract/1)
            }}, socket}

        {:error, reason} ->
          {:reply, {:error, error_envelope("group_proposal_failed", inspect(reason), trace_id)},
           socket}
      end
    end
  end

  def handle_in("social_flow:group_coordinate", payload, socket) do
    user_id = socket.assigns.user_id

    case Collective.coordinate_group_proposal(%{
           proposal_id: payload["proposal_id"],
           user_id: user_id,
           trace_id: payload["trace_id"]
         }) do
      {:ok, p} ->
        {:reply, {:ok, %{"proposal" => OpalCore.SocialFlow.GroupPlanProposal.to_contract(p)}},
         socket}

      {:error, reason} ->
        {:reply,
         {:error, error_envelope("group_coordinate_failed", inspect(reason), "trace-sf4-c")},
         socket}
    end
  end

  def handle_in("social_flow:group_respond_option", payload, socket) do
    user_id = socket.assigns.user_id

    if Map.has_key?(payload, "user_id") do
      {:reply, {:error, error_envelope("user_override_rejected", "User is socket-derived", "t")},
       socket}
    else
      case Collective.respond_to_group_option(%{
             option_id: payload["option_id"],
             user_id: user_id,
             response_state: payload["response_state"] || "accepted",
             shared_note: payload["shared_note"],
             private_note: payload["private_note"],
             idempotency_key: payload["idempotency_key"],
             trace_id: payload["trace_id"]
           }) do
        {:ok, result, origin} ->
          {:reply,
           {:ok,
            %{
              "origin" => to_string(origin),
              "summary" => result.summary,
              "plan" =>
                if(result.plan,
                  do: OpalCore.SocialFlow.GroupSharedPlan.to_contract(result.plan),
                  else: nil
                )
            }}, socket}

        {:error, reason} ->
          {:reply, {:error, error_envelope("group_respond_failed", inspect(reason), "t-sf4-r")},
           socket}
      end
    end
  end

  def handle_in("social_flow:group_set_constraint", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Collective.set_constraint(%{
           owner_user_id: user_id,
           conversation_id: conversation_id,
           proposal_id: payload["proposal_id"],
           constraint_type: payload["constraint_type"] || "accessibility",
           normalized_value: payload["normalized_value"] || "",
           visibility: payload["visibility"] || "private"
         }) do
      {:ok, c} ->
        {:reply,
         {:ok,
          %{
            "constraint" => OpalCore.SocialFlow.GroupConstraint.to_public_contract(c, user_id)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("constraint_failed", inspect(reason), "t-sf4-ct")},
         socket}
    end
  end

  def handle_in("social_flow:group_grant_availability", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Collective.grant_availability(%{
           owner_user_id: user_id,
           conversation_id: conversation_id,
           grant_mode: payload["grant_mode"] || "free_busy",
           windows: payload["windows"] || %{},
           idempotency_key: payload["idempotency_key"]
         }) do
      {:ok, g} ->
        {:reply, {:ok, %{"grant" => OpalCore.SocialFlow.AvailabilityGrant.to_contract(g)}},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("availability_failed", inspect(reason), "t-sf4-av")},
         socket}
    end
  end

  def handle_in("social_flow:group_intersect_availability", _payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Collective.intersect_availability(conversation_id, user_id) do
      {:ok, result} ->
        {:reply, {:ok, result}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("intersect_failed", inspect(reason), "t-sf4-ix")},
         socket}
    end
  end

  def handle_in("social_flow:group_assign_responsibility", payload, socket) do
    user_id = socket.assigns.user_id

    case Collective.assign_responsibility(%{
           plan_id: payload["plan_id"],
           owner_user_id: payload["owner_user_id"],
           actor_user_id: user_id,
           description: payload["description"] || "Task",
           idempotency_key: payload["idempotency_key"]
         }) do
      {:ok, r, origin} ->
        {:reply,
         {:ok,
          %{
            "origin" => to_string(origin),
            "responsibility" => OpalCore.SocialFlow.GroupResponsibility.to_contract(r)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("assign_failed", inspect(reason), "t-sf4-as")}, socket}
    end
  end

  def handle_in("social_flow:group_accept_responsibility", payload, socket) do
    user_id = socket.assigns.user_id

    case Collective.accept_responsibility(%{
           responsibility_id: payload["responsibility_id"],
           user_id: user_id
         }) do
      {:ok, r} ->
        {:reply,
         {:ok, %{"responsibility" => OpalCore.SocialFlow.GroupResponsibility.to_contract(r)}},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("accept_resp_failed", inspect(reason), "t-sf4-ar")},
         socket}
    end
  end

  def handle_in("social_flow:group_complete_responsibility", payload, socket) do
    user_id = socket.assigns.user_id

    case Collective.complete_responsibility(%{
           responsibility_id: payload["responsibility_id"],
           user_id: user_id
         }) do
      {:ok, result} ->
        {:reply,
         {:ok,
          %{
            "responsibility" =>
              OpalCore.SocialFlow.GroupResponsibility.to_contract(result.responsibility),
            "readiness" => result.readiness
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("complete_resp_failed", inspect(reason), "t-sf4-cr")},
         socket}
    end
  end

  def handle_in("social_flow:group_propose_revision", payload, socket) do
    user_id = socket.assigns.user_id

    case Collective.propose_group_revision(%{
           plan_id: payload["plan_id"],
           proposed_by_user_id: user_id,
           changes: payload["changes"] || %{"time_label" => payload["time_label"] || "8:00 PM"},
           shared_reason: payload["shared_reason"]
         }) do
      {:ok, rev} ->
        {:reply, {:ok, %{"revision" => OpalCore.SocialFlow.GroupPlanRevision.to_contract(rev)}},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("group_rev_failed", inspect(reason), "t-sf4-rv")},
         socket}
    end
  end

  def handle_in("social_flow:group_respond_revision", payload, socket) do
    user_id = socket.assigns.user_id

    case Collective.respond_group_revision(%{
           revision_id: payload["revision_id"],
           user_id: user_id,
           decision: payload["decision"] || "accept"
         }) do
      {:ok, result} ->
        {:reply,
         {:ok,
          %{
            "revision" => OpalCore.SocialFlow.GroupPlanRevision.to_contract(result.revision),
            "plan" => OpalCore.SocialFlow.GroupSharedPlan.to_contract(result.plan)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("group_rev_resp_failed", inspect(reason), "t-sf4-rr")},
         socket}
    end
  end

  def handle_in("social_flow:group_sync", _payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Collective.sync_group(user_id, conversation_id) do
      {:ok, state} ->
        {:reply, {:ok, state}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("group_sync_failed", inspect(reason), "t-sf4-sy")},
         socket}
    end
  end

  # --- Social Flow 5: discovery ---

  def handle_in("social_flow:discovery_create_intent", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Discovery.create_intent(%{
           conversation_id: conversation_id,
           owner_user_id: user_id,
           plan_id: payload["plan_id"],
           objective_type: payload["objective_type"] || "restaurant",
           source: payload["source"] || "explicit_request",
           idempotency_key: payload["idempotency_key"],
           consent_proof_id: payload["consent_proof_id"]
         }) do
      {:ok, intent, _} ->
        {:reply, {:ok, %{"intent" => OpalCore.SocialFlow.DiscoveryIntent.to_contract(intent)}},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("discovery_intent_failed", inspect(reason), "t-sf5-i")},
         socket}
    end
  end

  def handle_in("social_flow:discovery_run", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Discovery.run_discovery(%{
           conversation_id: conversation_id,
           user_id: user_id,
           intent_id: payload["intent_id"],
           plan_id: payload["plan_id"],
           request_type: payload["request_type"] || "restaurant",
           option_limit: payload["option_limit"] || 3,
           hide_sponsored: payload["hide_sponsored"] || false,
           include_sponsored: payload["include_sponsored"] || false,
           hard_constraints: payload["hard_constraints"] || %{},
           soft_preferences: payload["soft_preferences"] || %{},
           geographic_envelope: payload["geographic_envelope"],
           agreed_time_window: payload["agreed_time_window"],
           idempotency_key: payload["idempotency_key"]
         }) do
      {:ok, result, _} ->
        {:reply,
         {:ok,
          %{
            "option_set" =>
              result.option_set &&
                OpalCore.SocialFlow.DiscoveryOptionSet.to_contract(result.option_set),
            "options" =>
              Enum.map(
                result.options || [],
                &OpalCore.SocialFlow.ExperienceCandidate.to_public_contract/1
              ),
            "no_match" => result.no_match
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("discovery_run_failed", inspect(reason), "t-sf5-r")},
         socket}
    end
  end

  def handle_in("social_flow:discovery_select", payload, socket) do
    user_id = socket.assigns.user_id

    case Discovery.propose_selection(%{
           option_set_id: payload["option_set_id"],
           candidate_id: payload["candidate_id"],
           user_id: user_id,
           idempotency_key: payload["idempotency_key"]
         }) do
      {:ok, result, _} ->
        {:reply,
         {:ok,
          %{
            "selection" => OpalCore.SocialFlow.ExperienceSelection.to_contract(result.selection)
          }}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("discovery_select_failed", inspect(reason), "t-sf5-s")},
         socket}
    end
  end

  def handle_in("social_flow:discovery_respond_selection", payload, socket) do
    user_id = socket.assigns.user_id

    case Discovery.respond_selection(%{
           selection_id: payload["selection_id"],
           user_id: user_id,
           decision: payload["decision"]
         }) do
      {:ok, result} ->
        {:reply,
         {:ok,
          %{
            "selection" => OpalCore.SocialFlow.ExperienceSelection.to_contract(result.selection)
          }}, socket}

      {:error, reason} ->
        {:reply,
         {:error, error_envelope("discovery_respond_failed", inspect(reason), "t-sf5-rs")},
         socket}
    end
  end

  def handle_in("social_flow:discovery_handoff", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Discovery.create_handoff(%{
           candidate_id: payload["candidate_id"],
           user_id: user_id,
           conversation_id: conversation_id,
           idempotency_key: payload["idempotency_key"]
         }) do
      {:ok, handoff, _} ->
        {:reply, {:ok, %{"handoff" => OpalCore.SocialFlow.ExternalHandoff.to_contract(handoff)}},
         socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("discovery_handoff_failed", inspect(reason), "t-sf5-h")},
         socket}
    end
  end

  def handle_in("social_flow:discovery_sync", _payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Discovery.sync_discovery(user_id, conversation_id) do
      {:ok, state} ->
        {:reply, {:ok, state}, socket}

      {:error, reason} ->
        {:reply, {:error, error_envelope("discovery_sync_failed", inspect(reason), "t-sf5-sy")},
         socket}
    end
  end

  defp stringify_meaning_result(data) do
    Map.new(data, fn
      {:insight, %OpalCore.SocialFlow.ConversationInsight{} = i} ->
        {"insight", OpalCore.SocialFlow.ConversationInsight.to_contract(i)}

      {:draft_assist, %OpalCore.SocialFlow.PrivateDraftAssist{} = d} ->
        {"draft_assist", OpalCore.SocialFlow.PrivateDraftAssist.to_contract(d)}

      {:draft_assist, nil} ->
        {"draft_assist", nil}

      {:suggested_draft, v} ->
        {"suggested_draft", v}

      {k, v} ->
        {to_string(k), v}
    end)
  end

  defp social_flow_visible_to?(payload, user_id) do
    audience_ok? = payload["audience_user_id"] == user_id

    private_owner_ok?(
      payload["insight"],
      "privacy_class",
      "private",
      "owner_user_id",
      user_id,
      audience_ok?
    ) or
      private_owner_ok?(payload["draft_assist"], nil, nil, "owner_user_id", user_id, audience_ok?) or
      private_owner_ok?(
        payload["attention_signal"],
        "privacy_class",
        "private",
        "owner_user_id",
        user_id,
        audience_ok?
      ) or
      private_owner_ok?(
        payload["completion"],
        "visibility",
        "private",
        "owner_user_id",
        user_id,
        audience_ok?
      ) or
      private_owner_ok?(
        payload["memory_candidate"],
        nil,
        nil,
        "owner_user_id",
        user_id,
        audience_ok?
      ) or
      private_owner_ok?(
        payload["reminder"],
        "visibility",
        "private",
        "owner_user_id",
        user_id,
        audience_ok?
      ) or
      private_owner_ok?(
        payload["signal"],
        "visibility",
        "private",
        "audience_user_id",
        user_id,
        false
      ) or
      private_owner_ok?(
        payload["commitment"],
        "visibility",
        "private",
        "owner_user_id",
        user_id,
        false
      ) or
      not private_payload?(payload)
  end

  defp private_payload?(payload) do
    Enum.any?(
      [
        payload["insight"],
        payload["draft_assist"],
        payload["attention_signal"],
        payload["completion"],
        payload["memory_candidate"],
        payload["reminder"],
        payload["signal"],
        payload["commitment"]
      ],
      &is_map/1
    )
  end

  defp private_owner_ok?(nil, _class_key, _class_val, _owner_key, _user_id, _audience_ok?),
    do: false

  defp private_owner_ok?(map, nil, nil, owner_key, user_id, audience_ok?) when is_map(map) do
    map[owner_key] == user_id or audience_ok?
  end

  defp private_owner_ok?(map, class_key, class_val, owner_key, user_id, audience_ok?)
       when is_map(map) do
    map[class_key] == class_val and (map[owner_key] == user_id or audience_ok?)
  end

  defp private_owner_ok?(_, _, _, _, _, _), do: false

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
