defmodule OpalCore.Reminders.ReminderDeliveryWorker do
  @moduledoc """
  Paste G Phase 8 — fire user reminders at remind_at.

  CRITICAL PRODUCT LAW: reminders NEVER subject to AttentionBudget
  (user command ≠ Opal nudge). This worker must not call
  `AttentionBudget.request_slot/4`.
  """

  use Oban.Worker, queue: :events, max_attempts: 5

  require Logger

  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.Repo
  alias OpalCore.Reminders
  alias OpalCore.Reminders.Reminder
  alias OpalCore.SocialFlow.AttentionCenter

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    reminder_id = args["reminder_id"] || args[:reminder_id]

    case Repo.get(Reminder, reminder_id) do
      %Reminder{status: "pending"} = r ->
        case Reminders.deliver(r) do
          {:ok, _} -> :ok
          {:error, reason} -> {:error, reason}
        end

      %Reminder{} ->
        :ok

      nil ->
        :ok
    end
  end

  @doc "Push + AttentionCenter + optional Center/thread message. No AttentionBudget."
  def notify(%Reminder{} = r) do
    overdue_prefix = if r.overdue, do: "(overdue) ", else: ""
    title = "Reminder"
    body = overdue_prefix <> r.task

    _ =
      DeliverPushWorker.enqueue(r.account_id, title, body, %{
        "type" => "user_reminder",
        "reminder_id" => r.id,
        "overdue" => r.overdue
      })

    _ =
      AttentionCenter.ingest(%{
        "items" => [
          %{
            "recipient_user_id" => r.account_id,
            "level" => if(r.overdue, do: "urgent", else: "attention"),
            "action_required" => false,
            "dedupe_key" => "user_reminder:#{r.id}",
            "title" => title,
            "copy" => body,
            "detail" => body,
            "source_type" => "reminder",
            "source_id" => r.id,
            "reason" => "user_reminder",
            "privacy_safe" => true
          }
        ]
      })

    _ = maybe_center_message(r, body)
    :ok
  rescue
    e ->
      Logger.warning("reminder_delivery.notify_failed #{Exception.message(e)}")
      :ok
  end

  defp maybe_center_message(%Reminder{} = r, body) do
    case OpalConversations.get_or_create_conversation(r.account_id) do
      {:ok, conversation} ->
        %OpalMessage{}
        |> OpalMessage.changeset(%{
          "conversation_id" => conversation.id,
          "role" => "opal",
          "body" => body,
          "metadata" => %{
            "source" => "user_reminder",
            "reminder_id" => r.id,
            "overdue" => r.overdue
          }
        })
        |> Repo.insert()

      _ ->
        :ok
    end
  rescue
    _ -> :ok
  end
end
