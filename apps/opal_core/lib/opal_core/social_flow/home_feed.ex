defmodule OpalCore.SocialFlow.HomeFeed do
  @moduledoc """
  Production Home feed composition — eligible SocialMoments as Memory projections.

  Eligibility first (SocialMomentVisibility), ranking second (bounded heuristics).
  Does not inject founder fixtures.
  """

  alias OpalCore.Accounts.User
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    FollowGraph,
    SocialMomentEngagement,
    SocialMomentPublishing,
    TemporaryStoryPublishing
  }

  @doc """
  Compose production Home candidates for viewer.

  Returns normalized feed DTOs — projection only; SocialMoment remains canonical.
  """
  def compose(viewer_user_id, opts \\ []) when is_binary(viewer_user_id) do
    limit = Keyword.get(opts, :limit, 40)
    cursor = Keyword.get(opts, :cursor)

    moments =
      SocialMomentPublishing.list_for_viewer(viewer_user_id, limit: limit * 2)
      |> Enum.map(&SocialMomentEngagement.enrich_moment_contract(&1, viewer_user_id))
      |> Enum.map(&to_feed_card(&1, viewer_user_id))

    ranked = rank(moments, viewer_user_id)

    page =
      case cursor do
        nil -> ranked
        c when is_binary(c) -> Enum.drop_while(ranked, fn card -> card["id"] != c end) |> Enum.drop(1)
        _ -> ranked
      end
      |> Enum.take(limit)

    next_cursor =
      case List.last(page) do
        %{"id" => id} -> id
        _ -> nil
      end

    stories = TemporaryStoryPublishing.list_for_viewer(viewer_user_id, limit: 20)

    %{
      "mode" => "PRODUCTION_HYDRATION",
      "objects" => page,
      "stories" => stories,
      "next_cursor" => next_cursor,
      "has_more" => length(ranked) > length(page),
      "media_status" => SocialMomentPublishing.media_status(),
      "fixture_injected" => false
    }
  end

  defp to_feed_card(moment, viewer_user_id) do
    author_id = moment["author_user_id"]
    name = display_name(author_id)
    media =
      case List.first(moment["media_urls"] || []) do
        url when is_binary(url) and url != "" ->
          url

        _ ->
          case List.first(moment["media_ids"] || []) do
            id when is_binary(id) and id != "" ->
              "/api/v1/product/social-moments/media/#{id}"

            _ ->
              nil
          end
      end

    %{
      "id" => moment["id"],
      "object_type" => "memory",
      "actor" => %{
        "user_id" => author_id,
        "display_name" => name,
        "initial" => String.slice(name || "?", 0, 1)
      },
      "caption" => moment["caption"],
      "created_at" => moment["created_at"],
      "visibility" => moment["visibility"],
      "media_ref" => media,
      "source_lineage_id" => moment["source_lineage_id"],
      "engagement_summary" => %{
        "viewer_liked" => moment["viewer_liked"],
        "like_count" => moment["like_count"],
        "comment_count" => moment["comment_count"],
        "viewer_reposted" => moment["viewer_reposted"],
        "repost_count" => moment["repost_count"],
        "viewer_saved" => moment["viewer_saved"]
      },
      "relationship_context" =>
        if(FollowGraph.following_durable?(viewer_user_id, author_id),
          do: "follow",
          else: "none"
        ),
      "ranking_features" => %{
        "recency_score" => recency_score(moment["created_at"]),
        "engagement_score" => (moment["like_count"] || 0) + (moment["comment_count"] || 0)
      }
    }
  end

  defp rank(cards, viewer_user_id) do
    following = MapSet.new(FollowGraph.durable_following_ids(viewer_user_id))

    cards
    |> Enum.map(fn card ->
      author = get_in(card, ["actor", "user_id"])
      score =
        Map.get(card["ranking_features"] || %{}, "recency_score", 0) +
          Map.get(card["ranking_features"] || %{}, "engagement_score", 0) +
          if(author && MapSet.member?(following, author), do: 20, else: 0)

      {score, card}
    end)
    |> Enum.sort_by(fn {s, _} -> -s end)
    |> Enum.map(fn {_, c} -> c end)
    |> suppress_repeats()
  end

  defp suppress_repeats(cards) do
    Enum.reduce(cards, {[], []}, fn card, {acc, recent} ->
      author = get_in(card, ["actor", "user_id"])
      same = Enum.count(Enum.take(recent, 3), &(&1 == author))

      if same >= 2 do
        {acc ++ [Map.put(card, "_deferred", true)], recent}
      else
        {acc ++ [card], [author | recent]}
      end
    end)
    |> then(fn {with_flags, _} ->
      primary = Enum.reject(with_flags, & &1["_deferred"])
      deferred =
        with_flags
        |> Enum.filter(& &1["_deferred"])
        |> Enum.map(&Map.delete(&1, "_deferred"))

      primary ++ deferred
    end)
  end

  defp recency_score(%DateTime{} = dt) do
    diff = DateTime.diff(DateTime.utc_now(), dt, :hour)
    max(0, 48 - diff)
  end

  defp recency_score(_), do: 0

  defp display_name(nil), do: "Someone"

  defp display_name(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} when is_binary(name) and name != "" -> name
      %User{handle: h} when is_binary(h) and h != "" -> h
      _ -> "Someone"
    end
  end
end
