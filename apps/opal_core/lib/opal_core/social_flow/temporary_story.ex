defmodule OpalCore.SocialFlow.TemporaryStory do
  @moduledoc """
  Temporary Story — Story ≠ Memory. A story may be ANCHORED to a
  Graph (a SharedPlan) without becoming one: Repair #24 WS-2 gives
  the story an optional `graph_plan_id` and a "graph" visibility
  whose audience is exactly that plan's parties (see
  TemporaryStoryPublishing). Unanchored rows are the person stories
  that have always existed.
  Durable enough to survive refresh/device; expires from eligibility.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  # "graph" is writable ONLY by TemporaryStoryPublishing's anchored
  # branch, which sets it together with graph_plan_id after the party
  # check; the person-story create path still accepts only
  # close_circle / friends.
  @visibilities ~w(close_circle friends graph)

  schema "temporary_stories" do
    field :media_ref, :string, default: ""
    field :caption, :string, default: ""
    field :visibility, :string, default: "close_circle"
    field :expires_at, :utc_datetime_usec
    field :deleted_at, :utc_datetime_usec
    belongs_to :author_user, OpalCore.Accounts.User, foreign_key: :author_user_id

    belongs_to :graph_plan, OpalCore.SocialFlow.SharedPlan, foreign_key: :graph_plan_id

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
      :deleted_at,
      :graph_plan_id
    ])
    |> validate_required([:author_user_id, :media_ref, :visibility, :expires_at])
    |> validate_inclusion(:visibility, @visibilities)
    |> foreign_key_constraint(:graph_plan_id)
  end

  def contract(%__MODULE__{} = s, display_name \\ nil) do
    now = DateTime.utc_now()

    # Repair #16: story media stored on the media store is referenced as
    # "media:<id>" in the row. The contract projects the story-scoped served
    # URL (byte access is authorized per-viewer by
    # SocialMomentPublishing.read_media/2 + TemporaryStoryPublishing
    # eligibility) and exposes the raw media id additively. Legacy refs
    # (data:, /, https:) pass through untouched.
    {media_ref, media_id} =
      case s.media_ref do
        "media:" <> id -> {"/api/v1/product/social-moments/media/" <> id, id}
        other -> {other, nil}
      end

    %{
      "id" => s.id,
      "author_user_id" => s.author_user_id,
      "author_name" => display_name || "Someone",
      "media_ref" => media_ref,
      "media_id" => media_id,
      "caption" => s.caption,
      "visibility" => s.visibility,
      "created_at" => s.inserted_at,
      "expires_at" => s.expires_at,
      "expired" => DateTime.compare(s.expires_at, now) != :gt,
      "deleted" => not is_nil(s.deleted_at),
      "object_type" => "story",
      "not_memory" => true,
      # Repair #24 WS-2: the real branch that replaces the old
      # unconditional assertion. A story anchored to a graph carries
      # the plan's id and is not_graph false; a person story carries
      # nil and stays not_graph true, byte-identical to before.
      "graph_plan_id" => Map.get(s, :graph_plan_id),
      "not_graph" => is_nil(Map.get(s, :graph_plan_id)),
      # Repair #24 (WS-1): attention flags, server-computed per
      # viewer from the story-engagement record by
      # TemporaryStoryPublishing.list_for_viewer/2 (the bare
      # contract has no viewer, so it carries the resting
      # defaults; the list read overwrites them with the truth).
      "viewer_mentioned" => false,
      "viewer_has_response" => false
    }
  end
end
