defmodule OpalCore.SocialFlow.SocialMomentEngagementTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    HomeFeed,
    SocialMomentEngagement,
    SocialMomentPublishing,
    TemporaryStoryPublishing
  }

  setup do
    author = insert_user!("author_eng", "Author Eng")
    friend = insert_user!("friend_eng", "Friend Eng")
    stranger = insert_user!("stranger_eng", "Stranger Eng")

    {:ok, pub} =
      SocialMomentPublishing.publish(author.id, %{
        "caption" => "Golden hour with friends",
        "visibility" => "friends",
        "media_ids" => []
      })

    moment_id = pub["moment"]["id"]

    # Private moment for denial tests
    {:ok, priv} =
      SocialMomentPublishing.publish(author.id, %{
        "caption" => "Private only",
        "visibility" => "private",
        "media_ids" => []
      })

    %{
      author: author,
      friend: friend,
      stranger: stranger,
      moment_id: moment_id,
      private_id: priv["moment"]["id"]
    }
  end

  test "like is idempotent and survives reload summary", %{
    author: author,
    moment_id: moment_id
  } do
    assert {:ok, s1} = SocialMomentEngagement.like(author.id, moment_id)
    assert s1["viewer_liked"] == true
    assert s1["like_count"] == 1

    assert {:ok, s2} = SocialMomentEngagement.like(author.id, moment_id)
    assert s2["idempotent"] == true
    assert s2["like_count"] == 1

    assert {:ok, s3} = SocialMomentEngagement.unlike(author.id, moment_id)
    assert s3["viewer_liked"] == false
    assert s3["like_count"] == 0
  end

  test "comment uses session author and lists for authorized viewer", %{
    author: author,
    moment_id: moment_id
  } do
    assert {:ok, %{
             "comment" => comment,
             "comment_count" => 1
           }} =
             SocialMomentEngagement.add_comment(author.id, moment_id, "Looks great")

    assert comment["author_user_id"] == author.id
    assert comment["body"] == "Looks great"

    assert {:ok, %{"comments" => [c], "comment_count" => 1}} =
             SocialMomentEngagement.list_comments(author.id, moment_id)

    assert c["id"] == comment["id"]
  end

  test "unauthorized stranger denied private like/comment", %{
    stranger: stranger,
    private_id: private_id
  } do
    assert {:error, :denied} = SocialMomentEngagement.like(stranger.id, private_id)
    assert {:error, :denied} = SocialMomentEngagement.add_comment(stranger.id, private_id, "hack")
    assert {:error, :denied} = SocialMomentEngagement.list_comments(stranger.id, private_id)
  end

  test "repost denied for private; allowed for friends visibility", %{
    author: author,
    moment_id: moment_id,
    private_id: private_id
  } do
    # Author can view private, but repost is not allowed for private audience.
    assert {:error, :repost_not_allowed} = SocialMomentEngagement.repost(author.id, private_id)

    assert {:ok, r} = SocialMomentEngagement.repost(author.id, moment_id)
    assert r["viewer_reposted"] == true
    assert r["repost_count"] == 1
  end

  test "light roster: only the author learns who lit the moment (R21 W-13/I-2)", %{
    author: author,
    friend: friend,
    stranger: stranger
  } do
    # A moment shared with the friend by name, so the friend is an
    # authorized viewer who is NOT the author.
    {:ok, shared} =
      SocialMomentPublishing.publish(author.id, %{
        "caption" => "Shared by name",
        "visibility" => "specific_people",
        "audience_user_ids" => [friend.id],
        "media_ids" => []
      })

    shared_id = shared["moment"]["id"]

    assert {:ok, _} = SocialMomentEngagement.like(friend.id, shared_id)
    assert {:ok, _} = SocialMomentEngagement.like(author.id, shared_id)

    # The author sees the people, in the order they lit it.
    assert {:ok, roster} = SocialMomentEngagement.light_roster(author.id, shared_id)
    assert roster["author_only_people"] == true
    assert roster["warmth"] == 2
    assert roster["viewer_liked"] == true
    assert Enum.map(roster["people"], & &1["user_id"]) == [friend.id, author.id]
    assert Enum.map(roster["people"], & &1["display_name"]) == ["Friend Eng", "Author Eng"]

    # An authorized non-author gets the warmth and their own state -
    # and NO names: the people list is empty by construction.
    assert {:ok, other} = SocialMomentEngagement.light_roster(friend.id, shared_id)
    assert other["author_only_people"] == false
    assert other["people"] == []
    assert other["warmth"] == 2
    assert other["viewer_liked"] == true

    # A stranger who may not view the moment learns nothing.
    assert {:error, _} = SocialMomentEngagement.light_roster(stranger.id, shared_id)
  end

  test "save is private to viewer", %{author: author, moment_id: moment_id} do
    assert {:ok, %{"viewer_saved" => true}} = SocialMomentEngagement.save(author.id, moment_id)
    assert {:ok, %{"viewer_saved" => false}} = SocialMomentEngagement.unsave(author.id, moment_id)
  end

  test "temporary story survives create and lists until expiry", %{author: author} do
    assert {:ok, story} =
             TemporaryStoryPublishing.create(author.id, %{
               "media_ref" => "/demo/moments/portrait.jpg",
               "visibility" => "close_circle",
               "caption" => "temp"
             })

    assert story["not_memory"] == true
    assert story["not_graph"] == true
    assert story["expired"] == false

    listed = TemporaryStoryPublishing.list_for_viewer(author.id)
    assert Enum.any?(listed, &(&1["id"] == story["id"]))
  end

  test "home feed does not inject fixtures", %{author: author, moment_id: moment_id} do
    feed = HomeFeed.compose(author.id, limit: 20)
    assert feed["mode"] == "PRODUCTION_HYDRATION"
    assert feed["fixture_injected"] == false
    assert Enum.any?(feed["objects"], &(&1["id"] == moment_id))
  end

  defp insert_user!(handle, name) do
    %User{}
    |> User.changeset(%{handle: handle, display_name: name})
    |> Repo.insert!()
  end
end
