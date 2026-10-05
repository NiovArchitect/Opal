defmodule OpalCore.Celebrations.Celebration do
  @moduledoc """
  Phase 10A — birthday / anniversary owned by a single user.

  Month/day required (annual). Year optional — never invent.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds ~w(birthday anniversary)

  schema "celebrations" do
    field :user_id, :binary_id
    field :person_name, :string
    field :kind, :string
    field :month, :integer
    field :day, :integer
    field :year, :integer
    field :notes, :string
    field :reminders_sent, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  def kinds, do: @kinds

  def changeset(celebration, attrs) do
    celebration
    |> cast(attrs, [:user_id, :person_name, :kind, :month, :day, :year, :notes, :reminders_sent])
    |> validate_required([:user_id, :person_name, :kind, :month, :day])
    |> update_change(:person_name, &trim_or_nil/1)
    |> update_change(:notes, &trim_or_nil/1)
    |> validate_length(:person_name, min: 1, max: 120)
    |> validate_length(:notes, max: 500)
    |> validate_inclusion(:kind, @kinds)
    |> validate_number(:month, greater_than_or_equal_to: 1, less_than_or_equal_to: 12)
    |> validate_number(:day, greater_than_or_equal_to: 1, less_than_or_equal_to: 31)
    |> validate_number(:year, greater_than_or_equal_to: 1900, less_than_or_equal_to: 2100)
    |> validate_calendar_day()
  end

  def reminders_changeset(celebration, reminders_sent) when is_map(reminders_sent) do
    celebration
    |> change(%{reminders_sent: reminders_sent})
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "user_id" => c.user_id,
      "person_name" => c.person_name,
      "kind" => c.kind,
      "month" => c.month,
      "day" => c.day,
      "year" => c.year,
      "notes" => c.notes,
      "date_label" => date_label(c.month, c.day),
      "inserted_at" => datetime(c.inserted_at),
      "updated_at" => datetime(c.updated_at)
    }
  end

  @doc "Validate month/day against a leap-year calendar (Feb 29 ok, Feb 30 not)."
  def valid_month_day?(month, day) when is_integer(month) and is_integer(day) do
    match?({:ok, _}, Date.new(2024, month, day))
  end

  def valid_month_day?(_, _), do: false

  @month_abbr ~w(Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec)

  def date_label(month, day) when is_integer(month) and is_integer(day) and month in 1..12 do
    "#{Enum.at(@month_abbr, month - 1)} #{day}"
  end

  def date_label(_, _), do: nil

  defp validate_calendar_day(changeset) do
    month = get_field(changeset, :month)
    day = get_field(changeset, :day)

    cond do
      is_nil(month) or is_nil(day) ->
        changeset

      valid_month_day?(month, day) ->
        changeset

      true ->
        add_error(changeset, :day, "is not a valid calendar day for that month")
    end
  end

  defp trim_or_nil(nil), do: nil

  defp trim_or_nil(s) when is_binary(s) do
    case String.trim(s) do
      "" -> nil
      t -> t
    end
  end

  defp trim_or_nil(other), do: other

  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime(_), do: nil
end
