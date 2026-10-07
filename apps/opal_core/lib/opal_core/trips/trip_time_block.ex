defmodule OpalCore.Trips.TripTimeBlock do
  @moduledoc """
  Soft day segment on a trip day.

  `time_label` is human and loose ("morning-ish", "~1pm", "7:30") — never a
  required Outlook interval. `block_kind` `free` is explicit breathing room.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @slots ~w(morning afternoon evening night custom)
  @kinds ~w(activity free transit meal)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trip_time_blocks" do
    field :position, :integer
    field :slot, :string
    field :time_label, :string
    field :block_kind, :string, default: "activity"
    field :title, :string
    field :notes, :string

    belongs_to :trip_day, OpalCore.Trips.TripDay

    has_many :activities, OpalCore.Trips.TripActivity,
      preload_order: [asc: :position]

    timestamps(type: :utc_datetime_usec)
  end

  def slots, do: @slots
  def kinds, do: @kinds

  def changeset(block, attrs) do
    block
    |> cast(attrs, [
      :trip_day_id,
      :position,
      :slot,
      :time_label,
      :block_kind,
      :title,
      :notes
    ])
    |> validate_required([:trip_day_id, :position, :slot, :time_label, :block_kind])
    |> validate_inclusion(:slot, @slots)
    |> validate_inclusion(:block_kind, @kinds)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_length(:time_label, min: 1, max: 80)
    |> validate_length(:title, max: 200)
    |> validate_length(:notes, max: 2000)
    |> foreign_key_constraint(:trip_day_id)
  end

  def to_contract(%__MODULE__{} = b) do
    activities =
      (b.activities || [])
      |> Enum.sort_by(& &1.position)
      |> Enum.map(&OpalCore.Trips.TripActivity.to_contract/1)

    %{
      "id" => b.id,
      "trip_day_id" => b.trip_day_id,
      "position" => b.position,
      "slot" => b.slot,
      "time_label" => b.time_label,
      "block_kind" => b.block_kind,
      "title" => b.title,
      "notes" => b.notes,
      "activities" => activities
    }
  end
end
