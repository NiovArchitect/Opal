defmodule OpalCore.SocialFlow.ContactRequestSuspension do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "contact_request_suspensions" do
    field :status, :string, default: "active"
    field :source_report_id, :binary_id
    field :expires_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :actor_user, OpalCore.Accounts.User, foreign_key: :actor_user_id
    belongs_to :target_user, OpalCore.Accounts.User, foreign_key: :target_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(s, attrs) do
    s
    |> cast(attrs, [
      :actor_user_id,
      :target_user_id,
      :status,
      :source_report_id,
      :expires_at,
      :idempotency_key
    ])
    |> validate_required([
      :actor_user_id,
      :target_user_id,
      :status,
      :expires_at,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key)
  end
end
