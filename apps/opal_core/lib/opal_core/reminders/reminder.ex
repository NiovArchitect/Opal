defmodule OpalCore.Reminders.Reminder do
  @moduledoc """
  Paste G Phase 8 — durable user-command reminder.

  CRITICAL PRODUCT LAW: user reminders are NEVER subject to AttentionBudget.
  A user command is not an Opal nudge. Budget exhaustion must not block delivery.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(pending delivered cancelled)

  schema "reminders" do
    field :account_id, :binary_id
    field :task, :string
    field :remind_at, :utc_datetime_usec
    field :status, :string, default: "pending"
    field :recurrence, :map
    field :conversation_id, :binary_id
    field :delivered_at, :utc_datetime_usec
    field :overdue, :boolean, default: false
    field :metadata, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :task,
      :remind_at,
      :status,
      :recurrence,
      :conversation_id,
      :delivered_at,
      :overdue,
      :metadata
    ])
    |> validate_required([:account_id, :task, :remind_at, :status])
    |> update_change(:task, &trim_task/1)
    |> validate_length(:task, min: 1, max: 500)
    |> validate_inclusion(:status, @statuses)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "account_id" => r.account_id,
      "task" => r.task,
      "remind_at" => r.remind_at && DateTime.to_iso8601(r.remind_at),
      "status" => r.status,
      "recurrence" => r.recurrence,
      "conversation_id" => r.conversation_id,
      "delivered_at" => r.delivered_at && DateTime.to_iso8601(r.delivered_at),
      "overdue" => r.overdue,
      "metadata" => r.metadata
    }
  end

  defp trim_task(nil), do: nil

  defp trim_task(s) when is_binary(s) do
    case String.trim(s) do
      "" -> nil
      t -> t
    end
  end

  defp trim_task(other), do: other
end
