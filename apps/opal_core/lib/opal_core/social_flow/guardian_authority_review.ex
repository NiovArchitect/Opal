defmodule OpalCore.SocialFlow.GuardianAuthorityReview do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "guardian_authority_reviews" do
    field :family_id, :binary_id
    field :target_guardian_user_id, :binary_id
    field :youth_user_id, :binary_id
    field :action, :string, default: "remove_co_guardian"
    field :status, :string, default: "blocked_pending_review"
    field :requires_reauth, :boolean, default: true
    field :reauth_confirmed, :boolean, default: false
    field :authority_version, :integer, default: 1
    field :reason, :string
    field :idempotency_key, :string
    field :resolved_at, :utc_datetime_usec
    belongs_to :requested_by_user, OpalCore.Accounts.User, foreign_key: :requested_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :family_id,
      :requested_by_user_id,
      :target_guardian_user_id,
      :youth_user_id,
      :action,
      :status,
      :requires_reauth,
      :reauth_confirmed,
      :authority_version,
      :reason,
      :idempotency_key,
      :resolved_at
    ])
    |> validate_required([
      :family_id,
      :requested_by_user_id,
      :target_guardian_user_id,
      :youth_user_id,
      :action,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(
      :status,
      ~w(blocked_pending_review human_review_required unsupported approved denied)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "family_id" => r.family_id,
      "action" => r.action,
      "status" => r.status,
      "requires_reauth" => r.requires_reauth,
      "not_custody_adjudication" => true,
      "existing_authority_preserved" =>
        r.status in ~w(blocked_pending_review human_review_required unsupported)
    }
  end
end
