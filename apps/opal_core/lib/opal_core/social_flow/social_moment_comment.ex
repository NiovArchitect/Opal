defmodule OpalCore.SocialFlow.SocialMomentComment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "social_moment_comments" do
    field :body, :string
    field :deleted_at, :utc_datetime_usec
    belongs_to :moment, OpalCore.SocialFlow.SocialMomentRecord, foreign_key: :moment_id
    belongs_to :author_user, OpalCore.Accounts.User, foreign_key: :author_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:moment_id, :author_user_id, :body, :deleted_at])
    |> validate_required([:moment_id, :author_user_id, :body])
    |> validate_length(:body, min: 1, max: 2000)
  end

  def contract(%__MODULE__{} = c, display_name \\ nil) do
    %{
      "id" => c.id,
      "content_id" => c.moment_id,
      "author_user_id" => c.author_user_id,
      "author_name" => display_name || "Someone",
      "body" => c.body,
      "created_at" => c.inserted_at,
      "deleted" => not is_nil(c.deleted_at)
    }
  end
end
