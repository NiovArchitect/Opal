defmodule OpalCore.SocialFlow.VerificationChallenge do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "verification_challenges" do
    field :communication_identifier_id, :binary_id
    field :purpose, :string
    field :challenge_digest, :string
    field :attempt_count, :integer, default: 0
    field :max_attempts, :integer, default: 5
    field :status, :string, default: "pending"
    field :expires_at, :utc_datetime_usec
    field :used_at, :utc_datetime_usec
    field :locked_at, :utc_datetime_usec
    field :provider_reference, :string
    field :device_label, :string
    field :bound_account_id, :binary_id
    field :idempotency_key, :string
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :communication_identifier_id,
      :purpose,
      :challenge_digest,
      :attempt_count,
      :max_attempts,
      :status,
      :expires_at,
      :used_at,
      :locked_at,
      :provider_reference,
      :device_label,
      :bound_account_id,
      :idempotency_key
    ])
    |> validate_required([
      :communication_identifier_id,
      :purpose,
      :challenge_digest,
      :status,
      :expires_at,
      :idempotency_key
    ])
    |> validate_inclusion(
      :purpose,
      ~w(account_create account_sign_in device_link identifier_add recovery sensitive_change)
    )
    |> validate_inclusion(:status, ~w(pending used expired locked failed))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "purpose" => c.purpose,
      "status" => c.status,
      "max_attempts" => c.max_attempts,
      "attempt_count" => c.attempt_count,
      "no_plaintext_code" => true,
      "not_legal_identity" => true
    }
  end
end
