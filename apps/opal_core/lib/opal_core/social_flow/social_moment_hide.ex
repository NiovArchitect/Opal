defmodule OpalCore.SocialFlow.SocialMomentHide do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "social_moment_hides" do
    belongs_to :viewer_user, OpalCore.Accounts.User, foreign_key: :viewer_user_id
    belongs_to :moment, OpalCore.SocialFlow.SocialMomentRecord, foreign_key: :moment_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:viewer_user_id, :moment_id])
    |> validate_required([:viewer_user_id, :moment_id])
    |> unique_constraint([:viewer_user_id, :moment_id])
  end
end
