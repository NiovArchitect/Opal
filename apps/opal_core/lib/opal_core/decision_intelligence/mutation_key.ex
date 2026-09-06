defmodule OpalCore.DecisionIntelligence.MutationKey do
  @moduledoc "Idempotency keys for DecisionContext mutations."

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "decision_mutation_keys" do
    field :actor_user_id, :binary_id
    field :idempotency_key, :string
    field :result_revision, :integer
    field :operation, :string

    belongs_to :decision, OpalCore.DecisionIntelligence.DecisionContext, foreign_key: :decision_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:actor_user_id, :idempotency_key, :decision_id, :result_revision, :operation])
    |> validate_required([:actor_user_id, :idempotency_key, :decision_id, :result_revision, :operation])
    |> unique_constraint(:idempotency_key,
      name: :decision_mutation_keys_actor_user_id_idempotency_key_index
    )
  end
end
