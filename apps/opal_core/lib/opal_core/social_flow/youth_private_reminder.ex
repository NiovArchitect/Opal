defmodule OpalCore.SocialFlow.YouthPrivateReminder do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "youth_private_reminders" do
    field :body, :string
    field :status, :string, default: "active"
    field :visibility, :string, default: "youth_private"
    field :completed_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :family_id,
      :owner_user_id,
      :body,
      :status,
      :visibility,
      :completed_at,
      :expires_at,
      :idempotency_key
    ])
    |> validate_required([:family_id, :owner_user_id, :body, :status, :idempotency_key])
    |> validate_inclusion(:status, ~w(active completed expired dismissed))
    |> validate_inclusion(:visibility, ~w(youth_private))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "owner_user_id" => r.owner_user_id,
      "body" => r.body,
      "status" => r.status,
      "visibility" => r.visibility,
      "guardian_not_auto_notified" => true,
      "no_behavior_score" => true,
      "no_commercial_use" => true
    }
  end
end
