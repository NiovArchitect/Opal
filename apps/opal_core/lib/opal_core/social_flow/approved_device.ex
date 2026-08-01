defmodule OpalCore.SocialFlow.ApprovedDevice do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "approved_devices" do
    field :device_label, :string
    field :platform, :string, default: "tablet"
    field :status, :string, default: "pending"
    field :session_ref, :string
    field :approved_by_user_id, :binary_id
    field :approved_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :last_seen_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(d, attrs) do
    d
    |> cast(attrs, [
      :family_id,
      :user_id,
      :device_label,
      :platform,
      :status,
      :session_ref,
      :approved_by_user_id,
      :approved_at,
      :revoked_at,
      :last_seen_at,
      :idempotency_key
    ])
    |> validate_required([:family_id, :user_id, :device_label, :status, :idempotency_key])
    |> validate_inclusion(:status, ~w(pending approved revoked denied))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = d) do
    %{
      "id" => d.id,
      "user_id" => d.user_id,
      "device_label" => d.device_label,
      "platform" => d.platform,
      "status" => d.status,
      "session_ref" => d.session_ref,
      "human_identity_separate" => true,
      "no_cellular_required" => true
    }
  end
end
