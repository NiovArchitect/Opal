defmodule OpalCore.Lives.LivePresenceReport do
  use Ecto.Schema
  import Ecto.Changeset

  alias OpalCore.Lives.LiveRoom

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "live_presence_reports" do
    field :reporter_account_id, :binary_id
    field :kind, :string, default: "host_isnt_here"

    belongs_to :live_room, LiveRoom

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:live_room_id, :reporter_account_id, :kind])
    |> validate_required([:live_room_id, :reporter_account_id, :kind])
    |> unique_constraint([:live_room_id, :reporter_account_id],
      name: :live_presence_reports_unique_reporter
    )
  end
end
