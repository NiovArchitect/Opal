defmodule OpalCore.Intelligence.DailyMetric do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "intelligence_daily_metrics" do
    field :account_id, :binary_id
    field :day, :date
    field :metrics, :map, default: %{}
    field :alerts, {:array, :string}, default: []

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:account_id, :day, :metrics, :alerts])
    |> validate_required([:day, :metrics])
  end
end
