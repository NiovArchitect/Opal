defmodule OpalCore.SocialFlow.SafetyAppeal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "safety_appeals" do
    field :report_id, :binary_id
    field :decision_id, :string
    field :reason_category, :string
    field :statement, :string
    field :status, :string, default: "submitted"
    field :outcome, :string
    field :idempotency_key, :string
    field :resolved_at, :utc_datetime_usec
    belongs_to :appellant_user, OpalCore.Accounts.User, foreign_key: :appellant_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(a, attrs) do
    a
    |> cast(attrs, [
      :appellant_user_id,
      :report_id,
      :decision_id,
      :reason_category,
      :statement,
      :status,
      :outcome,
      :idempotency_key,
      :resolved_at
    ])
    |> validate_required([
      :appellant_user_id,
      :decision_id,
      :reason_category,
      :status,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = a) do
    %{
      "id" => a.id,
      "decision_id" => a.decision_id,
      "status" => a.status,
      "outcome" => a.outcome,
      "no_reporter_identity" => true,
      "no_moral_judgment" => true
    }
  end
end
