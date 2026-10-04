defmodule OpalCore.Trips.TripLeg do
  @moduledoc """
  Ordered stop on a trip. Position is the source of truth (not dates).

  Legs are stops, not calendar minute-blocks. place_ref stays nil until a
  real place identity is resolved — never invent coordinates.
  Optional shared_plan_id links a leg to an existing plan agreement.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @leg_types ~w(lodging activity transit meal)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trip_legs" do
    field :position, :integer
    field :leg_type, :string
    field :place_label, :string
    field :place_ref, :map
    field :starts_on, :date
    field :ends_on, :date
    field :notes, :string

    belongs_to :trip, OpalCore.Trips.Trip
    belongs_to :shared_plan, OpalCore.SocialFlow.SharedPlan

    timestamps(type: :utc_datetime_usec)
  end

  def leg_types, do: @leg_types

  def to_contract(%__MODULE__{} = l) do
    %{
      "id" => l.id,
      "trip_id" => l.trip_id,
      "position" => l.position,
      "leg_type" => l.leg_type,
      "place_label" => l.place_label,
      "place_ref" => l.place_ref,
      "starts_on" => date(l.starts_on),
      "ends_on" => date(l.ends_on),
      "shared_plan_id" => l.shared_plan_id,
      "notes" => l.notes
    }
  end

  defp date(nil), do: nil
  defp date(%Date{} = d), do: Date.to_iso8601(d)

  def changeset(leg, attrs) do
    leg
    |> cast(attrs, [
      :trip_id,
      :position,
      :leg_type,
      :place_label,
      :place_ref,
      :starts_on,
      :ends_on,
      :shared_plan_id,
      :notes
    ])
    |> validate_required([:trip_id, :position, :leg_type, :place_label])
    |> validate_inclusion(:leg_type, @leg_types)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_length(:place_label, min: 1, max: 200)
    |> validate_length(:notes, max: 2000)
    |> foreign_key_constraint(:trip_id)
    |> foreign_key_constraint(:shared_plan_id)
  end
end
