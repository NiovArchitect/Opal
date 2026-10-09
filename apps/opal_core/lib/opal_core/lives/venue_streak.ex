defmodule OpalCore.Lives.VenueStreak do
  @moduledoc "Private-to-account venue weekday streaks (never a public leaderboard)."

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "venue_streaks" do
    field :account_id, :binary_id
    field :venue_id, :binary_id
    field :weekday, :integer
    field :count, :integer, default: 0
    field :label, :string
    field :last_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:account_id, :venue_id, :weekday, :count, :label, :last_at])
    |> validate_required([:account_id, :venue_id, :weekday])
    |> validate_number(:weekday, greater_than_or_equal_to: 1, less_than_or_equal_to: 7)
    |> unique_constraint([:account_id, :venue_id, :weekday],
      name: :venue_streaks_account_venue_weekday_index
    )
  end

  def to_private_nudge(%__MODULE__{} = s, venue_name) when is_binary(venue_name) do
    day = weekday_name(s.weekday)

    %{
      "private" => true,
      "public_by_default" => false,
      "leaderboard" => false,
      "body" => "#{s.count} #{day} nights at #{venue_name} — that's your thing",
      "venue_id" => s.venue_id,
      "count" => s.count,
      "weekday" => s.weekday
    }
  end

  defp weekday_name(1), do: "Monday"
  defp weekday_name(2), do: "Tuesday"
  defp weekday_name(3), do: "Wednesday"
  defp weekday_name(4), do: "Thursday"
  defp weekday_name(5), do: "Friday"
  defp weekday_name(6), do: "Saturday"
  defp weekday_name(7), do: "Sunday"
  defp weekday_name(_), do: "weekday"
end
