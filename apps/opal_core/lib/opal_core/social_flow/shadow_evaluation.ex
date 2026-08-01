defmodule OpalCore.SocialFlow.ShadowEvaluation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "shadow_evaluations" do
    field :owner_user_id, :binary_id
    field :candidate_id, :string
    field :eligible, :boolean
    field :suppression_reason, :string
    field :would_surface, :boolean
    field :metadata, :map, default: %{}
    field :evaluated_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(e, attrs) do
    e
    |> cast(attrs, [
      :owner_user_id,
      :candidate_id,
      :eligible,
      :suppression_reason,
      :would_surface,
      :metadata,
      :evaluated_at
    ])
    |> validate_required([
      :owner_user_id,
      :candidate_id,
      :eligible,
      :would_surface,
      :evaluated_at
    ])
  end
end
