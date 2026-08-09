defmodule OpalCore.SocialFlow.RealWorld.Events do
  @moduledoc """
  Outbox readiness for real-world context events.

  Phoenix remains live client path. Kafka is not on the sync decision path.
  """

  alias OpalCore.Events.Publisher

  @types ~w(
    calendar.updated
    calendar.permission_changed
    location.context_changed
    eta.updated
    place.options_ready
    provider.availability_found
    booking.requested
    booking.confirmed
    device.action_authorized
    device.action_completed
    plan.version_revised
    plan.derived_work_cancelled
    proximity.feasibility_computed
  )

  def ready_types, do: @types

  def allowed?(type) when is_binary(type), do: type in @types
  def allowed?(_), do: false

  def record(event_type, conversation_id, payload \\ %{})
      when is_binary(event_type) and is_binary(conversation_id) do
    if allowed?(event_type) do
      safe =
        payload
        |> stringify()
        |> Map.drop(~w(
          private_schedule event_title calendar_title latitude longitude
          precise_location raw_body access_token phone
        ))

      Publisher.record(%{
        event_type: event_type,
        aggregate_type: "conversation",
        aggregate_id: conversation_id,
        partition_key: conversation_id,
        privacy_class: "internal",
        purpose: "real_world_context",
        payload: Map.put(safe, "conversation_id", conversation_id)
      })
    else
      {:error, :event_not_allowed}
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
