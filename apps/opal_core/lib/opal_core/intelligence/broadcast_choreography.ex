defmodule OpalCore.Intelligence.BroadcastChoreography do
  @moduledoc """
  Maps ActionIntent types → Channel broadcasts (Paste B Phase 5).

  Audience rules:
  - conflict_alert → conversation:<plan_conversation> (viewers of the plan)
  - nudge / presence_nudge → user:<account_id> ONLY (never cross-account)
  - plan_update_suggestion → conversation:<id> participants
  - commitment_reminder → user:<account_id>

  Payloads: IDs + display-ready summaries only — no raw memory records.
  Contract: shots/intelligence/CHANNEL_CONTRACT.md
  """

  require Logger

  alias OpalCore.Intelligence.ActionIntent
  alias OpalCoreWeb.Endpoint

  @doc "Broadcast an intent to the correct audience. Returns :ok | {:error, reason}."
  def broadcast(%ActionIntent{} = intent) do
    case intent.type do
      :conflict_alert ->
        topic = conversation_topic(intent)
        push(topic, "intelligence:conflict_alert", payload(intent))

      :plan_update_suggestion ->
        topic = conversation_topic(intent)
        push(topic, "intelligence:plan_update_suggestion", payload(intent))

      type when type in [:nudge, :presence_nudge, :commitment_reminder] ->
        # Per-account private topic — NEVER fan out to other accounts
        topic = "user:#{intent.account_id}"
        event = "intelligence:#{type}"
        push(topic, event, payload(intent))

      other ->
        Logger.warning("broadcast_choreography.unknown_type type=#{other}")
        {:error, :unknown_type}
    end
  end

  def broadcast(_), do: {:error, :invalid}

  defp conversation_topic(%ActionIntent{conversation_id: id}) when is_binary(id),
    do: "conversation:#{id}"

  defp conversation_topic(%ActionIntent{plan_id: id}) when is_binary(id),
    do: "conversation:#{id}"

  defp conversation_topic(_), do: nil

  defp push(nil, _event, _payload), do: {:error, :no_topic}

  defp push(topic, event, payload) do
    Endpoint.broadcast(topic, event, payload)
    :ok
  end

  defp payload(%ActionIntent{} = i) do
    %{
      "schema_version" => 1,
      "event_id" => Ecto.UUID.generate(),
      "intent_type" => to_string(i.type),
      "account_id" => i.account_id,
      "ref_ids" => i.ref_ids || [],
      "reason" => i.reason,
      "priority" => i.priority,
      "summary" => i.suggested_copy_draft,
      "conversation_id" => i.conversation_id,
      "plan_id" => i.plan_id,
      "person_id" => i.person_id
    }
  end
end
