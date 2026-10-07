defmodule OpalCore.Intelligence.Feedback do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "intelligence_feedback" do
    field :actor_id, :binary_id
    field :signal, :string
    field :detail, :map, default: %{}

    belongs_to :decision, OpalCore.Intelligence.Decision
    belongs_to :action, OpalCore.Intelligence.ActionLog, foreign_key: :action_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:decision_id, :action_id, :actor_id, :signal, :detail])
    |> validate_required([:actor_id, :signal])
    |> validate_inclusion(:signal, ~w(accepted dismissed ignored counter_proposed))
  end
end
