defmodule OpalCore.SocialFlow.StoryMediaRepair16Test do
  @moduledoc """
  Repair #16 W5 (B2) — story media on the media store with story-scoped
  byte authorization.

  Fresh randomized accounts per run. Assertions are on REAL effects:
  DB rows (stored ref is "media:<id>", never an inline image data: URL for
  uploaded media), per-viewer byte-serving outcomes across the full
  audience matrix, and denials for the adversarial set (outsider,
  signed-out, blocked, former friend, expired/deleted story, cross-user
  media attach, tampered refs, junk ids).

  Video stories are out of scope by founder order: their inline refs stay
  exactly as they were (asserted below, unchanged behavior).
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    SocialMomentMedia,
    SocialMomentPublishing,
    TemporaryStory,
    TemporaryStoryPublishing,
    TrustSafety
  }

  @png_b64 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  @png_bytes Base.decode64!(@png_b64)

  setup do
    author = insert_user!("author")
    friend = insert_user!("friend")
    outsider = insert_user!("outsider")
    friend_conv = dyad!(author, friend)

    %{
      author: author,
      friend: friend,
      outsider: outsider,
      friend_conv: friend_conv
    }
  end

  # --- helpers -------------------------------------------------------------

  defp upload!(user_id) do
    assert {:ok, media} =
             SocialMomentPublishing.upload_media(user_id, %{
               "base64" => @png_b64,
               "mime_type" => "image/png"
             })

    media
  end

  defp create_story!(author_id, media_id, visibility) do
    assert {:ok, story} =
             TemporaryStoryPublishing.create(author_id, %{
               "media_id" => media_id,
               "visibility" => visibility,
               "caption" => "r16 story"
             })

    story
  end

  defp typed_viewer!(author, tag, type) do
    viewer = insert_user!(tag)
    dyad!(author, viewer)
    assert {:ok, _} = Relationships.set_type(author.id, viewer.id, type)
    viewer
  end

  # --- create path ---------------------------------------------------------

  describe "story create with media-store image (B2)" do
    test "stores media:<id> in the row, contract serves the media URL", ctx do
      media = upload!(ctx.author.id)
      story = create_story!(ctx.author.id, media["id"], "friends")

      row = Repo.get!(TemporaryStory, story["id"])
      assert row.media_ref == "media:" <> media["id"]
      refute String.starts_with?(row.media_ref, "data:")

      assert story["media_id"] == media["id"]
      assert story["media_ref"] == "/api/v1/product/social-moments/media/" <> media["id"]

      # List projection (rail) carries the same served URL.
      listed = TemporaryStoryPublishing.list_for_viewer(ctx.friend.id)
      item = Enum.find(listed, &(&1["id"] == story["id"]))
      assert item["media_ref"] == "/api/v1/product/social-moments/media/" <> media["id"]
      assert item["media_id"] == media["id"]
    end

    test "media:<id> media_ref form is accepted and normalized identically", ctx do
      media = upload!(ctx.author.id)

      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "media:" <> media["id"],
                 "visibility" => "friends"
               })

      assert Repo.get!(TemporaryStory, story["id"]).media_ref == "media:" <> media["id"]
      assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)
    end

    test "legacy data: story is untouched: row and contract keep the inline ref", ctx do
      data_ref = "data:image/png;base64,#{@png_b64}"

      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => data_ref,
                 "visibility" => "friends"
               })

      assert Repo.get!(TemporaryStory, story["id"]).media_ref == data_ref
      assert story["media_ref"] == data_ref
      assert story["media_id"] == nil
    end

    test "video story keeps legacy inline storage exactly as before (out of scope)", ctx do
      video_ref = "data:video/mp4;base64,AAAA"

      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => video_ref,
                 "visibility" => "friends"
               })

      assert Repo.get!(TemporaryStory, story["id"]).media_ref == video_ref
      assert story["media_id"] == nil
    end
  end

  # --- audience matrix: real byte effects ----------------------------------

  describe "byte serving across the audience matrix" do
    test "close_circle: spouse/partner/close_friend/family(+every subtype) served; plain friend and outsider denied",
         ctx do
      media = upload!(ctx.author.id)
      _story = create_story!(ctx.author.id, media["id"], "close_circle")

      served =
        for type <- ~w(spouse partner close_friend) do
          viewer = typed_viewer!(ctx.author, "cc-#{type}", type)
          assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], viewer.id)
          type
        end

      family_served =
        for subtype <- OpalCore.Relationships.FamilySubtype.all() do
          viewer = insert_user!("fam-#{subtype}")
          dyad!(ctx.author, viewer)
          assert {:ok, _} = Relationships.set_type(ctx.author.id, viewer.id, "family")
          assert {:ok, _} = Relationships.set_family_subtype(ctx.author.id, viewer.id, subtype)
          assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], viewer.id)
          subtype
        end

      # Author reads own; plain friend is NOT close circle; outsider denied.
      assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], ctx.author.id)

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(media["id"], ctx.friend.id)

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(media["id"], ctx.outsider.id)

      # Counts for the TEST_REPORT: 3 typed + 8 family subtypes served.
      assert length(served) == 3
      assert length(family_served) == 8
    end

    test "friends: friend and close-circle member served, outsider denied", ctx do
      media = upload!(ctx.author.id)
      _story = create_story!(ctx.author.id, media["id"], "friends")
      close = typed_viewer!(ctx.author, "fr-close", "close_friend")

      assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)
      assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], close.id)
      assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], ctx.author.id)

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(media["id"], ctx.outsider.id)
    end

    test "multiple stories per author: each story's audience governs only its own media",
         ctx do
      media_friends = upload!(ctx.author.id)
      media_close = upload!(ctx.author.id)
      _s1 = create_story!(ctx.author.id, media_friends["id"], "friends")
      _s2 = create_story!(ctx.author.id, media_close["id"], "close_circle")
      close = typed_viewer!(ctx.author, "multi-close", "partner")

      # Plain friend: friends-story media yes, close-story media no.
      assert {:ok, _} = SocialMomentPublishing.read_media(media_friends["id"], ctx.friend.id)

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(media_close["id"], ctx.friend.id)

      # Close-circle member: both.
      assert {:ok, _} = SocialMomentPublishing.read_media(media_friends["id"], close.id)
      assert {:ok, _} = SocialMomentPublishing.read_media(media_close["id"], close.id)
    end

    test "ordering: upload after a rejected create attempt still works; replayed create serves same bytes, no stale media",
         ctx do
      # Failed attempt first (junk media id) persists nothing.
      assert {:error, :invalid_media} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_id" => Ecto.UUID.generate(),
                 "visibility" => "friends"
               })

      assert Repo.aggregate(TemporaryStory, :count) == 0

      media = upload!(ctx.author.id)
      s1 = create_story!(ctx.author.id, media["id"], "friends")
      # Replay of the same create: a second story row, same media, same bytes.
      s2 = create_story!(ctx.author.id, media["id"], "friends")
      assert s1["id"] != s2["id"]
      assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)

      # Re-upload of identical bytes is a DISTINCT media row serving its own bytes.
      media2 = upload!(ctx.author.id)
      assert media2["id"] != media["id"]
      _s3 = create_story!(ctx.author.id, media2["id"], "friends")
      assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media2["id"], ctx.friend.id)
    end
  end

  # --- adversarial ----------------------------------------------------------

  describe "adversarial byte-access probes" do
    test "signed-out and junk-id reads are clean denials, never crashes", ctx do
      media = upload!(ctx.author.id)
      _story = create_story!(ctx.author.id, media["id"], "friends")

      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], nil)
      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], "")
      assert {:error, :not_found} = SocialMomentPublishing.read_media("not-a-uuid", ctx.friend.id)
      assert {:error, :not_found} = SocialMomentPublishing.read_media(nil, ctx.friend.id)

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(Ecto.UUID.generate(), ctx.friend.id)
    end

    test "blocked viewer is denied even with a close-circle type", ctx do
      media = upload!(ctx.author.id)
      _story = create_story!(ctx.author.id, media["id"], "close_circle")
      close = typed_viewer!(ctx.author, "blocked-close", "close_friend")

      assert {:ok, _} = SocialMomentPublishing.read_media(media["id"], close.id)

      _ = TrustSafety.create_block(%{blocker_user_id: ctx.author.id, blocked_user_id: close.id})

      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], close.id)
    end

    test "former friend (dyad revoked after create) is denied", ctx do
      media = upload!(ctx.author.id)
      _story = create_story!(ctx.author.id, media["id"], "friends")

      assert {:ok, _} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)

      # Revoke the friendship substrate: remove the dyad memberships.
      from(m in ConversationMember,
        where: m.conversation_id == ^ctx.friend_conv.id
      )
      |> Repo.delete_all()

      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)
    end

    test "close-circle type cleared after create revokes byte access", ctx do
      media = upload!(ctx.author.id)
      _story = create_story!(ctx.author.id, media["id"], "close_circle")
      close = typed_viewer!(ctx.author, "revoked-close", "family")

      assert {:ok, _} = SocialMomentPublishing.read_media(media["id"], close.id)

      assert {:ok, _} = Relationships.set_type(ctx.author.id, close.id, "friend")

      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], close.id)
    end

    test "expired story's media is denied to viewers", ctx do
      media = upload!(ctx.author.id)
      story = create_story!(ctx.author.id, media["id"], "friends")

      assert {:ok, _} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)

      past = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:microsecond)

      Repo.get!(TemporaryStory, story["id"])
      |> TemporaryStory.changeset(%{expires_at: past})
      |> Repo.update!()

      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)
    end

    test "deleted story's media is denied to viewers", ctx do
      media = upload!(ctx.author.id)
      story = create_story!(ctx.author.id, media["id"], "friends")

      assert {:ok, _} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)
      assert :ok = TemporaryStoryPublishing.delete_own(ctx.author.id, story["id"])
      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], ctx.friend.id)
    end

    test "cross-user media attach is rejected in every form, nothing persists", ctx do
      others_media = upload!(ctx.outsider.id)

      for attrs <- [
            %{"media_id" => others_media["id"], "visibility" => "friends"},
            %{"media_ref" => "media:" <> others_media["id"], "visibility" => "friends"},
            %{"media_id" => Ecto.UUID.generate(), "visibility" => "friends"},
            %{"media_id" => "not-a-uuid", "visibility" => "friends"},
            %{"media_ref" => "media:not-a-uuid", "visibility" => "friends"}
          ] do
        assert {:error, :invalid_media} =
                 TemporaryStoryPublishing.create(ctx.author.id, attrs)
      end

      assert Repo.aggregate(TemporaryStory, :count) == 0
    end

    test "deleted media cannot be attached to a story", ctx do
      media = upload!(ctx.author.id)
      row = Repo.get!(SocialMomentMedia, media["id"])
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      row
      |> SocialMomentMedia.changeset(%{deleted_at: now})
      |> Repo.update!()

      assert {:error, :invalid_media} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_id" => media["id"],
                 "visibility" => "friends"
               })

      assert Repo.aggregate(TemporaryStory, :count) == 0
    end

    test "tampered row pointing at another user's media never serves bytes", ctx do
      # A row written out-of-band (bypassing create validation) that claims
      # the outsider's media as the author's story media: the byte path
      # requires story author == media owner, so the eligible friend of the
      # author still gets nothing.
      others_media = upload!(ctx.outsider.id)

      expires =
        DateTime.utc_now() |> DateTime.add(3600, :second) |> DateTime.truncate(:microsecond)

      %TemporaryStory{}
      |> TemporaryStory.changeset(%{
        author_user_id: ctx.author.id,
        media_ref: "media:" <> others_media["id"],
        caption: "tampered",
        visibility: "friends",
        expires_at: expires
      })
      |> Repo.insert!()

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(others_media["id"], ctx.friend.id)
    end

    test "media referenced by no story and no moment serves only its owner", ctx do
      media = upload!(ctx.author.id)

      assert {:ok, @png_bytes} = SocialMomentPublishing.read_media(media["id"], ctx.author.id)

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(media["id"], ctx.friend.id)
    end
  end

  # --- fixtures (same pattern as story_post_repair15_test) ------------------

  defp dyad!(a, b) do
    uid = System.unique_integer([:positive])

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "r16-#{uid}-#{Ecto.UUID.generate()}"})
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
    |> User.changeset(%{handle: "r16#{tag}#{uniq}", display_name: "R16 #{tag} #{uniq}"})
    |> Repo.insert!()
  end
end
