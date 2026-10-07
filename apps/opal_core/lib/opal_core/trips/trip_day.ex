defmodule OpalCore.Trips.TripDay do
  @moduledoc """
  One calendar day on a trip canvas.

  Days hold flexible time blocks — not a spreadsheet of rigid hours.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trip_days" do
    field :day_index, :integer
    field :on_date, :date
    field :label, :string
    field :notes, :string

    belongs_to :trip, OpalCore.Trips.Trip

    has_many :time_blocks, OpalCore.Trips.TripTimeBlock,
      preload_order: [asc: :position]

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(day, attrs) do
    day
    |> cast(attrs, [:trip_id, :day_index, :on_date, :label, :notes])
    |> validate_required([:trip_id, :day_index, :label])
    |> validate_number(:day_index, greater_than_or_equal_to: 0)
    |> validate_length(:label, min: 1, max: 80)
    |> validate_length(:notes, max: 2000)
    |> foreign_key_constraint(:trip_id)
    |> unique_constraint([:trip_id, :day_index], name: :trip_days_trip_id_day_index_index)
  end

  def to_contract(%__MODULE__{} = d) do
    blocks =
      (d.time_blocks || [])
      |> Enum.sort_by(& &1.position)
      |> Enum.map(&OpalCore.Trips.TripTimeBlock.to_contract/1)

    %{
      "id" => d.id,
      "trip_id" => d.trip_id,
      "day_index" => d.day_index,
      "on_date" => date(d.on_date),
      "label" => d.label,
      "notes" => d.notes,
      "time_blocks" => blocks
    }
  end

  defp date(nil), do: nil
  defp date(%Date{} = d), do: Date.to_iso8601(d)
end
