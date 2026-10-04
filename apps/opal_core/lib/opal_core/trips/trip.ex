defmodule OpalCore.Trips.Trip do
  @moduledoc """
  Shared social trip object (people agreeing on a shared adventure).

  Not an itinerary builder. Legs are ordered stops; a trip with zero legs
  is a valid planning-phase object. Distinct from outing "Journey" surfaces.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trips" do
    field :title, :string
    field :destination_label, :string
    field :starts_on, :date
    field :ends_on, :date
    field :created_by_user_id, :binary_id

    has_many :legs, OpalCore.Trips.TripLeg, preload_order: [asc: :position]

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(trip, attrs) do
    trip
    |> cast(attrs, [
      :title,
      :destination_label,
      :starts_on,
      :ends_on,
      :created_by_user_id
    ])
    |> validate_required([:title, :created_by_user_id])
    |> validate_length(:title, min: 1, max: 200)
    |> validate_length(:destination_label, max: 200)
    |> validate_date_order()
  end

  defp validate_date_order(changeset) do
    starts = get_field(changeset, :starts_on)
    ends = get_field(changeset, :ends_on)

    if match?(%Date{}, starts) and match?(%Date{}, ends) and Date.compare(ends, starts) == :lt do
      add_error(changeset, :ends_on, "must be on or after starts_on")
    else
      changeset
    end
  end
end
