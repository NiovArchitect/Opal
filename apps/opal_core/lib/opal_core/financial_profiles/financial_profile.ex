defmodule OpalCore.FinancialProfiles.FinancialProfile do
  @moduledoc """
  Phase RU-3 — user-set spending comfort (not bank data).

  One row per user. Trust-gated at trusted+. Never shared socially.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @allowed_levels ~w(budget moderate comfortable luxury)

  schema "financial_profiles" do
    field :comfort_level, :string
    field :dining_range, :map
    field :activity_range, :map
    field :notes, :string

    belongs_to :user, OpalCore.Accounts.User, foreign_key: :user_id

    timestamps(type: :utc_datetime_usec)
  end

  def allowed_levels, do: @allowed_levels

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:user_id, :comfort_level, :dining_range, :activity_range, :notes])
    |> validate_required([:user_id, :comfort_level])
    |> validate_inclusion(:comfort_level, @allowed_levels)
    |> normalize_range(:dining_range)
    |> normalize_range(:activity_range)
    |> validate_range(:dining_range)
    |> validate_range(:activity_range)
    |> unique_constraint(:user_id)
    |> foreign_key_constraint(:user_id)
  end

  defp normalize_range(changeset, field) do
    case get_change(changeset, field) do
      nil ->
        changeset

      %{} = map ->
        put_change(changeset, field, coerce_range(map))

      _ ->
        add_error(changeset, field, "must be a map with min and max")
    end
  end

  defp coerce_range(map) when is_map(map) do
    min = range_int(Map.get(map, :min) || Map.get(map, "min"))
    max = range_int(Map.get(map, :max) || Map.get(map, "max"))

    cond do
      is_nil(min) and is_nil(max) -> nil
      true -> %{"min" => min, "max" => max}
    end
  end

  defp coerce_range(_), do: nil

  defp range_int(nil), do: nil
  defp range_int(n) when is_integer(n), do: n

  defp range_int(n) when is_binary(n) do
    case Integer.parse(String.trim(n)) do
      {i, ""} -> i
      _ -> nil
    end
  end

  defp range_int(n) when is_float(n), do: trunc(n)
  defp range_int(_), do: nil

  defp validate_range(changeset, field) do
    case get_field(changeset, field) do
      %{"min" => min, "max" => max} when is_integer(min) and is_integer(max) ->
        if min < max do
          changeset
        else
          add_error(changeset, field, "min must be less than max")
        end

      %{"min" => min, "max" => max} when is_nil(min) or is_nil(max) ->
        add_error(changeset, field, "min and max are required together")

      nil ->
        changeset

      _ ->
        add_error(changeset, field, "invalid range")
    end
  end
end
