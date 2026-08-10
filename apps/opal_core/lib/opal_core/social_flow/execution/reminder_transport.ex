defmodule OpalCore.SocialFlow.Execution.ReminderTransport do
  @moduledoc """
  Real-ish reminder delivery transport with truthful states.

  intent_created → scheduled → delivery_requested → delivered | failed | cancelled

  Queued ≠ delivered.

  Transports:
  - in_app (always available)
  - web_notification (browser Notification API — client completes delivery)
  - local_notification (mobile OS — client schedules)

  Idempotent per commitment_id + kind + scheduled_for fingerprint.
  """

  alias OpalCore.SocialFlow.OpalCalendar.ReminderDelivery
  alias OpalCore.SocialFlow.Ambient.ExecutionCompose

  use Agent

  def start_link(_ \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          other -> other
        end

      _ ->
        :ok
    end
  end

  def reset do
    ensure_started()
    Agent.update(__MODULE__, fn _ -> %{} end)
  end

  @doc """
  Schedule actionable reminders with idempotency.

  Returns transport records — not social plan mutations.
  """
  def schedule(intents, opts \\ []) when is_list(intents) do
    ensure_started()
    transport = to_string(opts[:transport] || "in_app")
    now = opts[:now] || DateTime.utc_now()

    intents
    |> ReminderDelivery.queue(transport: transport, now: now)
    |> Enum.map(&upgrade_record(&1, transport))
    |> Enum.map(&persist_idempotent/1)
  end

  @doc "Mark transport-accepted delivery (client callback)."
  def mark_delivered(delivery_id) when is_binary(delivery_id) do
    ensure_started()

    Agent.get_and_update(__MODULE__, fn state ->
      case Map.get(state, delivery_id) do
        nil ->
          {{:error, :not_found}, state}

        rec ->
          updated =
            Map.merge(rec, %{
              "state" => "delivered",
              "delivery_status" => "delivered",
              "delivered_at" => DateTime.utc_now() |> DateTime.truncate(:microsecond)
            })

          {{:ok, updated}, Map.put(state, delivery_id, updated)}
      end
    end)
  end

  def mark_delivered(_), do: {:error, :invalid}

  @doc "Cancel by commitment — no duplicate 7pm+8pm after time change."
  def cancel_for_commitment(commitment_id) when is_binary(commitment_id) do
    ensure_started()

    Agent.get_and_update(__MODULE__, fn state ->
      {updated, cancelled} =
        Enum.reduce(state, {%{}, []}, fn {id, rec}, {acc, list} ->
          if rec["commitment_id"] == commitment_id and
               rec["state"] not in ~w(delivered cancelled) do
            c =
              Map.merge(rec, %{
                "state" => "cancelled",
                "delivery_status" => "cancelled",
                "notify" => false
              })

            {Map.put(acc, id, c), [c | list]}
          else
            {Map.put(acc, id, rec), list}
          end
        end)

      {{:ok, cancelled}, updated}
    end)
  end

  def cancel_for_commitment(_), do: {:error, :invalid}

  @doc """
  Replace reminders after plan time change.
  Cancels old commitment deliveries then schedules new intents.
  """
  def reschedule_for_commitment(commitment_id, intents, opts \\ [])
      when is_binary(commitment_id) and is_list(intents) do
    {:ok, cancelled} = cancel_for_commitment(commitment_id)
    scheduled = schedule(intents, opts)

    {:ok,
     %{
       "cancelled" => cancelled,
       "scheduled" => scheduled,
       "stale_reminders_cleared" => true,
       "duplicate_prevented" => true
     }}
  end

  def snapshot do
    ensure_started()
    Agent.get(__MODULE__, &Map.values/1)
  end

  @doc "Lock-screen copy helper."
  def lock_screen(intent), do: ReminderDelivery.lock_screen_copy(intent)

  def privacy_copy(leave_ctx), do: ExecutionCompose.reminder_lock_screen_copy(leave_ctx)

  defp upgrade_record(intent, transport) do
    i = stringify(intent)
    id = i["delivery_id"] || delivery_id(i)

    state =
      case i["delivery_status"] do
        "scheduled" -> "scheduled"
        "pending" -> "delivery_requested"
        "suppressed" -> "failed"
        "cancelled" -> "cancelled"
        "delivered" -> "delivered"
        _ -> "intent_created"
      end

    Map.merge(i, %{
      "delivery_id" => id,
      "state" => state,
      "transport" => transport,
      # Queued is not delivered
      "delivered" => state == "delivered",
      "delivery_requested" => state in ~w(delivery_requested delivered scheduled),
      "lock_screen" => ReminderDelivery.lock_screen_copy(i)["lock_screen"],
      "engagement_spam" => false
    })
  end

  defp persist_idempotent(rec) do
    ensure_started()
    id = rec["delivery_id"]
    fp = fingerprint(rec)

    Agent.get_and_update(__MODULE__, fn state ->
      existing =
        Enum.find(Map.values(state), fn r ->
          r["fingerprint"] == fp and r["state"] not in ~w(cancelled failed)
        end)

      if existing do
        {Map.put(existing, "idempotent_hit", true), state}
      else
        stored = Map.put(rec, "fingerprint", fp)
        {stored, Map.put(state, id, stored)}
      end
    end)
  end

  defp fingerprint(rec) do
    material = [
      rec["commitment_id"] || "",
      rec["kind"] || "",
      to_string(rec["scheduled_for"] || ""),
      rec["transport"] || ""
    ]

    :crypto.hash(:sha256, Enum.join(material, "|"))
    |> Base.encode16(case: :lower)
    |> binary_part(0, 16)
  end

  defp delivery_id(rec) do
    "rd_" <>
      (:crypto.hash(
         :sha256,
         :erlang.term_to_binary({rec["commitment_id"], rec["scheduled_for"], :os.system_time()})
       )
       |> Base.encode16(case: :lower)
       |> binary_part(0, 12))
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
