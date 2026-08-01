defmodule OpalCore.SocialFlow.IdentifierOwnershipReview do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "identifier_ownership_reviews" do
    field :communication_identifier_id, :binary_id
    field :existing_account_id, :binary_id
    field :claimant_account_id, :binary_id
    field :reason, :string
    field :status, :string, default: "human_review_required"
    field :provider_signal, :string
    field :resolved_at, :utc_datetime_usec
    field :idempotency_key, :string
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :communication_identifier_id,
      :existing_account_id,
      :claimant_account_id,
      :reason,
      :status,
      :provider_signal,
      :resolved_at,
      :idempotency_key
    ])
    |> validate_required([:communication_identifier_id, :reason, :status, :idempotency_key])
    |> validate_inclusion(
      :status,
      ~w(human_review_required recovery_required resolved denied)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "status" => r.status,
      "reason" => r.reason,
      "no_auto_history_grant" => true,
      "not_perfect_reassignment_detection" => true
    }
  end
end
