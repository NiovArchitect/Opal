defmodule OpalCore.Artifacts.Artifact do
  @moduledoc """
  Durable shareable HTML artifact row (Paste G Phase 9).

  `plan_id` is the source object id: SharedPlan for `event_plan`, Trip for
  `trip_itinerary`. Facts in HTML come only from that source (+ linked bookings).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds ~w(trip_itinerary event_plan)

  schema "artifacts" do
    field :account_id, :binary_id
    field :kind, :string
    field :plan_id, :binary_id
    field :version, :integer, default: 1
    field :html_or_path, :string
    field :signed_token, :string
    field :expires_at, :utc_datetime_usec
    field :outdated_at, :utc_datetime_usec
    field :source_fingerprint, :string

    timestamps(type: :utc_datetime_usec)
  end

  def kinds, do: @kinds

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :kind,
      :plan_id,
      :version,
      :html_or_path,
      :signed_token,
      :expires_at,
      :outdated_at,
      :source_fingerprint
    ])
    |> validate_required([
      :account_id,
      :kind,
      :plan_id,
      :version,
      :html_or_path,
      :signed_token,
      :expires_at,
      :source_fingerprint
    ])
    |> validate_inclusion(:kind, @kinds)
    |> validate_number(:version, greater_than: 0)
    |> unique_constraint(:signed_token)
  end
end
