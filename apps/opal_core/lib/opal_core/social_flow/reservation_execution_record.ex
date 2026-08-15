defmodule OpalCore.SocialFlow.ReservationExecutionRecord do
  @moduledoc """
  Durable reservation execution attempt (Pass 19).

  Provider confirmation is external truth. This row is Opal's audit trail.
  LIVE partner booking is NOT claimed by default (synthetic / recorded fixture).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(
    checking
    available
    unavailable
    selected
    authorization_required
    authorized
    requested
    held
    reconciling
    confirmed
    failed
    expired
    cancelled
  )

  schema "reservation_executions" do
    field :reality_id, :binary_id
    field :actor_user_id, :binary_id
    field :provider, :string, default: "synthetic_reservation"
    field :provider_place_id, :string
    field :provider_resource_id, :string
    field :place_display_name, :string
    field :authorization_id, :binary_id
    field :idempotency_key, :string
    field :status, :string, default: "checking"
    field :party_size, :integer, default: 2
    field :slot_id, :string
    field :slot_label, :string
    field :slot_starts_at, :utc_datetime_usec
    field :availability_id, :string
    field :availability_expires_at, :utc_datetime_usec
    field :requested_at, :utc_datetime_usec
    field :confirmed_at, :utc_datetime_usec
    field :cancelled_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :provider_request_id, :string
    field :provider_response_id, :string
    field :failure_reason, :string
    field :payment_status, :string, default: "not_required"
    field :source_moment_id, :binary_id
    field :lineage, :map, default: %{}
    field :authorization, :map, default: %{}
    field :shared_safe_summary, :string
    field :mode, :string, default: "synthetic_provider"
    field :live_claimed, :boolean, default: false

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :reality_id,
      :actor_user_id,
      :provider,
      :provider_place_id,
      :provider_resource_id,
      :place_display_name,
      :authorization_id,
      :idempotency_key,
      :status,
      :party_size,
      :slot_id,
      :slot_label,
      :slot_starts_at,
      :availability_id,
      :availability_expires_at,
      :requested_at,
      :confirmed_at,
      :cancelled_at,
      :expires_at,
      :provider_request_id,
      :provider_response_id,
      :failure_reason,
      :payment_status,
      :source_moment_id,
      :lineage,
      :authorization,
      :shared_safe_summary,
      :mode,
      :live_claimed
    ])
    |> validate_required([
      :actor_user_id,
      :provider,
      :provider_place_id,
      :idempotency_key,
      :status
    ])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:idempotency_key)
  end

  def public_contract(%__MODULE__{} = e) do
    %{
      "execution_id" => e.id,
      "reality_id" => e.reality_id,
      "actor_user_id" => e.actor_user_id,
      "provider" => e.provider,
      "provider_place_id" => e.provider_place_id,
      "provider_resource_id" => e.provider_resource_id,
      "place_display_name" => e.place_display_name,
      "authorization_id" => e.authorization_id,
      "idempotency_key" => e.idempotency_key,
      "status" => e.status,
      "party_size" => e.party_size,
      "slot_id" => e.slot_id,
      "slot_label" => e.slot_label,
      "slot_starts_at" => e.slot_starts_at,
      "availability_id" => e.availability_id,
      "availability_expires_at" => e.availability_expires_at,
      "requested_at" => e.requested_at,
      "confirmed_at" => e.confirmed_at,
      "cancelled_at" => e.cancelled_at,
      "provider_request_id" => e.provider_request_id,
      "provider_response_id" => e.provider_response_id,
      "failure_reason" => e.failure_reason,
      "payment_status" => e.payment_status,
      "source_moment_id" => e.source_moment_id,
      "lineage" => e.lineage || %{},
      "shared_safe_summary" => e.shared_safe_summary,
      "mode" => e.mode,
      "live_claimed" => e.live_claimed == true,
      "booked" => e.status == "confirmed",
      "is_payout" => false,
      "live_economic" => false,
      "truth_class" => "execution_state"
    }
  end

  @doc "Shared Reality–safe patch — no payment/auth secrets."
  def shared_reality_patch(%__MODULE__{} = e) do
    %{
      "reservation" => %{
        "status" => e.status,
        "place_display_name" => e.place_display_name,
        "slot_label" => e.slot_label,
        "party_size" => e.party_size,
        "provider_ref" => e.provider_resource_id,
        "confirmed" => e.status == "confirmed",
        "shared_safe_summary" => e.shared_safe_summary,
        "booked_by_user_id" => if(e.status == "confirmed", do: e.actor_user_id, else: nil)
      },
      "execution_state" => e.status,
      "booked" => e.status == "confirmed",
      "authorizes_set" => false
    }
  end
end
