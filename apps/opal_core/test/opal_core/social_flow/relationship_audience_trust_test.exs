defmodule OpalCore.SocialFlow.RelationshipAudienceTrustTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper, Repo}

  alias OpalCore.SocialFlow.{
    RelationshipEstablishment,
    RelationshipGraph,
    RelationshipInvitation,
    SocialMomentPublishing,
    SocialMomentVisibility,
    TrustSafety
  }

  setup do
    FixturesHelper.seed!()
    :ok
  end

  # Valid invitation + establishment chain (invitation_id is FK-required).
  defp ensure_establishment!(a, b) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    n = System.unique_integer([:positive])

    inv =
      %RelationshipInvitation{}
      |> RelationshipInvitation.changeset(%{
        inviter_user_id: a,
        intended_recipient_user_id: b,
        status: "accepted",
        purpose: "connect",
        invite_source: "manual",
        expires_at: DateTime.add(now, 7 * 86_400, :second),
        accepted_at: now,
        idempotency_key: "inv-p18-#{a}-#{b}-#{n}"
      })
      |> Repo.insert!()

    %RelationshipEstablishment{}
    |> RelationshipEstablishment.changeset(%{
      invitation_id: inv.id,
      relationship_context_id: Ecto.UUID.generate(),
      conversation_id: Ecto.UUID.generate(),
      participant_ids: [a, b],
      status: "active",
      established_at: now,
      idempotency_key: "est-p18-#{a}-#{b}-#{n}"
    })
    |> Repo.insert!()
  end

  describe "friend authority model" do
    test "contact_match_does_not_imply_friend_access" do
      refute RelationshipGraph.contact_match_implies_friend?()
    end

    test "invite_pending_not_friend" do
      refute RelationshipGraph.invite_pending_grants_friend?()
    end

    test "inference_cannot_expand_audience" do
      refute RelationshipGraph.inference_expands_audience?()
      refute RelationshipGraph.attribution_expands_visibility?()
    end

    test "dyad peers are friends; group-only is not" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()
      # alex-jordan are dyad members via fixtures
      assert RelationshipGraph.friend_visibility_authorized?(alex, jordan)

      # maya and chris are dyad
      maya = Fixtures.user_maya_id()
      chris = Fixtures.user_chris_id()
      assert RelationshipGraph.friend_visibility_authorized?(maya, chris)

      # group friends includes alex+jordan+maya+chris but maya is NOT dyad with taylor
      taylor = Fixtures.user_taylor_id()
      refute RelationshipGraph.friend_visibility_authorized?(maya, taylor)
    end

    test "establishment creates friend authority without dyad" do
      alex = Fixtures.user_alex_id()
      victor = Fixtures.user_victor_id()
      refute RelationshipGraph.friend_visibility_authorized?(alex, victor)

      ensure_establishment!(alex, victor)
      assert RelationshipGraph.friend_visibility_authorized?(alex, victor)
    end

    test "block overrides friend" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()
      assert RelationshipGraph.friend_visibility_authorized?(alex, jordan)

      {:ok, _, :created} =
        TrustSafety.create_block(%{
          blocker_user_id: jordan,
          blocked_user_id: alex,
          scope: "relationship",
          idempotency_key: "p18-blk-#{System.unique_integer([:positive])}"
        })

      refute RelationshipGraph.friend_visibility_authorized?(alex, jordan)
    end
  end

  describe "SOCIAL-14 friends visibility matrix" do
    test "friends moment exact eligibility" do
      founder = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()
      maya = Fixtures.user_maya_id()
      chris = Fixtures.user_chris_id()
      taylor = Fixtures.user_taylor_id()
      victor = Fixtures.user_victor_id()

      # Fixture dyads: alex↔jordan, alex↔taylor. Group-only (chris) is NOT friend.
      # Maya becomes friend only via establishment (not contact/group alone).
      ensure_establishment!(founder, maya)

      {:ok, pub} =
        SocialMomentPublishing.publish(founder, %{
          "caption" => "friends matrix",
          "visibility" => "friends"
        })

      id = pub["moment"]["id"]

      # Author
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, founder)
      # Dyad peers
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, jordan)
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, taylor)
      # Establishment friend
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, maya)
      # Group co-member only — not friend authority
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, chris)
      # Unrelated / no edge
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, victor)
    end
  end

  describe "SOCIAL-15 specific people" do
    test "only explicit user ids" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()
      maya = Fixtures.user_maya_id()
      chris = Fixtures.user_chris_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "specific",
          "visibility" => "specific_people",
          "audience_user_ids" => [jordan, chris]
        })

      id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, jordan)
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, chris)
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, maya)
    end
  end

  describe "SOCIAL-16 group membership" do
    test "only conversation members" do
      alex = Fixtures.user_alex_id()
      group = Fixtures.conv_group_friends_id()
      taylor = Fixtures.user_taylor_id()
      jordan = Fixtures.user_jordan_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "group night",
          "visibility" => "group",
          "group_conversation_id" => group
        })

      id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, jordan)
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, taylor)
    end
  end

  describe "SOCIAL-17 relationship removal" do
    test "removed friend cannot see friends moment" do
      alex = Fixtures.user_alex_id()
      victor = Fixtures.user_victor_id()
      est = ensure_establishment!(alex, victor)

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "before removal",
          "visibility" => "friends"
        })

      id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, victor)

      est
      |> RelationshipEstablishment.changeset(%{status: "ended"})
      |> Repo.update!()

      refute RelationshipGraph.friend_visibility_authorized?(alex, victor)
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, victor)
    end
  end

  describe "SOCIAL-18 audience edit revokes" do
    test "friends to specific_people revokes maya" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()
      maya = Fixtures.user_maya_id()
      ensure_establishment!(alex, maya)

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "edit me",
          "visibility" => "friends"
        })

      id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, maya)

      assert {:ok, edited} =
               SocialMomentPublishing.edit_own(alex, id, %{
                 "visibility" => "specific_people",
                 "audience_user_ids" => [jordan]
               })

      assert edited["visibility"] == "specific_people"
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, jordan)
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, alex)
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, maya)
    end
  end

  describe "SOCIAL-19 moment audience does not leak reality" do
    test "moment viewers do not get automatic reality access" do
      # Architectural: Moment visibility is independent of Reality membership
      # Reality access uses conversation membership, not moment audience
      assert RelationshipGraph.attribution_expands_visibility?() == false
      assert RelationshipGraph.inference_expands_audience?() == false
    end
  end

  describe "SOCIAL-20 private matrix" do
    test "only author sees private moment" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "private only",
          "visibility" => "private"
        })

      id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, alex)
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, jordan)
    end
  end

  describe "media revocation with audience edit" do
    test "audience_edit_revokes_media_access" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()
      maya = Fixtures.user_maya_id()
      ensure_establishment!(alex, maya)

      {:ok, media} =
        SocialMomentPublishing.upload_media(alex, %{
          "base64" =>
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "mime_type" => "image/png"
        })

      mid = media["id"]

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "with media",
          "visibility" => "friends",
          "media_ids" => [mid]
        })

      id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.read_media(mid, maya)

      assert {:ok, _} =
               SocialMomentPublishing.edit_own(alex, id, %{
                 "visibility" => "specific_people",
                 "audience_user_ids" => [jordan]
               })

      assert {:error, :not_found} = SocialMomentPublishing.read_media(mid, maya)
      assert {:ok, _} = SocialMomentPublishing.read_media(mid, jordan)
      assert {:ok, _} = SocialMomentPublishing.read_media(mid, alex)
    end
  end

  describe "historical policy" do
    test "policy is dynamic and explicit" do
      p = RelationshipGraph.historical_access_policy()
      assert p["friends"] == "dynamic_current_edge"
      assert p["removed_friend_loses_old_friends_moments"] == true
      assert p["new_friend_sees_old_friends_moments"] == true
    end

    test "new friend can see older friends moments (dynamic)" do
      alex = Fixtures.user_alex_id()
      victor = Fixtures.user_victor_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "old moment",
          "visibility" => "friends"
        })

      id = pub["moment"]["id"]
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, victor)

      ensure_establishment!(alex, victor)
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, victor)
    end
  end

  describe "friends? default deny" do
    test "missing friends? is deny for friends scope" do
      m = %{
        "author_user_id" => "a",
        "visibility" => "friends",
        "moderation_state" => "active"
      }

      refute SocialMomentVisibility.can_view?(m, "b")
      refute SocialMomentVisibility.can_view?(m, "b", friends?: false)
      assert SocialMomentVisibility.can_view?(m, "b", friends?: true)
    end
  end

  describe "audience preview" do
    test "human labels" do
      assert RelationshipGraph.audience_preview("private")["label"] == "Only me"
      assert RelationshipGraph.audience_preview("friends")["label"] == "Friends"
    end
  end
end
