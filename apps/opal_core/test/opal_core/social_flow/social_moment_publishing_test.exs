defmodule OpalCore.SocialFlow.SocialMomentPublishingTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.SocialFlow.{SocialMomentPublishing, SocialMomentVisibility, TrustSafety}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  # Tiny 1x1 PNG
  @png_b64 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

  describe "visibility pure properties" do
    test "private_moment_not_fetchable_by_nonviewer" do
      m = %{
        "author_user_id" => "a",
        "visibility" => "private",
        "moderation_state" => "active"
      }

      refute SocialMomentVisibility.can_view?(m, "b")
      assert SocialMomentVisibility.can_view?(m, "a")
    end

    test "block_applies_to_moment_visibility" do
      m = %{
        "author_user_id" => "a",
        "visibility" => "friends",
        "moderation_state" => "active"
      }

      refute SocialMomentVisibility.can_view?(m, "b", blocked?: true, friends?: true)
    end

    test "hide_is_viewer_local" do
      m = %{
        "author_user_id" => "a",
        "visibility" => "friends",
        "moderation_state" => "active"
      }

      refute SocialMomentVisibility.can_view?(m, "b", hidden?: true, friends?: true)
      assert SocialMomentVisibility.can_view?(m, "c", hidden?: false, friends?: true)
    end

    test "publish_does_not_create_notification_or_attribution" do
      refute SocialMomentVisibility.publish_creates_notification?()
      refute SocialMomentVisibility.publish_creates_attribution?()
      refute SocialMomentVisibility.discovery_uses_commission?()
    end

    test "default visibility is not public" do
      assert SocialMomentVisibility.default_visibility() == "friends"
      refute "public" in SocialMomentVisibility.supported_visibilities()
    end
  end

  describe "publishing foundation" do
    test "media status is LOCAL_DEV not production CDN" do
      st = SocialMomentPublishing.media_status()
      assert st["storage"] == "LOCAL_DEV"
      assert st["production_cdn"] == false
      assert st["cdn"] == "LOCAL_DEV"
    end

    test "SOCIAL-08 author publishes authorized Moment" do
      alex = Fixtures.user_alex_id()

      assert {:ok, media} =
               SocialMomentPublishing.upload_media(alex, %{
                 "base64" => @png_b64,
                 "mime_type" => "image/png"
               })

      assert media["exif_stripped"] == true
      assert media["cdn_status"] == "LOCAL_DEV"

      assert {:ok, pub} =
               SocialMomentPublishing.publish(alex, %{
                 "caption" => "little italy nights hit different",
                 "visibility" => "friends",
                 "media_ids" => [media["id"]],
                 "place_ref" => %{
                   "display_name" => "Juniper & Ivy",
                   "provider_place_id" => "places/ChIJ_recorded_juniper",
                   "provider" => "recorded_fixture"
                 }
               })

      assert pub["created_notification"] == false
      assert pub["created_attribution"] == false
      assert pub["moment"]["commerce_led"] == false
      assert pub["moment"]["place_ref"]["bookability"] == "unknown"
      moment_id = pub["moment"]["id"]

      jordan = Fixtures.user_jordan_id()
      assert {:ok, viewed} = SocialMomentPublishing.get_for_viewer(moment_id, jordan)
      assert viewed["caption"] =~ "little italy"
    end

    test "SOCIAL-09 unauthorized viewer denied for private" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "secret",
          "visibility" => "private"
        })

      assert {:error, :not_found} =
               SocialMomentPublishing.get_for_viewer(pub["moment"]["id"], jordan)
    end

    test "SOCIAL-10 group visibility requires membership" do
      alex = Fixtures.user_alex_id()
      group = Fixtures.conv_group_friends_id()
      outsider = Fixtures.user_taylor_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "group night",
          "visibility" => "group",
          "group_conversation_id" => group
        })

      # Jordan is group member via fixtures
      jordan = Fixtures.user_jordan_id()
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(pub["moment"]["id"], jordan)
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(pub["moment"]["id"], outsider)
    end

    test "SOCIAL-11 delete removes public content not downstream reality flag" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "will delete",
          "visibility" => "friends"
        })

      id = pub["moment"]["id"]
      assert {:ok, del} = SocialMomentPublishing.delete_own(alex, id)
      assert del["public_content_removed"] == true
      assert del["downstream_reality_destroyed"] == false
      assert del["source_moment_deleted"] == true
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, jordan)
    end

    test "SOCIAL-12 report hide block semantics distinct" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "report me",
          "visibility" => "friends"
        })

      id = pub["moment"]["id"]

      assert {:ok, h} = SocialMomentPublishing.hide(jordan, id)
      assert h["not_report"] == true
      assert h["not_block"] == true

      assert {:ok, r} = SocialMomentPublishing.report(jordan, id, %{"category" => "spam"})
      assert r["not_auto_delete"] == true
      assert r["not_equal_hide"] == true
      # still published for author
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, alex)
    end

    test "block prevents moment view" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()

      {:ok, _, :created} =
        TrustSafety.create_block(%{
          blocker_user_id: jordan,
          blocked_user_id: alex,
          scope: "relationship",
          idempotency_key: "blk-p17-#{jordan}-#{alex}"
        })

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "blocked viewer",
          "visibility" => "friends"
        })

      assert {:error, :not_found} =
               SocialMomentPublishing.get_for_viewer(pub["moment"]["id"], jordan)
    end

    test "protected media not publicly bypassable without view rights" do
      alex = Fixtures.user_alex_id()
      taylor = Fixtures.user_taylor_id()

      {:ok, media} =
        SocialMomentPublishing.upload_media(alex, %{
          "base64" => @png_b64,
          "mime_type" => "image/png"
        })

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "private pic",
          "visibility" => "specific_people",
          "audience_user_ids" => [Fixtures.user_jordan_id()],
          "media_ids" => [media["id"]]
        })

      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], taylor)
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(pub["moment"]["id"], Fixtures.user_jordan_id())
    end

    test "economics do not affect discovery" do
      refute SocialMomentVisibility.discovery_uses_commission?()
      alex = Fixtures.user_alex_id()

      {:ok, _} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "hello friends",
          "visibility" => "friends"
        })

      list = SocialMomentPublishing.list_for_viewer(Fixtures.user_jordan_id())
      assert is_list(list)
    end
  end
end
