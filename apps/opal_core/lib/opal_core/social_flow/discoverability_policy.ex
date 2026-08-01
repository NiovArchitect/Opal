defmodule OpalCore.SocialFlow.DiscoverabilityPolicy do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "discoverability_policies" do
    field :communication_identifier_id, :binary_id
    field :policy_state, :string, default: "invite_only"
    field :allowed_audiences, {:array, :string}, default: []
    field :version, :integer, default: 1
    field :idempotency_key, :string
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :user_id,
      :communication_identifier_id,
      :policy_state,
      :allowed_audiences,
      :version,
      :idempotency_key
    ])
    |> validate_required([:user_id, :policy_state, :idempotency_key])
    |> validate_inclusion(
      :policy_state,
      ~w(hidden invite_only existing_contacts approved_contexts_only disabled)
    )
    |> unique_constraint(:idempotency_key)
    |> unique_constraint(:user_id)
  end
end
