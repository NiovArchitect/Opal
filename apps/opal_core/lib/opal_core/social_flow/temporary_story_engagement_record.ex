defmodule OpalCore.SocialFlow.TemporaryStoryEngagementRecord do
  @moduledoc """
  One row of story engagement - Repair #24 (WS-1, audit D-M).

  The story surface had NO engagement record at all: the story
  viewer's Reply door opened a direct conversation with the author
  (a conversation resolve, carrying no story id and no message), so
  a story reply left no story-scoped truth anywhere, a story could
  not mention anyone in any record, and story comments had nowhere
  to live. This is the minimal honest record covering all three:

    kind "comment" - a comment on the story by an eligible viewer.
                     Body required. Visible to every eligible viewer
                     of the story (same law as moment comments).
    kind "reply"   - a viewer's response to the story's author.
                     Body required. The server stamps target_user_id
                     as the story author - never client-supplied.
                     Visible only to the responder and the author
                     (it is a response TO the author, not a public
                     comment); it never appears in the comments list.
    kind "mention" - the story AUTHOR mentions a viewer in the
                     story. Actor is always the author; target is
                     the mentioned viewer, who must be eligible to
                     see the story (you cannot mention someone into
                     a story they cannot see). Body optional.

  The rail's ATTENTION trigger reads only this table: a story
  carries viewer_mentioned when a live mention row targets the
  viewer, and viewer_response when a live reply row on the story
  involves the viewer (as responder or as the responded-to
  author). No other field feeds the glow - in particular there is
  no interest field anywhere in the story record, so the
  demonstrated-interest trigger stays unwired (declared).
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @kinds ~w(comment reply mention)

  schema "temporary_story_engagements" do
    field :kind, :string
    field :body, :string
    field :deleted_at, :utc_datetime_usec
    belongs_to :story, OpalCore.SocialFlow.TemporaryStory, foreign_key: :story_id
    belongs_to :actor_user, OpalCore.Accounts.User, foreign_key: :actor_user_id
    belongs_to :target_user, OpalCore.Accounts.User, foreign_key: :target_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def kinds, do: @kinds

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:story_id, :actor_user_id, :target_user_id, :kind, :body, :deleted_at])
    |> validate_required([:story_id, :actor_user_id, :kind])
    |> validate_inclusion(:kind, @kinds)
    |> validate_body()
  end

  defp validate_body(changeset) do
    case get_field(changeset, :kind) do
      kind when kind in ~w(comment reply) ->
        changeset
        |> validate_required([:body])
        |> validate_length(:body, min: 1, max: 2000)

      _ ->
        validate_length(changeset, :body, max: 2000)
    end
  end

  def contract(%__MODULE__{} = e, display_name \\ nil) do
    %{
      "id" => e.id,
      "story_id" => e.story_id,
      "content_id" => e.story_id,
      "kind" => e.kind,
      "author_user_id" => e.actor_user_id,
      "actor_user_id" => e.actor_user_id,
      "target_user_id" => e.target_user_id,
      "author_name" => display_name || "Someone",
      "body" => e.body,
      "created_at" => e.inserted_at,
      "deleted" => not is_nil(e.deleted_at)
    }
  end
end
