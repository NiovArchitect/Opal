defmodule OpalCore.SocialFlow.AccountLinkRequest do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "account_link_requests" do
    field :primary_account_id, :binary_id
    field :secondary_account_id, :binary_id
    field :proof_state, :string, default: "reauth_confirmed"
    field :review_state, :string, default: "preview"
    field :status, :string, default: "preview"
    field :preview, :map, default: %{}
    field :completed_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :requesting_user, OpalCore.Accounts.User, foreign_key: :requesting_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(a, attrs) do
    a
    |> cast(attrs, [
      :requesting_user_id,
      :primary_account_id,
      :secondary_account_id,
      :proof_state,
      :review_state,
      :status,
      :preview,
      :completed_at,
      :idempotency_key
    ])
    |> validate_required([
      :requesting_user_id,
      :primary_account_id,
      :secondary_account_id,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:status, ~w(preview linked keep_separate cancelled denied))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = a) do
    %{
      "id" => a.id,
      "status" => a.status,
      "preview" => a.preview,
      "prefer_link_not_destructive_merge" => true,
      "no_cross_user_merge" => true
    }
  end
end
