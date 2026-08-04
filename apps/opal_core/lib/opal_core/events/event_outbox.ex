defmodule OpalCore.Events.EventOutbox do
  @moduledoc """
  Transactional outbox row for transport-neutral domain events.

  Written in the same PostgreSQL transaction as authoritative state.
  Published asynchronously by Oban (local adapter now; Kafka later).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(pending publishing published failed dead)

  schema "event_outbox" do
    field :event_id, :string
    field :event_type, :string
    field :event_version, :integer, default: 1
    field :aggregate_type, :string
    field :aggregate_id, :string
    field :partition_key, :string
    field :topic_family, :string
    field :privacy_class, :string, default: "shared_authorized"
    field :purpose, :string
    field :correlation_id, :string
    field :causation_id, :string
    field :envelope, :map, default: %{}
    field :status, :string, default: "pending"
    field :attempts, :integer, default: 0
    field :available_at, :utc_datetime_usec
    field :published_at, :utc_datetime_usec
    field :last_error, :string

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :event_id,
      :event_type,
      :event_version,
      :aggregate_type,
      :aggregate_id,
      :partition_key,
      :topic_family,
      :privacy_class,
      :purpose,
      :correlation_id,
      :causation_id,
      :envelope,
      :status,
      :attempts,
      :available_at,
      :published_at,
      :last_error
    ])
    |> validate_required([
      :event_id,
      :event_type,
      :partition_key,
      :topic_family,
      :privacy_class,
      :envelope,
      :status,
      :available_at
    ])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(
      :privacy_class,
      ~w(public internal shared_authorized private_authorized restricted prohibited_in_stream)
    )
    |> unique_constraint(:event_id)
  end
end
