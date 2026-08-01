defmodule OpalCore.SocialFlow.DeviceSession do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "device_sessions" do
    field :device_label, :string
    field :session_ref, :string
    field :status, :string, default: "active"
    field :platform, :string, default: "phone"
    field :last_seen_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :revoked_by_user_id, :binary_id
    field :refresh_family, :string
    field :idempotency_key, :string
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(s, attrs) do
    s
    |> cast(attrs, [
      :user_id,
      :device_label,
      :session_ref,
      :status,
      :platform,
      :last_seen_at,
      :revoked_at,
      :revoked_by_user_id,
      :refresh_family,
      :idempotency_key
    ])
    |> validate_required([
      :user_id,
      :device_label,
      :session_ref,
      :status,
      :refresh_family,
      :idempotency_key
    ])
    |> validate_inclusion(:status, ~w(active revoked expired))
    |> unique_constraint(:idempotency_key)
    |> unique_constraint(:session_ref)
  end

  def to_contract(%__MODULE__{} = s) do
    %{
      "id" => s.id,
      "device_label" => s.device_label,
      "status" => s.status,
      "platform" => s.platform,
      "last_seen_at" => s.last_seen_at && DateTime.to_iso8601(s.last_seen_at),
      "no_invasive_fingerprint" => true,
      "human_identity_separate" => true
    }
  end
end
