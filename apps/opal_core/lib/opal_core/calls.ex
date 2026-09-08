defmodule OpalCore.Calls do
  @moduledoc """
  1:1 call signaling authority (BEAM).

  State: initiated → ringing → answered → ended
  Also: canceled | declined→ended | missed | failed

  SDP/ICE never enter Outbox/Kafka — only IDs + status.
  """

  alias OpalCore.Calls.CallSession
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo
  alias OpalCoreWeb.Endpoint

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
        now = now()

        cs =
          CallSession.create_changeset(%{
            caller_user_id: caller_user_id,
            callee_user_id: callee,
            conversation_id: attrs["conversation_id"],
            status: "ringing",
            correlation_id: attrs["correlation_id"] || "call-" <> Integer.to_string(System.system_time(:millisecond)),
            ringing_at: now
          })

        case Repo.insert(cs) do
          {:ok, session} ->
            _ = emit(session, "call.invited", caller_user_id)
            _ = emit(session, "call.ringing", caller_user_id)
            broadcast(session, "ringing", %{call_id: session.id, from_user_id: caller_user_id})
            {:ok, session}

          {:error, %Ecto.Changeset{} = cs} ->
            {:error, cs}

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  def answer(call_id, user_id) when is_binary(call_id) and is_binary(user_id) do
    with {:ok, session} <- fetch_authorized(call_id, user_id),
         :ok <- only_callee(session, user_id),
         :ok <- expect_status(session, ~w(ringing initiated)) do
      now = now()

      {:ok, updated} =
        session
        |> CallSession.transition_changeset(%{status: "answered", answered_at: now})
        |> Repo.update()

      _ = emit(updated, "call.answered", user_id)
      broadcast(updated, "answered", %{call_id: updated.id, by_user_id: user_id})
      {:ok, updated}
    end
  end

  def decline(call_id, user_id) when is_binary(call_id) and is_binary(user_id) do
    with {:ok, session} <- fetch_authorized(call_id, user_id),
         :ok <- only_callee(session, user_id),
         :ok <- expect_status(session, ~w(ringing initiated)) do
      end_call(session, user_id, "declined", "ended")
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
    broadcast(updated, "ended", %{call_id: updated.id, reason: reason, by_user_id: actor_id})
    {:ok, updated}
  end

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

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:microsecond)

  defp stringify(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
