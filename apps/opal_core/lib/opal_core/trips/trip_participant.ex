defmodule OpalCore.Trips.TripParticipant do
  @moduledoc """
  Trip membership — same shape as PlanParticipant (trip_id + user_id + role),
  without plan response-state machinery. People on a shared adventure.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @roles ~w(creator participant)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trip_participants" do
    field :user_id, :binary_id
    field :role, :string, default: "participant"

    belongs_to :trip, OpalCore.Trips.Trip

    timestamps(type: :utc_datetime_usec)
  end

  def roles, do: @roles

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:trip_id, :user_id, :role])
    |> validate_required([:trip_id, :user_id, :role])
    |> validate_inclusion(:role, @roles)
    |> unique_constraint([:trip_id, :user_id], name: :trip_participants_trip_id_user_id_uniq)
    |> foreign_key_constraint(:trip_id)
  end
end
