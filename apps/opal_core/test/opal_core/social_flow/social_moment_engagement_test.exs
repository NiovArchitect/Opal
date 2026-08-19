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
