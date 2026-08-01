defmodule OpalCore.SocialFlow.RelationshipEstablishment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "relationship_establishments" do
    field :relationship_context_id, :binary_id
    field :conversation_id, :binary_id
    field :participant_ids, {:array, :binary_id}, default: []
    field :status, :string, default: "active"
    field :established_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :invitation, OpalCore.SocialFlow.RelationshipInvitation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(e, attrs) do
    e
    |> cast(attrs, [
      :invitation_id,
      :relationship_context_id,
      :conversation_id,
      :participant_ids,
      :status,
      :established_at,
      :idempotency_key
    ])
    |> validate_required([
      :invitation_id,
      :relationship_context_id,
      :conversation_id,
      :participant_ids,
      :status,
      :established_at,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key)
    |> unique_constraint(:invitation_id)
  end

  def to_contract(%__MODULE__{} = e) do
    %{
      "id" => e.id,
      "conversation_id" => e.conversation_id,
      "status" => e.status,
      "no_historical_messages" => true,
      "no_private_memory_share" => true
    }
  end
end
