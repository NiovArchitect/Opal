defmodule OpalCore.SocialFlow.RelationshipInvitation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "relationship_invitations" do
    field :intended_recipient_user_id, :binary_id
    field :intended_identifier_digest, :string
    field :relationship_context_type, :string, default: "adult_1to1"
    field :purpose, :string, default: "connect"
    field :bounded_message, :string
    field :status, :string, default: "sent"
    field :policy_version, :string, default: "sf10-dev-0.1"
    field :source_device_label, :string
    field :delivered_at, :utc_datetime_usec
    field :viewed_at, :utc_datetime_usec
    field :accepted_at, :utc_datetime_usec
    field :declined_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :idempotency_key, :string
    field :share_token_digest, :string
    field :share_token_expires_at, :utc_datetime_usec
    field :local_display_label, :string
    field :invite_source, :string, default: "manual"
    belongs_to :inviter_user, OpalCore.Accounts.User, foreign_key: :inviter_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(i, attrs) do
    i
    |> cast(attrs, [
      :inviter_user_id,
      :intended_recipient_user_id,
      :intended_identifier_digest,
      :relationship_context_type,
      :purpose,
      :bounded_message,
      :status,
      :policy_version,
      :source_device_label,
      :delivered_at,
      :viewed_at,
      :accepted_at,
      :declined_at,
      :revoked_at,
      :expires_at,
      :idempotency_key,
      :share_token_digest,
      :share_token_expires_at,
      :local_display_label,
      :invite_source
    ])
    |> validate_required([:inviter_user_id, :status, :expires_at, :idempotency_key, :purpose])
    |> validate_inclusion(
      :status,
      ~w(draft sent delivered viewed accepted declined expired revoked blocked failed)
    )
    |> validate_inclusion(:invite_source, ~w(manual contacts selected_contact share_link))
    |> unique_constraint(:idempotency_key)
    |> unique_constraint(:share_token_digest)
  end

  def to_contract(%__MODULE__{} = i) do
    %{
      "id" => i.id,
      "status" => i.status,
      "purpose" => i.purpose,
      "relationship_context_type" => i.relationship_context_type,
      "product_status" => product_status(i.status),
      "label" => i.local_display_label,
      "invite_source" => i.invite_source || "manual",
      "no_auto_relationship" => true,
      "silence_not_acceptance" => true,
      "no_full_address_book" => true
    }
  end

  # Neutral product language — never "this person is on Opal".
  def product_status(status) when status in ~w(sent delivered viewed), do: "waiting_for_them"
  def product_status("accepted"), do: "connected"
  def product_status("declined"), do: "declined"
  def product_status("revoked"), do: "revoked"
  def product_status("expired"), do: "expired"
  def product_status("blocked"), do: "unavailable"
  def product_status(_), do: "unavailable"
end
