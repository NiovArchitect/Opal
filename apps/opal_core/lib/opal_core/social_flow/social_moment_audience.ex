defmodule OpalCore.SocialFlow.SocialMomentAudience do
  @moduledoc """
  Server-authoritative Social Moment audience resolution (Pass 23).

  Single authority for:
  - HTTP visibility
  - media access eligibility
  - realtime fanout targets

  Consumes RelationshipGraph + TrustSafety via SocialMomentVisibility.
  Does not duplicate friend rules in websocket code.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember

  alias OpalCore.SocialFlow.{
    RelationshipGraph,
    SocialMomentRecord,
    SocialMomentVisibility
  }

  @doc """
  Resolve currently authorized viewer user IDs for a moment (including author).
  """
  def authorized_viewer_ids(%SocialMomentRecord{} = m) do
    author = m.author_user_id
    vis = to_string(m.visibility || "friends")

    viewers =
      case vis do
        "private" ->
          [author]

        "specific_people" ->
          [author | List.wrap(m.audience_user_ids || [])]

        "group" ->
          members = group_member_ids(m.group_conversation_id)
          [author | members]

        "friends" ->
          [author | RelationshipGraph.current_friend_ids(author)]

        _ ->
          [author]
      end

    viewers
    |> Enum.uniq()
    |> Enum.filter(&is_binary/1)
    |> Enum.reject(&RelationshipGraph.safety_blocked?(author, &1))
    # Re-check full visibility path for each candidate
    |> Enum.filter(fn vid ->
      SocialMomentVisibility.can_view?(
        moment_map(m),
        vid,
        viewer_opts(m, vid)
      )
    end)
  end

  def authorized_viewer_ids(moment) when is_map(moment) do
    m = stringify(moment)

    case Repo.get(SocialMomentRecord, m["id"] || m[:id]) do
      %SocialMomentRecord{} = row -> authorized_viewer_ids(row)
      nil -> []
    end
  end

  def authorized_viewer_ids(_), do: []

  @doc "True if viewer is in authorized audience (server authority)."
  def authorized?(moment, viewer_user_id) do
    viewer_user_id in authorized_viewer_ids(moment)
  end

  @doc """
  Human audience preview for publish UI.

  opts: author_user_id, audience_user_ids, audience_labels, group_label, group_count
  """
  def preview(visibility, opts \\ %{}) do
    o = stringify(opts || %{})
    v = to_string(visibility || RelationshipGraph.default_visibility())

    base = RelationshipGraph.audience_preview(v, o)

    human =
      case v do
        "private" ->
          "Only me"

        "friends" ->
          if is_binary(base["subtitle"]), do: "Friends · #{base["subtitle"]}", else: "Friends"

        "specific_people" ->
          labels = List.wrap(o["audience_labels"])

          cond do
            labels != [] -> Enum.join(labels, " + ")
            base["count"] == 0 -> "Selected people"
            base["count"] == 1 -> "1 person"
            true -> "#{base["count"]} people"
          end

        "group" ->
          o["group_label"] || "Group"

        _ ->
          "Only me"
      end

    Map.merge(base, %{
      "visibility" => v,
      "who_can_see" => human,
      "question" => "Who can see this?",
      "technical" => false
    })
  end

  @doc """
  Three-layer consistency for a viewer:

  http_view / media_access / realtime_eligible must agree.
  """
  def layer_consistency(%SocialMomentRecord{} = m, viewer_user_id) do
    opts = viewer_opts(m, viewer_user_id)
    mmap = moment_map(m)
    http = SocialMomentVisibility.can_view?(mmap, viewer_user_id, opts)
    media = SocialMomentVisibility.can_access_media?(mmap, viewer_user_id, opts)
    realtime = viewer_user_id in authorized_viewer_ids(m)

    %{
      "viewer_id" => viewer_user_id,
      "moment_id" => m.id,
      "http_view" => http,
      "media_access" => media,
      "realtime_eligible" => realtime,
      "consistent" => http == media and http == realtime,
      "decision" => if(http, do: "allow", else: "deny")
    }
  end

  # --- internals ---

  defp group_member_ids(nil), do: []

  defp group_member_ids(cid) when is_binary(cid) do
    from(cm in ConversationMember, where: cm.conversation_id == ^cid, select: cm.user_id)
    |> Repo.all()
  end

  defp group_member_ids(_), do: []

  defp viewer_opts(%SocialMomentRecord{} = m, viewer_user_id) do
    [
      friends?: RelationshipGraph.friend_visibility_authorized?(m.author_user_id, viewer_user_id),
      member_of_group?:
        RelationshipGraph.group_visibility_authorized?(m.group_conversation_id, viewer_user_id)
    ]
  end

  defp moment_map(%SocialMomentRecord{} = m) do
    %{
      "id" => m.id,
      "author_user_id" => m.author_user_id,
      "visibility" => m.visibility,
      "audience_user_ids" => m.audience_user_ids,
      "group_conversation_id" => m.group_conversation_id,
      "moderation_state" => m.moderation_state,
      "deleted_at" => m.deleted_at
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
