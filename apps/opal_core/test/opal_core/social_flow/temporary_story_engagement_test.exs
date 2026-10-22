defmodule OpalCore.SocialFlow.TemporaryStoryEngagementTest do
  @moduledoc """
  Repair #24 (WS-1, audit D-M) - the story-engagement record.

  Proven here, on real DB rows and real eligibility:
  - story comments follow the moment-comments law: only viewers
    who can see the story can read or write its comments;
  - a reply is a viewer-to-author response, stamped server-side,
    never listed as a comment, readable only by author + responder;
  - a mention is author-only, target must be story-eligible, and
    the per-viewer attention flags on the story list read are
    computed from these rows and nothing else;
  - story creation with mentioned_user_ids lands mention rows,
    and an ineligible mention target rejects the whole create.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    TemporaryStory,
    TemporaryStoryEngagement,
    TemporaryStoryEngagementRecord,
    TemporaryStoryPublishing
  }

  setup do
    author = insert_user!("author")
    close = insert_user!("close")
    friend = insert_user!("friend")
    outsider = insert_user!("outsider")

    dyad!(author, close)
    dyad!(author, friend)
    assert {:ok, _} = Relationships.set_type(author.id, close.id, "close_friend")

    {:ok, story} =
      TemporaryStoryPublishing.create(author.id, %{
        "media_ref" => "/demo/moments/portrait.jpg",
        "visibility" => "friends",
        "caption" => "for friends"
      })

    {:ok, inner} =
      TemporaryStoryPublishing.create(author.id, %{
        "media_ref" => "/demo/moments/food.jpg",
        "visibility" => "close_circle",
        "caption" => "inner only"
      })

    %{
      author: author,
      close: close,
      friend: friend,
      outsider: outsider,
      story_id: story["id"],
      inner_id: inner["id"]
    }
  end

  test "comments: eligible viewers read and write, outsider learns nothing", ctx do
    assert {:ok, %{"comment" => c, "comment_count" => 1}} =
             TemporaryStoryEngagement.add_comment(ctx.friend.id, ctx.story_id, "Nice light")

    assert c["author_user_id"] == ctx.friend.id
    assert c["kind"] == "comment"
    assert c["story_id"] == ctx.story_id

    assert {:ok, %{"comments" => [listed], "comment_count" => 1}} =
             TemporaryStoryEngagement.list_comments(ctx.author.id, ctx.story_id)

    assert listed["id"] == c["id"]

    assert {:error, :not_found} =
             TemporaryStoryEngagement.list_comments(ctx.outsider.id, ctx.story_id)

    assert {:error, :not_found} =
             TemporaryStoryEngagement.add_comment(ctx.outsider.id, ctx.story_id, "sneak")

    assert {:error, :empty_body} =
             TemporaryStoryEngagement.add_comment(ctx.friend.id, ctx.story_id, "   ")
  end

  test "comments respect close-circle visibility, not just friends", ctx do
    assert {:ok, _} = TemporaryStoryEngagement.add_comment(ctx.close.id, ctx.inner_id, "inner hi")
    assert {:error, :not_found} = TemporaryStoryEngagement.list_comments(ctx.friend.id, ctx.inner_id)
    assert {:ok, %{"comment_count" => 1}} = TemporaryStoryEngagement.list_comments(ctx.close.id, ctx.inner_id)
  end

  test "reply: stamped to the author, not a comment, private to author and responder", ctx do
    assert {:ok, %{"reply" => reply}} =
             TemporaryStoryEngagement.add_reply(ctx.friend.id, ctx.story_id, "Tell me more")

    assert reply["kind"] == "reply"
    assert reply["target_user_id"] == ctx.author.id
    assert reply["actor_user_id"] == ctx.friend.id

    # Never in the comments list.
    assert {:ok, %{"comments" => [], "comment_count" => 0}} =
             TemporaryStoryEngagement.list_comments(ctx.author.id, ctx.story_id)

    # Author reads it; the responder re-reads their own; another
    # eligible viewer (close) reads none of it.
    assert {:ok, %{"replies" => [r]}} = TemporaryStoryEngagement.list_replies(ctx.author.id, ctx.story_id)
    assert r["id"] == reply["id"]
    assert {:ok, %{"replies" => [_]}} = TemporaryStoryEngagement.list_replies(ctx.friend.id, ctx.story_id)
    assert {:ok, %{"replies" => []}} = TemporaryStoryEngagement.list_replies(ctx.close.id, ctx.story_id)
    assert {:error, :not_found} = TemporaryStoryEngagement.list_replies(ctx.outsider.id, ctx.story_id)

    # The author cannot reply to their own story.
    assert {:error, :own_story} =
             TemporaryStoryEngagement.add_reply(ctx.author.id, ctx.story_id, "self reply")
  end

  test "mention: author-only, target must be eligible, idempotent", ctx do
    assert {:ok, %{"mention" => m}} =
             TemporaryStoryEngagement.add_mention(ctx.author.id, ctx.story_id, ctx.friend.id)

    assert m["kind"] == "mention"
    assert m["target_user_id"] == ctx.friend.id

    assert {:ok, %{"idempotent" => true}} =
             TemporaryStoryEngagement.add_mention(ctx.author.id, ctx.story_id, ctx.friend.id)

    assert Repo.aggregate(TemporaryStoryEngagementRecord, :count) == 1

    # A non-author cannot mention anyone in someone else's story.
    assert {:error, :forbidden} =
             TemporaryStoryEngagement.add_mention(ctx.friend.id, ctx.story_id, ctx.close.id)

    # An outsider cannot be mentioned into a story they cannot see.
    assert {:error, :target_not_eligible} =
             TemporaryStoryEngagement.add_mention(ctx.author.id, ctx.story_id, ctx.outsider.id)
  end

  test "attention flags on the story list read come from the record only", ctx do
    flags = fn viewer ->
      TemporaryStoryPublishing.list_for_viewer(viewer.id)
      |> Enum.find(&(&1["id"] == ctx.story_id))
    end

    # Resting truth before any engagement exists.
    assert flags.(ctx.friend)["viewer_mentioned"] == false
    assert flags.(ctx.friend)["viewer_has_response"] == false
    assert flags.(ctx.author)["viewer_has_response"] == false

    assert {:ok, _} = TemporaryStoryEngagement.add_mention(ctx.author.id, ctx.story_id, ctx.friend.id)
    assert {:ok, _} = TemporaryStoryEngagement.add_reply(ctx.friend.id, ctx.story_id, "responding")

    # The mentioned viewer carries the mention flag; the close
    # viewer of the same story does not.
    assert flags.(ctx.friend)["viewer_mentioned"] == true
    assert flags.(ctx.close)["viewer_mentioned"] == false

    # The response involves the responder and the author - both
    # carry it; an uninvolved eligible viewer does not.
    assert flags.(ctx.friend)["viewer_has_response"] == true
    assert flags.(ctx.author)["viewer_has_response"] == true
    assert flags.(ctx.close)["viewer_has_response"] == false

    # A plain comment is NOT a response and earns no flag.
    assert {:ok, _} = TemporaryStoryEngagement.add_comment(ctx.close.id, ctx.story_id, "just a comment")
    assert flags.(ctx.close)["viewer_has_response"] == false
    assert flags.(ctx.close)["viewer_mentioned"] == false
  end

  test "create with mentioned_user_ids lands mention rows; ineligible target rejects all", ctx do
    assert {:ok, story} =
             TemporaryStoryPublishing.create(ctx.author.id, %{
               "media_ref" => "/demo/moments/portrait.jpg",
               "visibility" => "friends",
               "mentioned_user_ids" => [ctx.friend.id]
             })

    assert %TemporaryStory{} = Repo.get!(TemporaryStory, story["id"])

    listed =
      TemporaryStoryPublishing.list_for_viewer(ctx.friend.id)
      |> Enum.find(&(&1["id"] == story["id"]))

    assert listed["viewer_mentioned"] == true

    before = Repo.aggregate(TemporaryStory, :count)

    assert {:error, :invalid_mention} =
             TemporaryStoryPublishing.create(ctx.author.id, %{
               "media_ref" => "/demo/moments/portrait.jpg",
               "visibility" => "friends",
               "mentioned_user_ids" => [ctx.outsider.id]
             })

    assert Repo.aggregate(TemporaryStory, :count) == before
  end

  test "expired story engagement reads as not found", ctx do
    assert {:ok, _} = TemporaryStoryEngagement.add_comment(ctx.friend.id, ctx.story_id, "before expiry")

    past = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:microsecond)

    Repo.get!(TemporaryStory, ctx.story_id)
    |> TemporaryStory.changeset(%{expires_at: past})
    |> Repo.update!()

    assert {:error, :not_found} = TemporaryStoryEngagement.list_comments(ctx.friend.id, ctx.story_id)
    assert {:error, :not_found} = TemporaryStoryEngagement.add_comment(ctx.friend.id, ctx.story_id, "late")
  end

  defp dyad!(a, b) do
    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "r24s-#{Ecto.UUID.generate()}"})
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
    |> User.changeset(%{handle: "r24s#{tag}#{uniq}", display_name: "R24S #{tag} #{uniq}"})
    |> Repo.insert!()
  end
end
