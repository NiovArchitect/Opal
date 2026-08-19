defmodule OpalCore.SocialFlow.TemporaryStory do
  @moduledoc """
  Temporary Story — Story ≠ Memory ≠ Graph.
  Durable enough to survive refresh/device; expires from eligibility.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @visibilities ~w(close_circle friends)

  schema "temporary_stories" do
    field :media_ref, :string, default: ""
    field :caption, :string, default: ""
    field :visibility, :string, default: "close_circle"
    field :expires_at, :utc_datetime_usec
    field :deleted_at, :utc_datetime_usec
    belongs_to :author_user, OpalCore.Accounts.User, foreign_key: :author_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :author_user_id,
      :media_ref,
      :caption,
      :visibility,
      :expires_at,
      :deleted_at
    ])
    |> validate_required([:author_user_id, :media_ref, :visibility, :expires_at])
    |> validate_inclusion(:visibility, @visibilities)
  end

  def contract(%__MODULE__{} = s, display_name \\ nil) do
    now = DateTime.utc_now()

    %{
      "id" => s.id,
      "author_user_id" => s.author_user_id,
      "author_name" => display_name || "Someone",
      "media_ref" => s.media_ref,
      "caption" => s.caption,
      "visibility" => s.visibility,
      "created_at" => s.inserted_at,
      "expires_at" => s.expires_at,
      "expired" => DateTime.compare(s.expires_at, now) != :gt,
      "deleted" => not is_nil(s.deleted_at),
      "object_type" => "story",
      "not_memory" => true,
      "not_graph" => true
    }
  end
end
