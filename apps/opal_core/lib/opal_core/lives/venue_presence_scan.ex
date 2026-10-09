defmodule OpalCore.Lives.VenuePresenceScan do
  @moduledoc "Scan path for venue presence QR (claim flow later)."

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "venue_presence_scans" do
    field :venue_id, :binary_id
    field :live_room_id, :binary_id
    field :scanner_account_id, :binary_id
    field :verified, :boolean, default: true

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:venue_id, :live_room_id, :scanner_account_id, :verified])
    |> validate_required([:venue_id, :scanner_account_id])
  end
end
