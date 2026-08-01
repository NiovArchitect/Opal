defmodule OpalCore.SocialFlow.DiscoveryIntent do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "discovery_intents" do
    field :plan_id, :binary_id
    field :objective_type, :string
    field :source, :string, default: "explicit_request"
    field :status, :string, default: "approved"
    field :source_message_ids, {:array, :binary_id}, default: []
    field :consent_proof_id, :binary_id
    field :idempotency_key, :string
    field :expires_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(i, attrs) do
    i
    |> cast(attrs, [
      :conversation_id,
      :owner_user_id,
      :plan_id,
      :objective_type,
      :source,
      :status,
      :source_message_ids,
      :consent_proof_id,
      :idempotency_key,
      :expires_at,
      :revoked_at
    ])
    |> validate_required([
      :conversation_id,
      :owner_user_id,
      :objective_type,
      :source,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(
      :source,
      ~w(explicit_request capability_enablement approved_prompt)
    )
    |> validate_inclusion(
      :status,
      ~w(proposed approved active completed dismissed expired revoked superseded)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = i) do
    %{
      "id" => i.id,
      "conversation_id" => i.conversation_id,
      "owner_user_id" => i.owner_user_id,
      "plan_id" => i.plan_id,
      "objective_type" => i.objective_type,
      "source" => i.source,
      "status" => i.status
    }
  end
end
