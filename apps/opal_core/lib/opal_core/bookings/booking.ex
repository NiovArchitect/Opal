defmodule OpalCore.Bookings.Booking do
  @moduledoc """
  Durable booking attempt — search/confirm/cancel ledger.

  `confirmation_number` is nullable and must only be set from a live provider
  response (or the TEST-ONLY mock). Disabled paths never write one.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @types ~w(flight hotel restaurant activity)
  @statuses ~w(draft searched confirming confirmed cancelling cancelled failed disabled)

  schema "bookings" do
    field :account_id, :binary_id
    field :booking_type, :string
    field :status, :string, default: "draft"
    field :details, :map, default: %{}
    field :constraints, :map, default: %{}
    field :provider, :string
    field :provider_ref, :string
    field :confirmation_number, :string
    field :conversation_id, :binary_id
    field :plan_id, :binary_id
    field :amount_cents, :integer
    field :currency, :string, default: "USD"
    field :metadata, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  def types, do: @types
  def statuses, do: @statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :booking_type,
      :status,
      :details,
      :constraints,
      :provider,
      :provider_ref,
      :confirmation_number,
      :conversation_id,
      :plan_id,
      :amount_cents,
      :currency,
      :metadata
    ])
    |> validate_required([:account_id, :booking_type, :status])
    |> validate_inclusion(:booking_type, @types)
    |> validate_inclusion(:status, @statuses)
  end
end
