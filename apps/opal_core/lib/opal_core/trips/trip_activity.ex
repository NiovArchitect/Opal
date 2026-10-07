defmodule OpalCore.Trips.TripActivity do
  @moduledoc """
  Proposed experience inside a time block.

  Venue names must be real and specific (Pujol, Contramar) — never placeholders
  like "table for four". Subgroup membership lives on TripActivityResponse.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @kinds ~w(meal activity lodging transit free other)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "trip_activities" do
    field :position, :integer, default: 0
    field :venue_name, :string
    field :venue_area, :string
    field :activity_kind, :string, default: "activity"
    field :vibe_tags, {:array, :string}, default: []
    field :notes, :string

    belongs_to :trip_time_block, OpalCore.Trips.TripTimeBlock
    belongs_to :trip_leg, OpalCore.Trips.TripLeg

    has_many :responses, OpalCore.Trips.TripActivityResponse

    timestamps(type: :utc_datetime_usec)
  end

  def kinds, do: @kinds

  def changeset(activity, attrs) do
    activity
    |> cast(attrs, [
      :trip_time_block_id,
      :position,
      :venue_name,
      :venue_area,
      :activity_kind,
      :vibe_tags,
      :notes,
      :trip_leg_id
    ])
    |> validate_required([:trip_time_block_id, :position, :venue_name, :activity_kind])
    |> validate_inclusion(:activity_kind, @kinds)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_length(:venue_name, min: 1, max: 200)
    |> validate_length(:venue_area, max: 200)
    |> validate_length(:notes, max: 2000)
    |> validate_no_placeholder_venue()
    |> foreign_key_constraint(:trip_time_block_id)
    |> foreign_key_constraint(:trip_leg_id)
  end

  defp validate_no_placeholder_venue(changeset) do
    name = get_field(changeset, :venue_name) || ""

    if Regex.match?(~r/\btable for (four|4|six|6)\b/i, name) or
         Regex.match?(~r/\b(tbd|placeholder|somewhere nice)\b/i, name) do
      add_error(changeset, :venue_name, "must be a real venue or experience name")
    else
      changeset
    end
  end

  def to_contract(%__MODULE__{} = a) do
    responses =
      (a.responses || [])
      |> Enum.map(&OpalCore.Trips.TripActivityResponse.to_contract/1)

    %{
      "id" => a.id,
      "trip_time_block_id" => a.trip_time_block_id,
      "position" => a.position,
      "venue_name" => a.venue_name,
      "venue_area" => a.venue_area,
      "activity_kind" => a.activity_kind,
      "vibe_tags" => a.vibe_tags || [],
      "notes" => a.notes,
      "trip_leg_id" => a.trip_leg_id,
      "responses" => responses,
      "whos_in" => for(r <- responses, r["state"] == "in", do: r["user_id"]),
      "interested" => for(r <- responses, r["state"] == "interested", do: r["user_id"]),
      "passed" => for(r <- responses, r["state"] == "passed", do: r["user_id"])
    }
  end
end
