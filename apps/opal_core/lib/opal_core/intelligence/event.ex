defmodule OpalCore.Intelligence.Event do
  @moduledoc "Unified intelligence signal — raw material for extract → reason → act → learn."

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @types ~w(
    message.sent message.received
    rsvp.changed
    plan.confirmed plan.cancelled plan.modified
    call.started call.ended call.missed call.transcribed
    location.shared location.stopped
    venue.visited
    reaction.given
  )

  schema "intelligence_events" do
    field :type, :string
    field :actor_id, :binary_id
    field :conversation_id, :binary_id
    field :occurred_at, :utc_datetime_usec
    field :payload, :map, default: %{}
    field :idempotency_key, :string

    timestamps(type: :utc_datetime_usec)
  end

  def types, do: @types

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:type, :actor_id, :conversation_id, :occurred_at, :payload, :idempotency_key])
    |> validate_required([:type, :actor_id, :occurred_at, :payload])
    |> validate_inclusion(:type, @types)
    |> unique_constraint(:idempotency_key, name: :intelligence_events_idempotency_key_index)
  end

  def to_contract(%__MODULE__{} = e) do
    %{
      "id" => e.id,
      "type" => e.type,
      "actor_id" => e.actor_id,
      "conversation_id" => e.conversation_id,
      "timestamp" => DateTime.to_iso8601(e.occurred_at),
      "payload" => e.payload || %{}
    }
  end
end
