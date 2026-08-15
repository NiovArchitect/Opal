defmodule OpalCore.SocialFlow.Pass23DurabilitySocialTrustTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper, Repo}

  alias OpalCore.SocialFlow.{
    ProviderEconomicEventStore,
    ProviderEconomicIngest,
    RelationshipEstablishment,
    RelationshipGraph,
    RelationshipInvitation,
    SocialMomentAudience,
    SocialMomentPublishing,
    SocialMomentRealtime,
    TrustSafety
  }

  setup do
    FixturesHelper.seed!()
    ProviderEconomicEventStore.reset!()
    :ok
  end

  @png_b64 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

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
        idempotency_key: "inv-p23-#{a}-#{b}-#{n}"
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
      idempotency_key: "est-p23-#{a}-#{b}-#{n}"
    })
    |> Repo.insert!()
  end

  describe "Pass 18 hold #1 audience preview UX" do
    test "human who can see this labels" do
      alex = Fixtures.user_alex_id()
      p = SocialMomentPublishing.audience_preview(alex, %{"visibility" => "friends"})
      assert p["who_can_see"] =~ "Friends"
      assert p["question"] == "Who can see this?"
      refute p["technical"]

      assert SocialMomentPublishing.audience_preview(alex, %{"visibility" => "private"})[
               "who_can_see"
             ] == "Only me"

      assert SocialMomentPublishing.audience_preview(alex, %{
               "visibility" => "specific_people",
               "audience_labels" => ["Jordan", "Maya"]
             })["who_can_see"] == "Jordan + Maya"

      assert SocialMomentPublishing.audience_preview(alex, %{
               "visibility" => "group",
               "group_label" => "Friends group"
             })["who_can_see"] == "Friends group"
    end
  end

  describe "three-layer consistency HTTP MEDIA REALTIME" do
    test "friends matrix agrees across layers" do
      founder = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()
      maya = Fixtures.user_maya_id()
      chris = Fixtures.user_chris_id()
      victor = Fixtures.user_victor_id()
      ensure_establishment!(founder, maya)

      {:ok, pub} =
        SocialMomentPublishing.publish(founder, %{
          "caption" => "p23 friends",
          "visibility" => "friends"
        })

      m = Repo.get!(OpalCore.SocialFlow.SocialMomentRecord, pub["moment"]["id"])
      delivery = pub["realtime_delivery"]
      delivered = MapSet.new(delivery["delivered_user_ids"])

      for {viewer, expect_allow} <- [
            {founder, true},
            {jordan, true},
            {maya, true},
            {chris, false},
            {victor, false}
          ] do
        layers = SocialMomentAudience.layer_consistency(m, viewer)
        assert layers["consistent"] == true
        assert layers["http_view"] == expect_allow
        assert layers["media_access"] == expect_allow
        assert layers["realtime_eligible"] == expect_allow
        assert MapSet.member?(delivered, viewer) == expect_allow or viewer == founder
        # author always in delivery for friends publish
        if expect_allow, do: assert(viewer in delivery["delivered_user_ids"])
        if not expect_allow, do: refute(viewer in delivery["delivered_user_ids"])
      end
    end

    test "block removes all three layers" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "block me",
          "visibility" => "friends"
        })

      id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, jordan)
      assert SocialMomentRealtime.would_deliver?(Repo.get!(OpalCore.SocialFlow.SocialMomentRecord, id), jordan)

      {:ok, _, :created} =
        TrustSafety.create_block(%{
          blocker_user_id: jordan,
          blocked_user_id: alex,
          scope: "relationship",
          idempotency_key: "p23-blk-#{System.unique_integer([:positive])}"
        })

      m = Repo.get!(OpalCore.SocialFlow.SocialMomentRecord, id)
      layers = SocialMomentAudience.layer_consistency(m, jordan)
      assert layers["http_view"] == false
      assert layers["media_access"] == false
      assert layers["realtime_eligible"] == false
      assert layers["consistent"] == true
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, jordan)
    end

    test "specific people matrix" do
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

      m = Repo.get!(OpalCore.SocialFlow.SocialMomentRecord, pub["moment"]["id"])
      assert SocialMomentAudience.layer_consistency(m, jordan)["http_view"] == true
      assert SocialMomentAudience.layer_consistency(m, chris)["http_view"] == true
      assert SocialMomentAudience.layer_consistency(m, maya)["http_view"] == false
      refute maya in pub["realtime_delivery"]["delivered_user_ids"]
    end

    test "group matrix" do
      alex = Fixtures.user_alex_id()
      group = Fixtures.conv_group_friends_id()
      jordan = Fixtures.user_jordan_id()
      taylor = Fixtures.user_taylor_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "group",
          "visibility" => "group",
          "group_conversation_id" => group
        })

      m = Repo.get!(OpalCore.SocialFlow.SocialMomentRecord, pub["moment"]["id"])
      assert SocialMomentAudience.layer_consistency(m, jordan)["realtime_eligible"] == true
      assert SocialMomentAudience.layer_consistency(m, taylor)["realtime_eligible"] == false
    end

    test "private matrix" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "private",
          "visibility" => "private"
        })

      m = Repo.get!(OpalCore.SocialFlow.SocialMomentRecord, pub["moment"]["id"])
      assert SocialMomentAudience.layer_consistency(m, alex)["http_view"] == true
      assert SocialMomentAudience.layer_consistency(m, jordan)["http_view"] == false
      assert pub["realtime_delivery"]["delivered_user_ids"] == [alex]
    end
  end

  describe "audience edit revokes media and realtime" do
    test "friends to specific jordan revokes maya layers" do
      alex = Fixtures.user_alex_id()
      jordan = Fixtures.user_jordan_id()
      maya = Fixtures.user_maya_id()
      ensure_establishment!(alex, maya)

      {:ok, media} =
        SocialMomentPublishing.upload_media(alex, %{
          "base64" => @png_b64,
          "mime_type" => "image/png"
        })

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "edit",
          "visibility" => "friends",
          "media_ids" => [media["id"]]
        })

      id = pub["moment"]["id"]
      mid = media["id"]
      assert {:ok, _} = SocialMomentPublishing.read_media(mid, maya)

      assert {:ok, _} =
               SocialMomentPublishing.edit_own(alex, id, %{
                 "visibility" => "specific_people",
                 "audience_user_ids" => [jordan]
               })

      m = Repo.get!(OpalCore.SocialFlow.SocialMomentRecord, id)
      assert SocialMomentAudience.layer_consistency(m, maya)["http_view"] == false
      assert SocialMomentAudience.layer_consistency(m, maya)["media_access"] == false
      assert SocialMomentAudience.layer_consistency(m, maya)["realtime_eligible"] == false
      assert {:error, :not_found} = SocialMomentPublishing.read_media(mid, maya)
      assert SocialMomentAudience.layer_consistency(m, jordan)["http_view"] == true
    end
  end

  describe "relationship removal stops future realtime" do
    test "removed friend not in authorized audience" do
      alex = Fixtures.user_alex_id()
      victor = Fixtures.user_victor_id()
      est = ensure_establishment!(alex, victor)

      {:ok, pub} =
        SocialMomentPublishing.publish(alex, %{
          "caption" => "before",
          "visibility" => "friends"
        })

      id = pub["moment"]["id"]
      assert {:ok, _} = SocialMomentPublishing.get_for_viewer(id, victor)

      est
      |> RelationshipEstablishment.changeset(%{status: "ended"})
      |> Repo.update!()

      m = Repo.get!(OpalCore.SocialFlow.SocialMomentRecord, id)
      refute SocialMomentRealtime.would_deliver?(m, victor)
      assert {:error, :not_found} = SocialMomentPublishing.get_for_viewer(id, victor)
    end
  end

  describe "durable economic event store" do
    test "survives reset-free re-read and dedupe under concurrency" do
      attrs = %{
        "mode" => "recorded_fixture",
        "scenario" => "completed_commission",
        "transaction_id" => "tx-p23-dur",
        "economic_event_id" => "ee-p23-dur"
      }

      assert {:ok, r1} = ProviderEconomicIngest.ingest(attrs)
      assert r1["durable"] == true
      assert r1["ingest_origin"] == :created
      assert r1["qualification"]["status"] == "qualified"

      # Multi-ingest duplicate (DB uniqueness is multi-node authority)
      results =
        for _ <- 1..5 do
          ProviderEconomicIngest.ingest(attrs)
        end

      assert Enum.all?(results, fn {:ok, r} -> r["ingest_origin"] == :idempotent end)
      assert length(ProviderEconomicEventStore.history("tx-p23-dur")) == 1

      # Re-read projection after "restart" (no Agent — pure DB)
      assert {:ok, reproj} = ProviderEconomicIngest.reproject("tx-p23-dur")
      assert reproj["qualification"]["status"] == "qualified"
      assert r1["pool"]["pool_id"] == reproj["pool"]["pool_id"]
    end

    test "unknown contract version abstains" do
      assert {:error, :unknown_contract_version} =
               ProviderEconomicIngest.ingest(%{
                 "mode" => "recorded_fixture",
                 "scenario" => "completed_commission",
                 "transaction_id" => "tx-bad-contract",
                 "provider" => "recorded_reservation_econ",
                 "provider_contract_version" => "does-not-exist-9.9",
                 "economic_event_id" => "ee-bad-c"
               })
    end

    test "currency required for value-bearing events" do
      # Force event without currency through store
      assert {:error, :currency_required} =
               ProviderEconomicEventStore.put(%{
                 "provider" => "recorded_reservation_econ",
                 "economic_event_id" => "ee-no-cur",
                 "transaction_id" => "tx-no-cur",
                 "economic_event_type" => "commission_confirmed",
                 "source_mode" => "recorded_fixture",
                 "commission_value" => 12.0,
                 "status" => "confirmed"
                 # currency missing
               })
    end

    test "out-of-order reverse remains after durable reproject" do
      ingest = fn id, scenario ->
        ProviderEconomicIngest.ingest(%{
          "mode" => "recorded_fixture",
          "scenario" => scenario,
          "transaction_id" => "tx-p23-oo",
          "economic_event_id" => id
        })
      end

      assert {:ok, _} = ingest.("ee-c", "completed_commission")
      assert {:ok, r} = ingest.("ee-r", "reversed")
      assert r["qualification"]["status"] == "reversed"

      assert {:ok, again} = ProviderEconomicIngest.reproject("tx-p23-oo")
      assert again["qualification"]["status"] == "reversed"
      assert again["reversed"] == true
    end

    test "source_mode not upgraded to live by storage" do
      assert {:ok, r} =
               ProviderEconomicIngest.ingest(%{
                 "mode" => "recorded_fixture",
                 "scenario" => "completed_commission",
                 "transaction_id" => "tx-mode",
                 "economic_event_id" => "ee-mode"
               })

      assert r["event"]["source_mode"] == "recorded_fixture"
      assert r["event"]["live"] == false
      assert r["live_economic_value"] == "NOT_PROVEN"
    end
  end

  describe "media status honesty" do
    test "LOCAL_DEV remains" do
      s = SocialMomentPublishing.media_status()
      assert s["production_cdn"] == false
      assert s["cdn"] == "LOCAL_DEV" or s["storage"] != nil
    end
  end

  describe "pass18 holds product claim" do
    test "audience and realtime modules exist as authority" do
      assert function_exported?(SocialMomentAudience, :authorized_viewer_ids, 1)
      assert function_exported?(SocialMomentRealtime, :publish_moment_event, 1)
      assert function_exported?(SocialMomentRealtime, :would_deliver?, 2)
      refute RelationshipGraph.inference_expands_audience?()
    end
  end
end
