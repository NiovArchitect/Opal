defmodule OpalCore.Intelligence.TravelState do
  @moduledoc "City-level travel state (Paste E5). Never stores GPS."

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "travel_states" do
    field :account_id, :binary_id
    field :home_city, :string
    field :current_city, :string
    field :home_timezone, :string, default: "America/Los_Angeles"
    field :current_timezone, :string
    field :started_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :active, :boolean, default: true
    field :detection_readings, :map, default: %{}
    field :routine_gap_logged, :boolean, default: false

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :home_city,
      :current_city,
      :home_timezone,
      :current_timezone,
      :started_at,
      :ended_at,
      :active,
      :detection_readings,
      :routine_gap_logged
    ])
    |> validate_required([:account_id, :home_timezone, :current_timezone, :started_at])
  end
end
