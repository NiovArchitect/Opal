defmodule OpalCore.SocialFlow.ExperienceFollowUp do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "experience_follow_ups" do
    field :description, :string
    field :visibility, :string, default: "private"
    field :status, :string, default: "open"
    field :due_at, :utc_datetime_usec
    field :source_message_ids, {:array, :binary_id}, default: []
    field :completed_at, :utc_datetime_usec
    field :dismissed_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :experience, OpalCore.SocialFlow.SocialExperience
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(f, attrs) do
    f
    |> cast(attrs, [
      :experience_id,
      :owner_user_id,
      :description,
      :visibility,
      :status,
      :due_at,
      :source_message_ids,
      :completed_at,
      :dismissed_at,
      :idempotency_key
    ])
    |> validate_required([
      :experience_id,
      :owner_user_id,
      :description,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:status, ~w(open completed dismissed))
    |> validate_inclusion(:visibility, ~w(private shared))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = f, viewer_id) do
    base = %{
      "id" => f.id,
      "experience_id" => f.experience_id,
      "status" => f.status,
      "visibility" => f.visibility
    }

    if f.visibility == "shared" or f.owner_user_id == viewer_id do
      Map.merge(base, %{
        "description" => f.description,
        "owner_user_id" => f.owner_user_id
      })
    else
      Map.put(base, "description", "Private follow-up")
    end
  end
end
