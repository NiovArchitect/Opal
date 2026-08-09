defmodule OpalCore.SocialFlow.InterventionTelemetry do
  @moduledoc """
  Privacy-safe intervention telemetry.

  Events (examples):
  - intervention.resolved
  - intervention.silent
  - intervention.permission_requested
  - intervention.confirmation_requested
  - intervention.input_requested
  - intervention.result_available
  - intervention.corrected
  - intervention.revoked
  - alignment.gap_changed

  Forbidden: raw private schedules, raw location, private reasons,
  unnecessary raw conversation.
  """

  require Logger

  alias OpalCore.Events.Publisher

  @event_map %{
    "enough_to_compute" => "intervention.result_available",
    "needs_permission" => "intervention.permission_requested",
    "needs_confirmation" => "intervention.confirmation_requested",
    "needs_input" => "intervention.input_requested",
    "no_useful_intervention" => "intervention.silent"
  }

  @forbidden_payload_keys ~w(
    private_schedule raw_schedule calendar_title event_title
    precise_location latitude longitude home_address
    private_reason raw_body message_body conversation_text
  )

  @doc "Map a sufficiency decision to a telemetry event name."
  def event_for_decision(decision) when is_binary(decision) do
    Map.get(@event_map, decision, "intervention.resolved")
  end

  def event_for_decision(decision) when is_atom(decision) do
    decision |> Atom.to_string() |> event_for_decision()
  end

  def event_for_decision(_), do: "intervention.resolved"

  @doc """
  Emit privacy-safe telemetry for an intervention resolution.

  Best-effort: logs always; outbox when conversation_id present.
  Never raises into product path.
  """
  def emit_intervention(conversation_id, actor_user_id, decision, opts \\ []) do
    event_type = event_for_decision(decision)
    reason = Keyword.get(opts, :reason)
    gap = Keyword.get(opts, :gap)

    payload =
      %{
        "decision" => to_string(decision),
        "conversation_id" => conversation_id,
        "actor_user_id" => actor_user_id
      }
      |> maybe_put("reason_class", reason)
      |> maybe_put("gap_class", gap)

    :ok = assert_safe!(payload)

    Logger.info("opal.intervention #{event_type} decision=#{decision}")

    if is_binary(conversation_id) do
      _ =
        Publisher.record(%{
          event_type: event_type,
          aggregate_type: "conversation",
          aggregate_id: conversation_id,
          partition_key: conversation_id,
          privacy_class: "internal",
          purpose: "intervention_telemetry",
          payload: payload
        })
    end

    :ok
  rescue
    e ->
      Logger.warning("intervention telemetry skipped: #{Exception.message(e)}")
      :ok
  end

  @doc "Emit correction / revoke / gap_changed events."
  def emit_named(event_type, conversation_id, payload \\ %{})
      when is_binary(event_type) and is_binary(conversation_id) do
    safe =
      payload
      |> stringify()
      |> Map.take(~w(decision reason_class gap_class actor_user_id prior_decision))

    :ok = assert_safe!(safe)

    _ =
      Publisher.record(%{
        event_type: event_type,
        aggregate_type: "conversation",
        aggregate_id: conversation_id,
        partition_key: conversation_id,
        privacy_class: "internal",
        purpose: "intervention_telemetry",
        payload: Map.put(safe, "conversation_id", conversation_id)
      })

    :ok
  rescue
    _ -> :ok
  end

  def assert_safe!(payload) when is_map(payload) do
    s = stringify(payload)

    for key <- @forbidden_payload_keys do
      if Map.has_key?(s, key) do
        raise ArgumentError, "telemetry forbidden key: #{key}"
      end
    end

    :ok
  end

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, k, v), do: Map.put(map, k, to_string(v))

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
