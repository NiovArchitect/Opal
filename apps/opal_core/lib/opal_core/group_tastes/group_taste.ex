defmodule OpalCore.GroupTastes.GroupTaste do
  @moduledoc """
  Phase D-1 — learned preferences for a group of people who plan together.

  Aggregate only. No individual taste leakage. No compatibility scores.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_tastes" do
    field :group_hash, :string
    # Sorted list of user ids (jsonb array)
    field :member_ids, {:array, :string}
    # %{"lively" => %{"n" => 3, "events" => [iso8601, ...]}}
    field :vibes, :map
    field :cuisines, :map
    field :price_comfort, :string
    # %{"friday" => %{"n" => 4, "events" => [...]}}
    field :temporal_patterns, :map
    field :plan_count, :integer, default: 0
    field :last_plan_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :group_hash,
      :member_ids,
      :vibes,
      :cuisines,
      :price_comfort,
      :temporal_patterns,
      :plan_count,
      :last_plan_at
    ])
    |> validate_required([:group_hash, :member_ids, :plan_count])
    |> validate_length(:group_hash, is: 16)
    |> validate_number(:plan_count, greater_than_or_equal_to: 0)
    |> unique_constraint(:group_hash)
  end
end
