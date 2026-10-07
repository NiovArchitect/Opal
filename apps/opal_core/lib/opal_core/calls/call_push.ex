defmodule OpalCore.Calls.CallPush do
  @moduledoc """
  Push-to-wake + call lifecycle notifications.

  Incoming call payload includes everything the woken UI needs (name, avatar,
  call id, type) so the app can present CallKit / in-app UI without a network
  round-trip before ringing UI appears.
  """

  require Logger

  alias OpalCore.Accounts.User
  alias OpalCore.Calls.CallSession
  alias OpalCore.Push.DeviceTokens
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.Repo
  alias OpalCoreWeb.Endpoint

  @doc "Notify callee of an incoming call (highest priority push)."
  def notify_incoming(%CallSession{} = session, opts \\ []) do
    call_type = Keyword.get(opts, :call_type, "audio")
    caller = Repo.get(User, session.caller_user_id)
    caller_name = (caller && caller.display_name) || "Someone"
    avatar = avatar_url(caller)

    data = %{
      "type" => "incoming_call",
      "call_id" => session.id,
      "caller_id" => session.caller_user_id,
      "caller_name" => caller_name,
      "caller_avatar_url" => avatar,
      "call_type" => call_type,
      "conversation_id" => session.conversation_id,
      "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601()
    }

    title = "Incoming call"
    body = "#{caller_name} is calling"

    case enqueue_high(session.callee_user_id, title, body, data) do
      {:ok, _} ->
        schedule_retry_if_no_answer(session.id, session.callee_user_id, title, body, data)
        :ok

      {:error, :no_tokens} ->
        # Web-only / not-yet-registered devices still ring via Phoenix channels.
        # Unreachable is reserved for DeviceNotRegistered / all push adapters failed.
        Logger.info("call_push.incoming_no_tokens call_id=#{session.id} (channel ring still active)")
        :ok

      {:error, reason} ->
        Logger.warning("call_push.incoming_enqueue_failed reason=#{inspect(reason)} call_id=#{session.id}")
        :ok
    end
  end

  @doc "Caller notification when callee declines."
  def notify_declined(%CallSession{} = session) do
    callee = Repo.get(User, session.callee_user_id)
    name = (callee && callee.display_name) || "They"

    data = %{
      "type" => "call_declined",
      "call_id" => session.id,
      "callee_id" => session.callee_user_id,
      "callee_name" => name
    }

    _ = enqueue_high(session.caller_user_id, "Call declined", "#{name} declined your call", data)
    broadcast_caller(session, "declined_notice", %{call_id: session.id, message: "#{name} declined your call"})
    :ok
  end

  @doc "Both sides — missed / no answer after ring timeout."
  def notify_missed(%CallSession{} = session) do
    caller = Repo.get(User, session.caller_user_id)
    callee = Repo.get(User, session.callee_user_id)
    caller_name = (caller && caller.display_name) || "Someone"
    callee_name = (callee && callee.display_name) || "Them"

    _ =
      enqueue_high(
        session.callee_user_id,
        "Missed call",
        "Missed call from #{caller_name}",
        %{
          "type" => "missed_call",
          "call_id" => session.id,
          "caller_id" => session.caller_user_id,
          "caller_name" => caller_name
        }
      )

    _ =
      enqueue_high(
        session.caller_user_id,
        "No answer",
        "#{callee_name} didn't answer",
        %{
          "type" => "call_no_answer",
          "call_id" => session.id,
          "callee_id" => session.callee_user_id,
          "callee_name" => callee_name
        }
      )

    broadcast_caller(session, "no_answer", %{call_id: session.id, message: "No answer"})
    :ok
  end

  @doc "Caller sees unreachable when push delivery fails (DeviceNotRegistered / no tokens)."
  def notify_unreachable(%CallSession{} = session, reason \\ "unreachable") do
    callee = Repo.get(User, session.callee_user_id)
    name = (callee && callee.display_name) || "They"

    data = %{
      "type" => "call_unreachable",
      "call_id" => session.id,
      "callee_id" => session.callee_user_id,
      "reason" => to_string(reason)
    }

    _ =
      enqueue_high(
        session.caller_user_id,
        "Unreachable",
        "#{name} is unreachable",
        data
      )

    broadcast_caller(session, "unreachable", %{
      call_id: session.id,
      message: "#{name} is unreachable",
      reason: to_string(reason)
    })

    Logger.warning(
      "call_push.unreachable call_id=#{session.id} callee=#{session.callee_user_id} reason=#{inspect(reason)}"
    )

    :ok
  end

  defp enqueue_high(user_id, title, body, data) when is_binary(user_id) do
    tokens = DeviceTokens.list_active(user_id)

    if tokens == [] do
      Logger.info("call_push.no_tokens user_id=#{user_id} type=#{data["type"]}")
      {:error, :no_tokens}
    else
      DeliverPushWorker.enqueue(user_id, title, body, Map.put(data, "priority", "high"))
    end
  end

  defp enqueue_high(_, _, _, _), do: {:error, :invalid}

  # Retry the incoming push once after 5s if the call is still ringing.
  defp schedule_retry_if_no_answer(call_id, callee_id, title, body, data) do
    if Mix.env() == :test do
      :ok
    else
      Task.start(fn ->
        Process.sleep(5_000)

        case Repo.get(CallSession, call_id) do
          %CallSession{status: status} when status in ["ringing", "initiated"] ->
            Logger.info("call_push.retry_incoming call_id=#{call_id}")
            _ = DeliverPushWorker.enqueue(callee_id, title, body, Map.put(data, "priority", "high"))
            :ok

          _ ->
            :ok
        end
      end)

      :ok
    end
  end

  defp broadcast_caller(%CallSession{} = session, event, payload) do
    Endpoint.broadcast("user:" <> session.caller_user_id, "call:" <> event, payload)
    Endpoint.broadcast("call:" <> session.id, event, payload)
    :ok
  rescue
    _ -> :ok
  end

  # No avatar column yet — empty string so the client can render initials without a fetch.
  defp avatar_url(_user), do: ""
end
