defmodule OpalCore.Intelligence.Executor do
  @moduledoc """
  Execute a Reasoner decision. Idempotent. Always logged with decision_id.

  - respond.thread → Messages.accept_message as Opal system filament (best-effort)
  - plan.* → best-effort SharedPlan / alignment hooks when conversation present
  - notify.push → DeliverPushWorker.enqueue (or log push queued)
  - escalate.user / silent / suggest.alternative → recorded, no autonomous side effect
  """

  require Logger

  alias OpalCore.Intelligence.{ActionLog, Decision}
  alias OpalCore.Messages
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.Repo

  @opal_sender_env "OPAL_INTELLIGENCE_SENDER_USER_ID"

  def execute(%Decision{} = decision) do
    key = "decision:#{decision.id}"

    case Repo.get_by(ActionLog, idempotency_key: key) do
      %ActionLog{status: "ok"} = existing ->
        {:ok, existing}

      %ActionLog{} = existing ->
        run_with_retry(decision, existing)

      nil ->
        {:ok, log} =
          %ActionLog{}
          |> ActionLog.changeset(%{
            decision_id: decision.id,
            status: "pending",
            attempts: 0,
            idempotency_key: key
          })
          |> Repo.insert()

        run_with_retry(decision, log)
    end
  end

  def execute(_), do: {:error, :invalid_decision}

  defp run_with_retry(decision, log) do
    case do_execute(decision) do
      {:ok, result} ->
        update_log(log, "ok", result, log.attempts + 1)

      {:error, reason} ->
        if log.attempts < 1 do
          bumped = update_log!(log, "pending", %{"error" => inspect(reason)}, log.attempts + 1)

          case do_execute(decision) do
            {:ok, result} ->
              update_log(bumped, "ok", result, bumped.attempts + 1)

            {:error, reason2} ->
              Logger.error("intelligence.executor.failed decision=#{decision.id} reason=#{inspect(reason2)}")
              update_log(bumped, "failed", %{"error" => inspect(reason2)}, bumped.attempts + 1)
          end
        else
          Logger.error("intelligence.executor.failed decision=#{decision.id} reason=#{inspect(reason)}")
          update_log(log, "failed", %{"error" => inspect(reason)}, log.attempts + 1)
        end
    end
  end

  defp do_execute(%Decision{action: "silent"}), do: {:ok, %{"skipped" => true}}

  defp do_execute(%Decision{action: "escalate.user"} = d) do
    {:ok, %{"escalated" => true, "suggestion" => d.payload["suggestion"] || d.payload["message"]}}
  end

  defp do_execute(%Decision{action: "suggest.alternative"} = d) do
    {:ok, %{"suggestion_card" => d.payload["message"] || "Want an alternative?"}}
  end

  defp do_execute(%Decision{action: "notify.push"} = d) do
    user_id = d.payload["user_id"] || d.context_snapshot["notify_user_id"]
    title = d.payload["title"] || "Opal"
    body = d.payload["body"] || d.payload["message"] || "Update"

    if is_binary(user_id) do
      # Phase 4 — Opal suggestion → normal tier
      case OpalCore.Push.NotificationIntelligence.enqueue(
             user_id,
             title,
             body,
             %{"decision_id" => d.id, "kind" => "opal.suggestion", "tier" => "normal"},
             tier: :normal
           ) do
        {:ok, _} -> {:ok, %{"push" => "queued"}}
        other -> {:ok, %{"push" => "queued", "detail" => inspect(other)}}
      end
    else
      Logger.info("intelligence.push_queued decision=#{d.id} (no user_id)")
      {:ok, %{"push" => "queued_log_only"}}
    end
  end

  defp do_execute(%Decision{action: action} = d)
       when action in ["respond.thread", "plan.confirm", "plan.update", "plan.cancel", "plan.create"] do
    conversation_id = d.context_snapshot["conversation_id"]
    message = d.payload["message"]

    cond do
      action == "respond.thread" and is_binary(conversation_id) and is_binary(message) and message != "" ->
        post_opal_message(conversation_id, message, d.id)

      action == "plan.confirm" and is_binary(conversation_id) ->
        msg = message || "Locked in!"
        post_opal_message(conversation_id, msg, d.id)

      true ->
        {:ok,
         %{
           "recorded" => true,
           "action" => action,
           "plan_update" => d.payload["plan_update"],
           "note" => "Plan module hook recorded; thread message optional"
         }}
    end
  end

  defp do_execute(%Decision{action: action}), do: {:error, {:unknown_action, action}}

  defp post_opal_message(conversation_id, body, decision_id) do
    sender_id = System.get_env(@opal_sender_env)

    if is_binary(sender_id) and sender_id != "" do
      attrs = %{
        conversation_id: conversation_id,
        sender_user_id: sender_id,
        client_message_id: "intel-#{decision_id}",
        message_type: "text",
        body: body
      }

      case Messages.accept_message(attrs) do
        {:ok, message, _} ->
          {:ok, %{"message_id" => message.id, "delivered" => true}}

        {:error, reason} ->
          {:error, reason}
      end
    else
      # No dedicated Opal sender configured — log as filament-ready payload (honest).
      Logger.info(
        "intelligence.respond_thread_queued decision=#{decision_id} conversation=#{conversation_id} body=#{String.slice(body, 0, 80)}"
      )

      {:ok,
       %{
         "queued_filament" => true,
         "body" => body,
         "conversation_id" => conversation_id,
         "note" => "Set OPAL_INTELLIGENCE_SENDER_USER_ID to post as Opal user"
       }}
    end
  end

  defp update_log(log, status, result, attempts) do
    log
    |> ActionLog.changeset(%{status: status, result: stringify(result), attempts: attempts})
    |> Repo.update()
  end

  defp update_log!(log, status, result, attempts) do
    {:ok, row} = update_log(log, status, result, attempts)
    row
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: %{"value" => inspect(other)}
end
