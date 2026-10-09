defmodule OpalCore.Lives.LiveRoom do
  @moduledoc """
  Placed-only live room. venue_id is REQUIRED (Amendment 2).
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias OpalCore.Lives.Venue

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(live ended flagged)

  schema "live_rooms" do
    field :host_account_id, :binary_id
    field :status, :string, default: "live"
    field :heat_contribution_frozen, :boolean, default: false
    field :presence_report_count, :integer, default: 0
    field :started_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :title, :string
    field :metadata, :map, default: %{}

    belongs_to :venue, Venue

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :host_account_id,
      :venue_id,
      :status,
      :heat_contribution_frozen,
      :presence_report_count,
      :started_at,
      :ended_at,
      :title,
      :metadata
    ])
    |> validate_required([:host_account_id, :venue_id, :status, :started_at])
    |> validate_inclusion(:status, @statuses)
    |> foreign_key_constraint(:venue_id)
  end

  def to_contract(%__MODULE__{} = r, venue \\ nil) do
    base = %{
      "id" => r.id,
      "host_account_id" => r.host_account_id,
      "venue_id" => r.venue_id,
      "status" => r.status,
      "heat_contribution_frozen" => r.heat_contribution_frozen,
      "presence_report_count" => r.presence_report_count,
      "started_at" => r.started_at && DateTime.to_iso8601(r.started_at),
      "ended_at" => r.ended_at && DateTime.to_iso8601(r.ended_at),
      "title" => r.title,
      "placed" => true,
      "location_required" => true
    }

    if match?(%Venue{}, venue) do
      Map.put(base, "venue", Venue.to_public_contract(venue))
    else
      base
    end
  end
end
