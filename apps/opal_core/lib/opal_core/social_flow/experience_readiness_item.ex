defmodule OpalCore.SocialFlow.ExperienceReadinessItem do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "experience_readiness_items" do
    field :item_type, :string
    field :description, :string
    field :owner_user_id, :binary_id
    field :status, :string, default: "open"
    field :visibility, :string, default: "shared"
    field :due_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :cancelled_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :experience, OpalCore.SocialFlow.SocialExperience
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(i, attrs) do
    i
    |> cast(attrs, [
      :experience_id,
      :item_type,
      :description,
      :owner_user_id,
      :status,
      :visibility,
      :due_at,
      :completed_at,
      :cancelled_at,
      :idempotency_key
    ])
    |> validate_required([:experience_id, :item_type, :description, :status, :idempotency_key])
    |> validate_inclusion(:status, ~w(open handled completed cancelled))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = i) do
    %{
      "id" => i.id,
      "experience_id" => i.experience_id,
      "item_type" => i.item_type,
      "description" => i.description,
      "owner_user_id" => i.owner_user_id,
      "status" => i.status,
      "visibility" => i.visibility
    }
  end
end
