defmodule OpalCore.Intelligence.ActionLog do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "intelligence_actions" do
    field :status, :string, default: "pending"
    field :result, :map, default: %{}
    field :attempts, :integer, default: 0
    field :idempotency_key, :string

    belongs_to :decision, OpalCore.Intelligence.Decision

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:decision_id, :status, :result, :attempts, :idempotency_key])
    |> validate_required([:decision_id, :status])
    |> validate_inclusion(:status, ~w(pending ok failed skipped))
    |> unique_constraint(:idempotency_key, name: :intelligence_actions_idempotency_key_index)
  end
end
