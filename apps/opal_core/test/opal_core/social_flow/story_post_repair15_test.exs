defmodule OpalCore.SocialFlow.StoryPostRepair15Test do
  @moduledoc """
  Repair #15 Track E — Add Story / Add Post end-to-end audience + persistence.

  Fresh randomized accounts per run. Assertions are on real effects:
  DB rows, list/feed eligibility per distinct account, media byte access.

  Bugs covered:
  - E1 close_circle stories were author-only (default audience reached nobody)
  - E2 ttl_hours as a JSON string crashed create; non-positive ttl created a
       born-expired story reported as success
  - E7 publish accepted any media_ids (nonexistent -> 404 feed cards;
       another user's media -> their bytes served to this post's audience)
  - E8 empty posts (no caption, no media) persisted as blank Home cards
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    HomeFeed,
    SocialMomentPublishing,
    SocialMomentRecord,
    TemporaryStory,
    TemporaryStoryPublishing
  }

  @png_b64 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

  setup do
    author = insert_user!("author")
    close = insert_user!("close")
    friend = insert_user!("friend")
    outsider = insert_user!("outsider")

    # Dyad conversations grant friend authority (RelationshipGraph law).
    dyad!(author, close)
    dyad!(author, friend)
    # Close circle: explicit user-set relationship type, either direction (Lives law).
    assert {:ok, _} = Relationships.set_type(author.id, close.id, "close_friend")

    %{author: author, close: close, friend: friend, outsider: outsider}
  end

  describe "story audience (E1)" do
    test "close_circle story reaches close circle, not plain friends or outsiders", ctx do
      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "data:image/png;base64,#{@png_b64}",
                 "visibility" => "close_circle",
                 "caption" => "inner circle only"
               })

      # Real DB row.
      assert %TemporaryStory{} = Repo.get!(TemporaryStory, story["id"])

      ids = fn viewer ->
        Enum.map(TemporaryStoryPublishing.list_for_viewer(viewer.id), & &1["id"])
      end

      assert story["id"] in ids.(ctx.author)
      assert story["id"] in ids.(ctx.close)
      refute story["id"] in ids.(ctx.friend)
      refute story["id"] in ids.(ctx.outsider)
    end

    test "friends story reaches close + friend, not outsider", ctx do
      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "visibility" => "friends"
               })

      ids = fn viewer ->
        Enum.map(TemporaryStoryPublishing.list_for_viewer(viewer.id), & &1["id"])
      end

      assert story["id"] in ids.(ctx.author)
      assert story["id"] in ids.(ctx.close)
      assert story["id"] in ids.(ctx.friend)
      refute story["id"] in ids.(ctx.outsider)
    end

    test "close_circle member via reverse-direction type also eligible", ctx do
      other = insert_user!("reverse")
      dyad!(ctx.author, other)
      # Only the viewer typed the author — Lives law accepts either direction.
      assert {:ok, _} = Relationships.set_type(other.id, ctx.author.id, "family")

      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/food.jpg",
                 "visibility" => "close_circle"
               })

      assert story["id"] in Enum.map(
               TemporaryStoryPublishing.list_for_viewer(other.id),
               & &1["id"]
             )
    end
  end

  describe "story lifecycle validation (E2)" do
    test "string ttl no longer crashes; story is created unexpired", ctx do
      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "visibility" => "friends",
                 "ttl_hours" => "24"
               })

      assert story["expired"] == false
    end

    test "invalid and non-positive ttl are rejected, nothing persists", ctx do
      for ttl <- [0, -3, "abc", 10_000] do
        assert {:error, :invalid_ttl} =
                 TemporaryStoryPublishing.create(ctx.author.id, %{
                   "media_ref" => "/demo/moments/portrait.jpg",
                   "visibility" => "friends",
                   "ttl_hours" => ttl
                 })
      end

      assert Repo.aggregate(TemporaryStory, :count) == 0
    end

    test "unknown visibility is rejected", ctx do
      assert {:error, :invalid_visibility} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "visibility" => "public"
               })
    end

    test "expired story leaves every viewer's list", ctx do
      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "visibility" => "friends"
               })

      past = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:microsecond)

      Repo.get!(TemporaryStory, story["id"])
      |> TemporaryStory.changeset(%{expires_at: past})
      |> Repo.update!()

      refute story["id"] in Enum.map(
               TemporaryStoryPublishing.list_for_viewer(ctx.friend.id),
               & &1["id"]
             )
    end
  end

  describe "post publish (E7/E8)" do
    test "post with own uploaded media persists and lands in the right feeds", ctx do
      assert {:ok, media} =
               SocialMomentPublishing.upload_media(ctx.author.id, %{
                 "base64" => @png_b64,
                 "mime_type" => "image/png"
               })

      assert {:ok, pub} =
               SocialMomentPublishing.publish(ctx.author.id, %{
                 "caption" => "repair15 real post",
                 "visibility" => "friends",
                 "media_ids" => [media["id"]]
               })

      moment_id = pub["moment"]["id"]

      assert %SocialMomentRecord{caption: "repair15 real post"} =
               Repo.get!(SocialMomentRecord, moment_id)

      # Home feed: author + friend see it, outsider does not.
      feed_ids = fn viewer ->
        Enum.map(HomeFeed.compose(viewer.id, limit: 20)["objects"], & &1["id"])
      end

      assert moment_id in feed_ids.(ctx.author)
      assert moment_id in feed_ids.(ctx.friend)
      refute moment_id in feed_ids.(ctx.outsider)

      # Media bytes ride along only for authorized viewers.
      assert {:ok, viewed} = SocialMomentPublishing.get_for_viewer(moment_id, ctx.friend.id)
      assert viewed["media_urls"] != []
      assert {:ok, bin} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)
      assert byte_size(bin) > 32

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(media["id"], ctx.outsider.id)
    end

    test "cannot attach another user's media or nonexistent media", ctx do
      assert {:ok, others_media} =
               SocialMomentPublishing.upload_media(ctx.outsider.id, %{
                 "base64" => @png_b64,
                 "mime_type" => "image/png"
               })

      assert {:error, :invalid_media} =
               SocialMomentPublishing.publish(ctx.author.id, %{
                 "caption" => "stolen media",
                 "visibility" => "friends",
                 "media_ids" => [others_media["id"]]
               })

      assert {:error, :invalid_media} =
               SocialMomentPublishing.publish(ctx.author.id, %{
                 "caption" => "ghost media",
                 "visibility" => "friends",
                 "media_ids" => [Ecto.UUID.generate()]
               })

      assert {:error, :invalid_media} =
               SocialMomentPublishing.publish(ctx.author.id, %{
                 "caption" => "junk media",
                 "visibility" => "friends",
                 "media_ids" => ["not-a-uuid"]
               })

      assert Repo.aggregate(SocialMomentRecord, :count) == 0
    end

    test "empty post is rejected and persists nothing", ctx do
      assert {:error, :empty_post} =
               SocialMomentPublishing.publish(ctx.author.id, %{
                 "caption" => "   ",
                 "visibility" => "friends",
                 "media_ids" => []
               })

      assert Repo.aggregate(SocialMomentRecord, :count) == 0
    end

    test "caption-only post persists and is audience-filtered", ctx do
      assert {:ok, pub} =
               SocialMomentPublishing.publish(ctx.author.id, %{
                 "caption" => "text only, still a post",
                 "visibility" => "private"
               })

      moment_id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(moment_id, ctx.author.id)

      assert {:error, :not_found} =
               SocialMomentPublishing.get_for_viewer(moment_id, ctx.friend.id)
    end
  end

  defp dyad!(a, b) do
    uid = System.unique_integer([:positive])

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "r15-#{uid}-#{Ecto.UUID.generate()}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    conv
  end

  defp insert_user!(tag) do
    uniq = "#{System.unique_integer([:positive])}-#{:rand.uniform(1_000_000)}"

    %User{}
    |> User.changeset(%{handle: "r15#{tag}#{uniq}", display_name: "R15 #{tag} #{uniq}"})
    |> Repo.insert!()
  end
end
