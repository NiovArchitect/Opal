defmodule OpalCore.SocialFlow.SocialMomentLike do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "social_moment_likes" do
    field :status, :string, default: "active"
    belongs_to :moment, OpalCore.SocialFlow.SocialMomentRecord, foreign_key: :moment_id
    belongs_to :viewer_user, OpalCore.Accounts.User, foreign_key: :viewer_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:moment_id, :viewer_user_id, :status])
    |> validate_required([:moment_id, :viewer_user_id, :status])
    |> validate_inclusion(:status, ~w(active revoked))
    |> unique_constraint([:moment_id, :viewer_user_id], name: :social_moment_likes_moment_viewer_index)
  end
end
