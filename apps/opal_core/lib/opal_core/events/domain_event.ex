defmodule OpalCore.Events.DomainEvent do
  @moduledoc """
  Versioned domain-event envelopes for Kafka-ready publishing.

  Payloads must remain minimal (IDs and authority state). Forbidden in general
  topics: raw messages, contact lists, phones, locations, credentials, youth
  private content, gift surprises, private guidance.
  """

  @producer "opal_core"

  @forbidden_payload_keys ~w(
    phone phone_number e164 raw_body message body contact_list contacts
    location precise_location latitude longitude access_token bearer
    session_token password card_number gift_surprise private_guidance
    youth_private
  )

  def build(attrs) when is_map(attrs) do
    event_type = Map.fetch!(attrs, :event_type)
    payload = Map.get(attrs, :payload) || %{}
    validate_payload!(payload)

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    event_id = Map.get(attrs, :event_id) || "evt_" <> Ecto.UUID.generate()

    envelope = %{
      "event_id" => event_id,
      "event_type" => event_type,
      "event_version" => Map.get(attrs, :event_version) || 1,
      "occurred_at" => iso(Map.get(attrs, :occurred_at) || now),
      "recorded_at" => iso(now),
      "producer" => @producer,
      "aggregate_type" => Map.get(attrs, :aggregate_type),
      "aggregate_id" => Map.get(attrs, :aggregate_id),
      "sequence" => Map.get(attrs, :sequence),
      "correlation_id" => Map.get(attrs, :correlation_id),
      "causation_id" => Map.get(attrs, :causation_id),
      "tenant_scope" => Map.get(attrs, :tenant_scope) || "opal",
      "relationship_scope" => Map.get(attrs, :relationship_scope),
      "privacy_class" => Map.get(attrs, :privacy_class) || "shared_authorized",
      "purpose" => Map.get(attrs, :purpose),
      "trace_context" => Map.get(attrs, :trace_context) || %{},
      "topic_family" => Map.get(attrs, :topic_family) || topic_family(event_type),
      "partition_key" => Map.fetch!(attrs, :partition_key),
      "payload" => stringify_keys(payload)
    }

    {:ok, envelope}
  end

  def topic_family("relationship." <> _), do: "opal.relationship.events"
  def topic_family("invitation." <> _), do: "opal.invitation.events"
  def topic_family("conversation." <> _), do: "opal.conversation.events"
  def topic_family("journey." <> _), do: "opal.journey.events"
  def topic_family("experience." <> _), do: "opal.experience.events"
  def topic_family("contact." <> _), do: "opal.invitation.events"
  def topic_family("reservation." <> _), do: "opal.reservation.events"
  def topic_family("payment." <> _), do: "opal.payment.events"
  def topic_family("avp2." <> _), do: "opal.avp2.authorization.events"
  def topic_family("safety." <> _), do: "opal.safety.events"
  def topic_family(_), do: "opal.audit.events"

  def validate_payload!(payload) when is_map(payload) do
    Enum.each(payload, fn {k, v} ->
      key = to_string(k)

      if key in @forbidden_payload_keys or String.contains?(key, "phone") or
           String.contains?(key, "token") do
        raise ArgumentError, "forbidden domain event payload key: #{key}"
      end

      if is_binary(v) and String.length(v) > 500 do
        raise ArgumentError, "domain event payload values must stay small"
      end
    end)

    :ok
  end

  defp iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp iso(other), do: other

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn {k, v} -> {to_string(k), v} end)
  end
end
