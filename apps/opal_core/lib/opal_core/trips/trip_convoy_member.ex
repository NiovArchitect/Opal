defmodule OpalCore.Trips.TripConvoyMember do
  @moduledoc """
  Opt-in presence on a trip convoy.

  `sharing` must be true for pings to stick. Coordinates stay nil unless the
  client supplies them — never invent lat/lng.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trip_convoy_members" do
    field :user_id, :binary_id
    field :sharing, :boolean, default: false
    field :place_label, :string
    field :lat, :float
    field :lng, :float
    field :last_ping_at, :utc_datetime_usec

    belongs_to :trip, OpalCore.Trips.Trip

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :trip_id,
      :user_id,
      :sharing,
      :place_label,
      :lat,
      :lng,
      :last_ping_at
    ])
    |> validate_required([:trip_id, :user_id])
    |> validate_length(:place_label, max: 200)
    |> foreign_key_constraint(:trip_id)
    |> unique_constraint([:trip_id, :user_id], name: :trip_convoy_members_trip_user_index)
  end

  def to_contract(%__MODULE__{} = m) do
    %{
      "user_id" => m.user_id,
      "sharing" => m.sharing == true,
      "place_label" => m.place_label,
      "has_coords" => is_number(m.lat) and is_number(m.lng),
      "last_ping_at" => dt(m.last_ping_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
