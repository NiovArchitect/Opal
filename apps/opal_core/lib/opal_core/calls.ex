defmodule OpalCore.Calls do
  @moduledoc """
  1:1 call signaling authority (BEAM).

  State: initiated → ringing → answered → ended
  Also: canceled | declined→ended | missed | failed

  SDP/ICE never enter Outbox/Kafka — only IDs + status.
  """

  import Ecto.Query

  alias OpalCore.Calls.CallPush
  alias OpalCore.Calls.CallSession
  alias OpalCore.Calls.ChannelPresence
  alias OpalCore.Consent
  alias OpalCore.Events.Publisher
  alias OpalCore.Messages
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Repo
  alias OpalCoreWeb.Endpoint

  # Phase 2: no-answer → missed at 30s (product acceptance).
  @ring_timeout_ms 30_000
  @calls_capability "calls_outbound"

  @doc "Invite callee. Caller must be authenticated user_id."
  def invite(caller_user_id, attrs) when is_binary(caller_user_id) and is_map(attrs) do
    attrs = stringify(attrs)
    callee = attrs["callee_user_id"]

    cond do
      not is_binary(callee) or callee == "" ->
        {:error, :invalid_callee}

      callee == caller_user_id ->
        {:error, :cannot_call_self}

      true ->
        # Act-on-behalf consent gates Opal-placed calls only. Human taps do not need it.
        with :ok <- maybe_require_outbound_consent(caller_user_id, attrs["conversation_id"], attrs) do
          now = now()

          cs =
            CallSession.create_changeset(%{
              caller_user_id: caller_user_id,
              callee_user_id: callee,
              conversation_id: attrs["conversation_id"],
              status: "ringing",
              correlation_id:
                attrs["correlation_id"] || "call-" <> Integer.to_string(System.system_time(:millisecond)),
              ringing_at: now
            })

          case Repo.insert(cs) do
            {:ok, session} ->
              _ = emit(session, "call.invited", caller_user_id)
              _ = emit(session, "call.ringing", caller_user_id)
              broadcast(session, "ringing", ring_payload(session, caller_user_id))
              _ = maybe_call_invite_message(session, caller_user_id)
              call_type = call_type_from(attrs)
              _ = CallPush.notify_incoming(session, call_type: call_type)
              schedule_missed(session.id)
              {:ok, session}

            {:error, %Ecto.Changeset{} = cs} ->
              {:error, cs}

            {:error, reason} ->
              {:error, reason}
          end
        end
    end
  end

  defp maybe_require_outbound_consent(user_id, conversation_id, attrs) do
    on_behalf? =
      attrs["on_behalf"] in [true, "true", "1", 1] or
        attrs["act_on_behalf"] in [true, "true", "1", 1] or
        (is_binary(attrs["consent_proof_id"]) and attrs["consent_proof_id"] != "")

    if on_behalf? do
      case Consent.require_for_action(user_id, @calls_capability, conversation_id, attrs) do
        {:ok, _proof} -> :ok
        {:error, reason} -> {:error, reason}
      end
    else
      :ok
    end
  end

  # Optional continuity: chat row with call_id (never SDP/ICE).
  defp maybe_call_invite_message(%CallSession{} = session, caller_user_id) do
    conv = session.conversation_id

    if is_binary(conv) and conv != "" do
      _ =
        OpalCore.Messages.accept_message(%{
          "conversation_id" => conv,
          "sender_user_id" => caller_user_id,
          "client_message_id" => "call-invite-" <> session.id,
          "message_type" => "call_invite",
          "body" => "call:" <> session.id
        })

      :ok
    else
      :ok
    end
  rescue
    _ -> :ok
  end

  @doc """
  Start a 1:1 call from a conversation.

  The callee is the other member. A supplied callee that is not that member
  is rejected. A second tap, or the two people calling each other at once,
  reuses the one open session. An answered call is busy.
  """
  def invite_in_conversation(caller_user_id, conversation_id, attrs \\ %{})
      when is_binary(caller_user_id) and is_binary(conversation_id) do
    attrs = stringify(attrs)

    # Human conversation call taps are not act-on-behalf; only Opal-placed calls need consent.
    with :ok <- maybe_require_outbound_consent(caller_user_id, conversation_id, attrs) do
      Repo.transaction(fn ->
        _ =
          from(c in Conversation, where: c.id == ^conversation_id, lock: "FOR UPDATE")
          |> Repo.one()

        with :ok <- conversation_member(conversation_id, caller_user_id),
             {:ok, callee} <- direct_peer(conversation_id, caller_user_id),
             :ok <- reject_other_callee(attrs["callee_user_id"], callee) do
          case open_conversation_call(conversation_id) do
            %CallSession{status: "answered"} = open ->
              cond do
                stale_media?(open) ->
                  _ = end_call(open, caller_user_id, "media_failed", "ended")
                  insert_conversation_call(caller_user_id, callee, conversation_id, attrs)

                media_connected?(open) and not ChannelPresence.live?(open.id) ->
                  # The row is still answered, but nobody is in call:<id>.
                  # A reconnect or a missed hangup must not block the next call.
                  _ = end_call(open, caller_user_id, "hangup", "ended")
                  insert_conversation_call(caller_user_id, callee, conversation_id, attrs)

                true ->
                  Repo.rollback(:busy)
              end

            %CallSession{} = open ->
              if stale_ring?(open) do
                _ = end_call(open, open.caller_user_id, "missed", "missed")
                insert_conversation_call(caller_user_id, callee, conversation_id, attrs)
              else
                broadcast(open, "ringing", ring_payload(open, open.caller_user_id))
                open
              end

            nil ->
              insert_conversation_call(caller_user_id, callee, conversation_id, attrs)
          end
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end
  end

  @doc "Mark a still-ringing call missed. Safe to call more than once."
  def expire_if_ringing(call_id) when is_binary(call_id) do
    case Repo.get(CallSession, call_id) do
      %CallSession{status: status} = session when status in ["ringing", "initiated"] ->
        case end_call(session, session.caller_user_id, "missed", "missed") do
          {:ok, updated} = ok ->
            _ = CallPush.notify_missed(updated)
            ok

          other ->
            other
        end

      %CallSession{} = session ->
        {:ok, session}

      nil ->
        {:error, :not_found}
    end
  end

  def answer(call_id, user_id) when is_binary(call_id) and is_binary(user_id) do
    with {:ok, session} <- fetch_authorized(call_id, user_id),
         :ok <- only_callee(session, user_id),
         :ok <- expect_status(session, ~w(ringing initiated)) do
      now = now()

      claimed =
        from(c in CallSession,
          where: c.id == ^session.id and c.status in ["ringing", "initiated"]
        )
        |> Repo.update_all(set: [status: "answered", answered_at: now, updated_at: now])

      case claimed do
        {1, _} ->
          updated = Repo.get!(CallSession, session.id)
          _ = emit(updated, "call.answered", user_id)
          broadcast(updated, "answered", %{call_id: updated.id, by_user_id: user_id, conversation_id: updated.conversation_id})
          {:ok, updated}

        _ ->
          {:error, :invalid_state}
      end
    end
  end

  def decline(call_id, user_id) when is_binary(call_id) and is_binary(user_id) do
    with {:ok, session} <- fetch_authorized(call_id, user_id),
         :ok <- only_callee(session, user_id),
         :ok <- expect_status(session, ~w(ringing initiated)) do
      case end_call(session, user_id, "declined", "ended") do
        {:ok, updated} = ok ->
          _ = CallPush.notify_declined(updated)
          ok

        other ->
          other
      end
    end
  end

  def cancel(call_id, user_id) when is_binary(call_id) and is_binary(user_id) do
    with {:ok, session} <- fetch_authorized(call_id, user_id),
         :ok <- only_caller(session, user_id),
         :ok <- expect_status(session, ~w(ringing initiated)) do
      end_call(session, user_id, "canceled", "canceled")
    end
  end

  def end_call_session(call_id, user_id, reason \\ "hangup")
      when is_binary(call_id) and is_binary(user_id) do
    with {:ok, session} <- fetch_authorized(call_id, user_id) do
      cond do
        session.status in ~w(ended failed missed canceled) ->
          {:ok, session}

        session.status == "answered" ->
          end_call(session, user_id, reason, "ended")

        session.status in ~w(ringing initiated) and session.caller_user_id == user_id ->
          end_call(session, user_id, "canceled", "canceled")

        session.status in ~w(ringing initiated) and session.callee_user_id == user_id ->
          end_call(session, user_id, "declined", "ended")

        true ->
          {:error, :invalid_state}
      end
    end
  end

  def get(call_id, user_id) when is_binary(call_id) and is_binary(user_id) do
    fetch_authorized(call_id, user_id)
  end

  @doc "Calls this person placed or received. Newest first. No media payloads."
  def list_for(user_id) when is_binary(user_id) do
    # A harness session lets a final transcript use the production path.
    # It is not a call anyone placed, so it stays out of call history.
    from(c in CallSession,
      where:
        (c.caller_user_id == ^user_id or c.callee_user_id == ^user_id) and
          (is_nil(c.ended_reason) or c.ended_reason != "harness"),
      order_by: [desc: c.inserted_at],
      limit: 50
    )
    |> Repo.all()
    |> Enum.map(&project(&1, user_id))
  end

  def mark_media_connected(call_id, user_id) when is_binary(call_id) and is_binary(user_id) do
    with {:ok, session} <- fetch_authorized(call_id, user_id),
         :ok <- expect_status(session, ["answered"]) do
      now = now()

      claimed =
        from(c in CallSession,
          where: c.id == ^session.id and c.status == "answered" and is_nil(c.media_connected_at)
        )
        |> Repo.update_all(set: [media_connected_at: now, updated_at: now])

      updated =
        case claimed do
          {1, _} -> Repo.get!(CallSession, session.id)
          _ -> Repo.get!(CallSession, session.id)
        end

      broadcast(updated, "connected", %{
        call_id: updated.id,
        conversation_id: updated.conversation_id,
        media_connected_at: updated.media_connected_at
      })

      _ = OpalCore.Calls.Assist.apply_defaults(updated)

      {:ok, updated}
    end
  end

  def project(%CallSession{} = session, viewer_id) do
    peer_id = peer_user_id(session, viewer_id)
    peer = if peer_id, do: Repo.get(OpalCore.Accounts.User, peer_id)
    label = history_label(session, viewer_id)

    %{
      "id" => session.id,
      "conversation_id" => session.conversation_id,
      "direction" => if(session.caller_user_id == viewer_id, do: "outgoing", else: "incoming"),
      "peer_user_id" => peer_id,
      "peer_name" => (peer && peer.display_name) || "Call",
      "status" => session.status,
      "ended_reason" => session.ended_reason,
      "history_label" => label,
      "missed" => label == "Missed call",
      "created_at" => session.inserted_at,
      "answered_at" => session.answered_at,
      "media_connected_at" => session.media_connected_at,
      "ended_at" => session.ended_at
    }
  end

  def history_label(%CallSession{} = session, viewer_id \\ nil) do
    reason = session.ended_reason || ""
    incoming? = is_binary(viewer_id) and session.callee_user_id == viewer_id

    cond do
      session.media_connected_at && session.ended_at ->
        seconds = DateTime.diff(session.ended_at, session.media_connected_at, :second)
        "Audio call · #{format_duration(max(seconds, 0))}"

      reason in ["media_failed", "failed", "mic_denied"] ->
        "Call couldn't connect"

      reason == "declined" and incoming? ->
        "Declined call"

      reason == "declined" ->
        "Call declined"

      reason == "busy" and incoming? ->
        "Call"

      reason == "busy" ->
        "Busy"

      (reason == "canceled" or session.status == "canceled") and incoming? ->
        "Missed call"

      reason == "canceled" or session.status == "canceled" ->
        "Canceled call"

      (reason in ["missed", "ring_timeout"] or session.status == "missed") and incoming? ->
        "Missed call"

      reason in ["missed", "ring_timeout"] or session.status == "missed" ->
        "No answer"

      session.status in ["ended", "answered"] ->
        "Call couldn't connect"

      true ->
        "Call"
    end
  end

  defp insert_conversation_call(caller_user_id, callee, conversation_id, attrs) do
    if user_in_answered_call?(caller_user_id) or user_in_answered_call?(callee) do
      Repo.rollback(:busy)
    else
      case invite(caller_user_id, %{
             "callee_user_id" => callee,
             "conversation_id" => conversation_id,
             "correlation_id" => attrs["idempotency_key"],
             "consent_proof_id" => attrs["consent_proof_id"]
           }) do
        {:ok, session} ->
          schedule_missed(session.id)
          session

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end
  end

  defp stale_ring?(%CallSession{ringing_at: %DateTime{} = at}) do
    DateTime.diff(DateTime.utc_now(), at, :second) > div(@ring_timeout_ms, 1000)
  end

  defp stale_ring?(_), do: true

  defp media_connected?(%CallSession{media_connected_at: %DateTime{}}), do: true
  defp media_connected?(_), do: false

  defp stale_media?(%CallSession{answered_at: %DateTime{} = at, media_connected_at: nil}) do
    DateTime.diff(DateTime.utc_now(), at, :second) > 20
  end

  defp stale_media?(_), do: false

  defp format_duration(seconds) when seconds < 60, do: "#{seconds}s"
  defp format_duration(seconds), do: "#{div(seconds, 60)}m #{rem(seconds, 60)}s"

  def peer_user_id(%CallSession{} = s, user_id) do
    cond do
      s.caller_user_id == user_id -> s.callee_user_id
      s.callee_user_id == user_id -> s.caller_user_id
      true -> nil
    end
  end

  defp end_call(session, actor_id, reason, status) do
    now = now()

    {:ok, updated} =
      session
      |> CallSession.transition_changeset(%{
        status: status,
        ended_reason: reason,
        ended_at: now
      })
      |> Repo.update()

    event =
      case {status, reason} do
        {"canceled", _} -> "call.ended"
        {"ended", "declined"} -> "call.ended"
        {"missed", _} -> "call.failed"
        {"failed", _} -> "call.failed"
        _ -> "call.ended"
      end

    _ = emit(updated, event, actor_id)
    _ = ingest_intelligence_call_ended(updated, reason)
    broadcast(updated, "ended", %{call_id: updated.id, reason: reason, by_user_id: actor_id})
    {:ok, updated}
  end

  defp ingest_intelligence_call_ended(%CallSession{} = s, reason) do
    duration_ms =
      cond do
        match?(%DateTime{}, s.media_connected_at) and match?(%DateTime{}, s.ended_at) ->
          DateTime.diff(s.ended_at, s.media_connected_at, :millisecond)

        match?(%DateTime{}, s.answered_at) and match?(%DateTime{}, s.ended_at) ->
          DateTime.diff(s.ended_at, s.answered_at, :millisecond)

        match?(%DateTime{}, s.ringing_at) and match?(%DateTime{}, s.ended_at) ->
          DateTime.diff(s.ended_at, s.ringing_at, :millisecond)

        true ->
          0
      end

    outcome =
      case reason do
        "declined" -> "declined"
        "missed" -> "missed"
        "canceled" -> "canceled"
        "hangup" -> "completed"
        other when is_binary(other) -> other
        _ -> "ended"
      end

    _ =
      OpalCore.Intelligence.EventIngestor.ingest(%{
        type: "call.ended",
        actor_id: s.caller_user_id,
        conversation_id: s.conversation_id,
        idempotency_key: "call.ended:" <> s.id,
        payload: %{
          "call_id" => s.id,
          "caller_user_id" => s.caller_user_id,
          "callee_user_id" => s.callee_user_id,
          "duration_ms" => duration_ms,
          "outcome" => outcome,
          "ended_reason" => s.ended_reason,
          "status" => s.status
        }
      })

    :ok
  rescue
    e ->
      require Logger
      Logger.warning("call.intelligence_ingest_failed reason=#{Exception.message(e)}")
      :ok
  end

  defp call_type_from(attrs) when is_map(attrs) do
    case attrs["call_type"] || attrs["media"] || attrs[:call_type] do
      "video" -> "video"
      :video -> "video"
      _ -> "audio"
    end
  end

  defp call_type_from(_), do: "audio"

  defp fetch_authorized(call_id, user_id) do
    case Repo.get(CallSession, call_id) do
      nil ->
        {:error, :not_found}

      %CallSession{} = s ->
        if s.caller_user_id == user_id or s.callee_user_id == user_id do
          {:ok, s}
        else
          {:error, :forbidden}
        end
    end
  end

  defp only_callee(%CallSession{callee_user_id: id}, user_id) when id == user_id, do: :ok
  defp only_callee(_, _), do: {:error, :forbidden}

  defp only_caller(%CallSession{caller_user_id: id}, user_id) when id == user_id, do: :ok
  defp only_caller(_, _), do: {:error, :forbidden}

  defp expect_status(%CallSession{status: s}, allowed) do
    if s in allowed, do: :ok, else: {:error, :invalid_state}
  end

  defp emit(%CallSession{} = s, event_type, actor_id) do
    Publisher.record(%{
      event_type: event_type,
      aggregate_type: "call_session",
      aggregate_id: s.id,
      partition_key: s.id,
      privacy_class: "shared_authorized",
      purpose: "call_lifecycle",
      correlation_id: s.correlation_id,
      payload: %{
        "call_id" => s.id,
        "caller_user_id" => s.caller_user_id,
        "callee_user_id" => s.callee_user_id,
        "conversation_id" => s.conversation_id,
        "status" => s.status,
        "ended_reason" => s.ended_reason,
        "actor_user_id" => actor_id
      }
    })
  end

  defp broadcast(%CallSession{} = s, event, payload) do
    Endpoint.broadcast("call:" <> s.id, event, payload)
    # Also nudge callee/caller user topics for incoming UI
    Endpoint.broadcast("user:" <> s.callee_user_id, "call:" <> event, payload)
    Endpoint.broadcast("user:" <> s.caller_user_id, "call:" <> event, payload)
    :ok
  rescue
    _ -> :ok
  end

  defp ring_payload(%CallSession{} = session, caller_user_id) do
    %{
      call_id: session.id,
      from_user_id: caller_user_id,
      callee_user_id: session.callee_user_id,
      conversation_id: session.conversation_id
    }
  end

  defp conversation_member(conversation_id, user_id) do
    if user_id in Messages.member_user_ids(conversation_id), do: :ok, else: {:error, :not_a_member}
  end

  defp direct_peer(conversation_id, caller_user_id) do
    others = Messages.member_user_ids(conversation_id) -- [caller_user_id]

    case others do
      [peer] -> {:ok, peer}
      _ -> {:error, :not_direct}
    end
  end

  defp reject_other_callee(nil, _peer), do: :ok
  defp reject_other_callee("", _peer), do: :ok
  defp reject_other_callee(callee, peer) when callee == peer, do: :ok
  defp reject_other_callee(_, _), do: {:error, :callee_rejected}

  defp open_conversation_call(conversation_id) do
    from(c in CallSession,
      where: c.conversation_id == ^conversation_id and c.status in ["ringing", "initiated", "answered"],
      order_by: [asc: c.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  defp user_in_answered_call?(user_id) do
    from(c in CallSession,
      where:
        c.status == "answered" and
          (c.caller_user_id == ^user_id or c.callee_user_id == ^user_id)
    )
    |> Repo.exists?()
  end

  defp schedule_missed(call_id) do
    if Mix.env() == :test do
      :ok
    else
      Task.start(fn ->
        Process.sleep(@ring_timeout_ms)
        _ = expire_if_ringing(call_id)
      end)

      :ok
    end
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:microsecond)

  defp stringify(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
