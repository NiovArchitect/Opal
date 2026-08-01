defmodule OpalCore.SocialFlow.FamilyContext do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "family_contexts" do
    field :label, :string
    field :status, :string, default: "active"
    field :policy_version, :string, default: "sf8-dev-0.1"
    field :legal_disclaimer, :string, default: "dev_fixture_not_certified"
    field :idempotency_key, :string
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(f, attrs) do
    f
    |> cast(attrs, [
      :label,
      :status,
      :policy_version,
      :legal_disclaimer,
      :idempotency_key
    ])
    |> validate_required([:label, :status, :idempotency_key, :legal_disclaimer])
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = f) do
    %{
      "id" => f.id,
      "label" => f.label,
      "status" => f.status,
      "policy_version" => f.policy_version,
      "legal_disclaimer" => f.legal_disclaimer,
      "not_coppa_certified" => true,
      "not_production_youth_shipping" => true,
      "jurisdiction_review_required" => true
    }
  end
end
