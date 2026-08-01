defmodule OpalCore.SocialFlow.AccountRecoveryCase do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "account_recovery_cases" do
    field :family_id, :binary_id
    field :proof_class, :string, default: "guardian_session"
    field :proof_token_hash, :string
    field :status, :string, default: "pending"
    field :new_device_label, :string
    field :authority_version, :integer
    field :expires_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :target_user, OpalCore.Accounts.User, foreign_key: :target_user_id
    belongs_to :initiator_user, OpalCore.Accounts.User, foreign_key: :initiator_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :target_user_id,
      :initiator_user_id,
      :family_id,
      :proof_class,
      :proof_token_hash,
      :status,
      :new_device_label,
      :authority_version,
      :expires_at,
      :completed_at,
      :idempotency_key
    ])
    |> validate_required([
      :target_user_id,
      :initiator_user_id,
      :proof_class,
      :status,
      :expires_at,
      :idempotency_key
    ])
    |> validate_inclusion(
      :status,
      ~w(pending approved completed denied expired replayed)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "target_user_id" => c.target_user_id,
      "status" => c.status,
      "proof_class" => c.proof_class,
      "new_device_label" => c.new_device_label,
      "preserves_human_identity" => true,
      "no_security_questions" => true
    }
  end
end
