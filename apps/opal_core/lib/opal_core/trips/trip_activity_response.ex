defmodule OpalCore.Trips.TripActivityResponse do
  @moduledoc """
  Per-person reaction to a trip activity — the subgroup signal.

  States: `in` (committed), `interested` (soft yes), `passed` (sitting this one out).
  Not everyone does everything; Opal uses this to propose splits and meetups.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @states ~w(in interested passed)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trip_activity_responses" do
    field :user_id, :binary_id
    field :state, :string

    belongs_to :trip_activity, OpalCore.Trips.TripActivity

    timestamps(type: :utc_datetime_usec)
  end

  def states, do: @states

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:trip_activity_id, :user_id, :state])
    |> validate_required([:trip_activity_id, :user_id, :state])
    |> validate_inclusion(:state, @states)
    |> foreign_key_constraint(:trip_activity_id)
    |> unique_constraint([:trip_activity_id, :user_id],
      name: :trip_activity_responses_activity_user_index
    )
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "trip_activity_id" => r.trip_activity_id,
      "user_id" => r.user_id,
      "state" => r.state
    }
  end
end
