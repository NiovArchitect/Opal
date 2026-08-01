defmodule OpalCore.SocialFlow.ContactResolutionRequest do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "contact_resolution_requests" do
    field :identifier_lookup_digest, :string
    field :local_display_label, :string
    field :purpose, :string, default: "invite"
    field :status, :string, default: "resolved"
    field :outcome, :string
    field :matched_user_id, :binary_id
    field :policy_version, :string, default: "sf10-dev-0.1"
    field :expires_at, :utc_datetime_usec
    field :resolved_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :requester_user, OpalCore.Accounts.User, foreign_key: :requester_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :requester_user_id,
      :identifier_lookup_digest,
      :local_display_label,
      :purpose,
      :status,
      :outcome,
      :matched_user_id,
      :policy_version,
      :expires_at,
      :resolved_at,
      :idempotency_key
    ])
    |> validate_required([
      :requester_user_id,
      :identifier_lookup_digest,
      :purpose,
      :status,
      :outcome,
      :expires_at,
      :idempotency_key
    ])
    |> validate_inclusion(
      :outcome,
      ~w(invite_ready already_connected invitation_pending unavailable blocked policy_restricted)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "outcome" => c.outcome,
      "local_display_label" => c.local_display_label,
      "no_membership_oracle" => true,
      "no_full_address_book" => true
    }
  end
end
