defmodule OpalCore.SocialFlow.SharedMemoryConsent do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "shared_memory_consents" do
    field :decision, :string, default: "pending"
    field :decided_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :shared_memory, OpalCore.SocialFlow.SharedMemory
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :shared_memory_id,
      :user_id,
      :decision,
      :decided_at,
      :idempotency_key
    ])
    |> validate_required([:shared_memory_id, :user_id, :decision, :idempotency_key])
    |> validate_inclusion(:decision, ~w(pending accept decline not_now))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "shared_memory_id" => c.shared_memory_id,
      "user_id" => c.user_id,
      "decision" => c.decision
    }
  end
end
