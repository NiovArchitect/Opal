defmodule OpalCore.SocialFlow.AlignmentEvents do
  @moduledoc """
  Event / outbox readiness for alignment intelligence.

  Uses existing `OpalCore.Events.Publisher` — no synchronous Kafka dependency.

  Durable future event types:
  - alignment.intent_recognized
  - alignment.gap_changed
  - availability.permission_granted
  - availability.confirmed
  - availability.overlap_found
  - alignment.set (never emitted by availability path)
  - location.fit_computed
  - experience.options_ready
  - action.authorized
  - provider.confirmed
  """

  alias OpalCore.Events.Publisher

  @ready_types ~w(
    alignment.intent_recognized
    alignment.gap_changed
    availability.permission_granted
    availability.confirmed
    availability.overlap_found
    location.fit_computed
    experience.options_ready
    action.authorized
    provider.confirmed
    intervention.resolved
    intervention.silent
    intervention.permission_requested
    intervention.confirmation_requested
    intervention.input_requested
    intervention.result_available
    intervention.corrected
    intervention.revoked
  )

  # alignment.set is listed for readiness vocabulary but availability must not emit it.
  @blocked_from_availability ~w(alignment.set)

  def ready_types, do: @ready_types

  def allowed_from_availability?(event_type) when is_binary(event_type) do
    event_type in @ready_types and event_type not in @blocked_from_availability
  end

  def allowed_from_availability?(_), do: false

  @doc "Record a ready event if allowed. Best-effort."
  def record(event_type, conversation_id, payload \\ %{})
      when is_binary(event_type) and is_binary(conversation_id) do
    if allowed_from_availability?(event_type) do
      safe = sanitize(payload)

      Publisher.record(%{
        event_type: event_type,
        aggregate_type: "conversation",
        aggregate_id: conversation_id,
        partition_key: conversation_id,
        privacy_class: "internal",
        purpose: "alignment_intelligence",
        payload: Map.put(safe, "conversation_id", conversation_id)
      })
    else
      {:error, :event_not_allowed}
    end
  end

  defp sanitize(payload) when is_map(payload) do
    payload
    |> Map.new(fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
    |> Map.drop(~w(
      private_schedule raw_body message phone location latitude longitude
      calendar_title event_title access_token
    ))
  end

  defp sanitize(_), do: %{}
end
