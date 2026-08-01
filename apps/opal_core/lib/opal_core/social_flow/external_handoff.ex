defmodule OpalCore.SocialFlow.ExternalHandoff do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "external_handoffs" do
    field :provider_id, :string
    field :destination_class, :string, default: "reservation_view"
    field :validated_url, :string
    field :status, :string, default: "ready"
    field :leaving_opal_copy, :string, default: "You are leaving Opal."
    field :opened_at, :utc_datetime_usec
    field :returned_at, :utc_datetime_usec
    field :completed_manually_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :candidate, OpalCore.SocialFlow.ExperienceCandidate
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(h, attrs) do
    h
    |> cast(attrs, [
      :candidate_id,
      :owner_user_id,
      :conversation_id,
      :provider_id,
      :destination_class,
      :validated_url,
      :status,
      :leaving_opal_copy,
      :opened_at,
      :returned_at,
      :completed_manually_at,
      :idempotency_key
    ])
    |> validate_required([
      :candidate_id,
      :owner_user_id,
      :conversation_id,
      :provider_id,
      :validated_url,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(
      :status,
      ~w(ready opened returned completed_manually rejected expired)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = h) do
    %{
      "id" => h.id,
      "candidate_id" => h.candidate_id,
      "provider_id" => h.provider_id,
      "destination_class" => h.destination_class,
      "validated_url" => h.validated_url,
      "status" => h.status,
      "leaving_opal_copy" => h.leaving_opal_copy,
      "reservation_complete" => false,
      "payment_handled" => false
    }
  end
end
