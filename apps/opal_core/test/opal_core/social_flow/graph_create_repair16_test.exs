defmodule OpalCore.SocialFlow.GraphCreateRepair16Test do
  @moduledoc """
  Repair #16 W1 — durable GraphCreateFlow completion (non-post graph drafts).

  Before this repair, Graphs / Repeat / plan-from-chat completions landed in
  write-only React state (`createdGraphs`, never read) and vanished. The
  lawful home proved to be the SharedPlan authority Center uses:
  SocialFlow.create_plan_from_graph_create/2 -> conversation-less SharedPlan,
  read back via list_plans_for_user/2 and get_plan_for_user/2.

  Fresh randomized accounts per test. Assertions are on REAL effects:
  DB rows, per-account read-back, source-plan byte identity, row counts
  after adversarial replays.

  Multi-way matrix: drafts are created between participants of different
  relationship types/subtypes (family parent/sibling/cousin/co_parent,
  close_friend, business, acquaintance, friend, partner, none) across all
  entry surfaces (graphs_plus / repeat / chat_plan / contact_plan), with
  varied creation orderings.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    PlanParticipant,
    SharedPlan,
    SocialMomentMedia,
    SocialMomentPublishing
  }

  alias OpalCore.SocialFlow

  @png_b64 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

  defp insert_user!(tag) do
    uniq = "#{System.unique_integer([:positive])}-#{:rand.uniform(1_000_000)}"

    %User{}
    |> User.changeset(%{handle: "r16#{tag}#{uniq}", display_name: "R16 #{tag} #{uniq}"})
    |> Repo.insert!()
  end

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

  defp upload_media!(user) do
    assert {:ok, media} =
             SocialMomentPublishing.upload_media(user.id, %{
               "base64" => @png_b64,
               "mime_type" => "image/png"
             })

    media["id"]
  end

  defp plan_count_for(user_id) do
    Repo.aggregate(
      Ecto.Query.from(p in SharedPlan, where: p.created_by_user_id == ^user_id),
      :count
    )
  end

  defp listed_ids(user_id) do
    {:ok, plans} = SocialFlow.list_plans_for_user(user_id)
    Enum.map(plans, & &1["id"])
  end

  defp base_draft(extra \\ %{}) do
    Map.merge(
      %{
        "title" => "Moonlight paddle",
        "location" => "Moonlight Beach",
        "time_label" => "Saturday - around 6:00 PM",
        "caption" => "Golden hour, for real this time.",
        "audience" => "close_circle",
        "join_requests_on" => true,
        "exact_spot_after_join" => false,
        "entry" => "graphs_plus"
      },
      extra
    )
  end

  describe "durable persistence + read-back" do
    test "draft persists as a SharedPlan with every mapped field, owner reads it back fresh" do
      owner = insert_user!("owner")
      invitee = insert_user!("invitee")
      media_id = upload_media!(owner)

      assert {:ok, plan, participants, false} =
               SocialFlow.create_plan_from_graph_create(
                 owner.id,
                 base_draft(%{
                   "media_id" => media_id,
                   "participant_user_ids" => [invitee.id],
                   "who_label" => invitee.display_name
                 })
               )

      # Real DB row, Center-shaped conversation-less plan authority.
      row = Repo.get!(SharedPlan, plan.id)
      assert row.source == "center"
      assert is_nil(row.conversation_id)
      assert row.status == "tentative"
      assert row.title == "Moonlight paddle"
      assert row.location == "Moonlight Beach"
      assert row.time_label == "Saturday - around 6:00 PM"
      assert row.created_by_user_id == owner.id
      assert row.alignment["origin"] == "graph_create"
      assert row.alignment["entry"] == "graphs_plus"
      assert row.alignment["caption"] == "Golden hour, for real this time."
      assert row.alignment["media_id"] == media_id
      assert row.alignment["audience"] == "close_circle"
      assert row.alignment["join_requests_on"] == true
      assert row.alignment["exact_spot_after_join"] == false
      assert row.alignment["who_label"] == invitee.display_name

      # Participants: creator lead+accepted, invitee pending.
      assert length(participants) == 2
      lead = Enum.find(participants, &(&1.user_id == owner.id))
      assert lead.role == "lead"
      assert lead.response_state == "accepted"
      guest = Enum.find(participants, &(&1.user_id == invitee.id))
      assert guest.role == "participant"
      assert guest.response_state == "pending"

      # Fresh fetch (re-login equivalent): owner + participant read it back
      # through the owner-scoped readers behind Graphs/Timeline.
      assert plan.id in listed_ids(owner.id)
      assert plan.id in listed_ids(invitee.id)
      assert {:ok, fetched} = SocialFlow.get_plan_for_user(plan.id, owner.id)
      assert fetched.id == plan.id
      assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, invitee.id)

      # Contract read-back carries the draft fields (what surfaces render).
      {:ok, plans} = SocialFlow.list_plans_for_user(owner.id)
      contract = Enum.find(plans, &(&1["id"] == plan.id))
      assert contract["caption"] == "Golden hour, for real this time."
      assert contract["media_id"] == media_id
      assert contract["audience"] == "close_circle"
      assert contract["join_requests_on"] == true
      assert contract["exact_spot_after_join"] == false
      assert contract["who_label"] == invitee.display_name
    end

    test "solo draft (no participants) persists and is owner-only" do
      owner = insert_user!("solo")
      outsider = insert_user!("soloout")

      assert {:ok, plan, [_lead], false} =
               SocialFlow.create_plan_from_graph_create(owner.id, base_draft())

      assert plan.id in listed_ids(owner.id)
      refute plan.id in listed_ids(outsider.id)
      assert {:error, :forbidden} = SocialFlow.get_plan_for_user(plan.id, outsider.id)
    end

    test "blank title is rejected and persists nothing (no half-persisted draft)" do
      owner = insert_user!("blank")
      before = plan_count_for(owner.id)

      assert {:error, :invalid_title} =
               SocialFlow.create_plan_from_graph_create(owner.id, base_draft(%{"title" => "  "}))

      assert plan_count_for(owner.id) == before
    end
  end

  describe "cross-account adversarial" do
    test "outsider cannot read, list, or guess the plan; participant cannot be spoofed" do
      owner = insert_user!("xowner")
      invitee = insert_user!("xinvitee")
      outsider = insert_user!("xoutsider")

      assert {:ok, plan, _, false} =
               SocialFlow.create_plan_from_graph_create(
                 owner.id,
                 base_draft(%{"participant_user_ids" => [invitee.id]})
               )

      # Read / list probes.
      assert {:error, :forbidden} = SocialFlow.get_plan_for_user(plan.id, outsider.id)
      refute plan.id in listed_ids(outsider.id)

      # Guessing a random id: not_found, no crash, no leak.
      assert {:error, :not_found} =
               SocialFlow.get_plan_for_user(Ecto.UUID.generate(), outsider.id)

      assert {:error, :not_found} = SocialFlow.get_plan_for_user("not-a-uuid", outsider.id)

      # Outsider creating with the owner as a "participant" does not grant
      # the outsider any read on the owner's plan, and the owner's own list
      # is unchanged in content (the outsider's plan is the outsider's).
      assert {:ok, spoof, _, false} =
               SocialFlow.create_plan_from_graph_create(
                 outsider.id,
                 base_draft(%{"participant_user_ids" => [owner.id], "title" => "Spoof plan"})
               )

      refute spoof.id == plan.id
      assert plan.id in listed_ids(owner.id)
      refute plan.id in listed_ids(outsider.id)
      assert {:error, :forbidden} = SocialFlow.get_plan_for_user(plan.id, outsider.id)
    end

    test "conflicting / wider audiences are rejected honestly, zero rows persisted" do
      owner = insert_user!("aud")

      for audience <- ["friends", "custom", "public", "everyone", ""] do
        draft = base_draft(%{"audience" => audience, "title" => "Aud #{audience}"})
        # "" falls back to the close_circle default; the rest must reject.
        if audience == "" do
          assert {:ok, _, _, false} = SocialFlow.create_plan_from_graph_create(owner.id, draft)
        else
          assert {:error, :unsupported_audience} =
                   SocialFlow.create_plan_from_graph_create(owner.id, draft)
        end
      end

      # Exactly one plan persisted (the default-audience one).
      assert plan_count_for(owner.id) == 1

      # "private" is lawful (owner-scoped) and stays invisible to others.
      other = insert_user!("audother")

      assert {:ok, plan, _, false} =
               SocialFlow.create_plan_from_graph_create(
                 owner.id,
                 base_draft(%{"audience" => "private", "title" => "Just me"})
               )

      assert {:error, :forbidden} = SocialFlow.get_plan_for_user(plan.id, other.id)
      refute plan.id in listed_ids(other.id)
    end

    test "stolen, ghost, deleted, and junk media are all rejected with zero rows" do
      owner = insert_user!("mowner")
      thief_victim = insert_user!("mvictim")
      stolen_media_id = upload_media!(thief_victim)
      own_media_id = upload_media!(owner)

      # Deleted own media must also reject.
      Repo.get!(SocialMomentMedia, own_media_id)
      |> Ecto.Changeset.change(%{
        deleted_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
      |> Repo.update!()

      for bad_media <- [stolen_media_id, Ecto.UUID.generate(), "not-a-uuid", own_media_id] do
        assert {:error, :invalid_media} =
                 SocialFlow.create_plan_from_graph_create(
                   owner.id,
                   base_draft(%{"media_id" => bad_media})
                 ),
               "expected invalid_media for #{inspect(bad_media)}"
      end

      assert plan_count_for(owner.id) == 0
    end

    test "unknown or junk participant ids reject the whole create, zero rows" do
      owner = insert_user!("powner")
      real = insert_user!("preal")

      for bad <- [[Ecto.UUID.generate()], ["junk-id"], [real.id, "junk-id"], [123]] do
        assert {:error, reason} =
                 SocialFlow.create_plan_from_graph_create(
                   owner.id,
                   base_draft(%{"participant_user_ids" => bad})
                 )

        assert reason in [:invalid_participant, :invalid]
      end

      assert plan_count_for(owner.id) == 0
    end
  end

  describe "double-submit / replay" do
    test "same idempotency key replays to exactly one durable object" do
      owner = insert_user!("idem")
      key = "gc-#{Ecto.UUID.generate()}"
      draft = base_draft(%{"idempotency_key" => key})

      assert {:ok, first, _, false} = SocialFlow.create_plan_from_graph_create(owner.id, draft)

      # Replay twice (double-tap + retry): same object, deduplicated.
      assert {:ok, replay1, _, true} = SocialFlow.create_plan_from_graph_create(owner.id, draft)
      assert {:ok, replay2, _, true} = SocialFlow.create_plan_from_graph_create(owner.id, draft)
      assert replay1.id == first.id
      assert replay2.id == first.id
      assert plan_count_for(owner.id) == 1

      # Repair #18 (Division A, F18-06) supersedes the R16 rule that a
      # fresh key alone makes a new plan: identity is the dedupe key
      # (owner + participants + venue + subject + day), so a fresh flow
      # key carrying an IDENTICAL intent returns the survivor as
      # deduplicated. A genuinely new plan must say so (force_new, or a
      # Repeat source_plan_id).
      assert {:ok, same_intent, _, true} =
               SocialFlow.create_plan_from_graph_create(
                 owner.id,
                 base_draft(%{"idempotency_key" => "gc-#{Ecto.UUID.generate()}"})
               )

      assert same_intent.id == first.id
      assert plan_count_for(owner.id) == 1

      assert {:ok, second, _, false} =
               SocialFlow.create_plan_from_graph_create(
                 owner.id,
                 base_draft(%{
                   "idempotency_key" => "gc-#{Ecto.UUID.generate()}",
                   "force_new" => true
                 })
               )

      refute second.id == first.id
      assert plan_count_for(owner.id) == 2

      # The same key under a DIFFERENT account is that account's own plan.
      other = insert_user!("idemother")
      assert {:ok, others, _, false} = SocialFlow.create_plan_from_graph_create(other.id, draft)
      refute others.id == first.id
    end
  end

  describe "repeat" do
    test "repeat creates a NEW plan and leaves the source byte-identical" do
      owner = insert_user!("rowner")
      invitee = insert_user!("rinvitee")

      assert {:ok, source, _, false} =
               SocialFlow.create_plan_from_graph_create(
                 owner.id,
                 base_draft(%{"participant_user_ids" => [invitee.id]})
               )

      source_before = Repo.get!(SharedPlan, source.id)

      source_participants_before =
        Repo.all(
          Ecto.Query.from(pp in PlanParticipant,
            where: pp.plan_id == ^source.id,
            order_by: pp.user_id
          )
        )

      assert {:ok, repeated, _, false} =
               SocialFlow.create_plan_from_graph_create(
                 owner.id,
                 base_draft(%{
                   "title" => "Moonlight paddle, again",
                   "source_plan_id" => source.id,
                   "entry" => "repeat",
                   "time_label" => "Next Saturday - around 6:00 PM"
                 })
               )

      refute repeated.id == source.id
      assert repeated.alignment["repeated_from_plan_id"] == source.id
      assert repeated.title == "Moonlight paddle, again"

      # Source is byte-identical: row + participants untouched.
      assert Repo.get!(SharedPlan, source.id) == source_before

      assert Repo.all(
               Ecto.Query.from(pp in PlanParticipant,
                 where: pp.plan_id == ^source.id,
                 order_by: pp.user_id
               )
             ) == source_participants_before

      # The repeat is the repeater's own plan; the source's invitee is NOT
      # silently carried over (no participant rows copied).
      repeated_participants =
        Repo.all(Ecto.Query.from(pp in PlanParticipant, where: pp.plan_id == ^repeated.id))

      assert Enum.map(repeated_participants, & &1.user_id) == [owner.id]
    end

    test "a participant (not just the creator) may repeat a plan they are part of" do
      owner = insert_user!("prowner")
      invitee = insert_user!("prinvitee")

      assert {:ok, source, _, false} =
               SocialFlow.create_plan_from_graph_create(
                 owner.id,
                 base_draft(%{"participant_user_ids" => [invitee.id]})
               )

      assert {:ok, repeated, _, false} =
               SocialFlow.create_plan_from_graph_create(
                 invitee.id,
                 base_draft(%{"source_plan_id" => source.id, "entry" => "repeat"})
               )

      assert repeated.created_by_user_id == invitee.id
      assert repeated.id != source.id
    end

    test "repeat of someone else's plan fails; missing source fails; nothing persisted" do
      owner = insert_user!("fowner")
      outsider = insert_user!("foutsider")

      assert {:ok, source, _, false} =
               SocialFlow.create_plan_from_graph_create(owner.id, base_draft())

      assert {:error, :forbidden} =
               SocialFlow.create_plan_from_graph_create(
                 outsider.id,
                 base_draft(%{"source_plan_id" => source.id, "entry" => "repeat"})
               )

      assert {:error, :source_plan_not_found} =
               SocialFlow.create_plan_from_graph_create(
                 outsider.id,
                 base_draft(%{"source_plan_id" => Ecto.UUID.generate(), "entry" => "repeat"})
               )

      assert {:error, :source_plan_not_found} =
               SocialFlow.create_plan_from_graph_create(
                 outsider.id,
                 base_draft(%{"source_plan_id" => "seed-graph-123", "entry" => "repeat"})
               )

      assert plan_count_for(outsider.id) == 0
    end
  end

  describe "multi-way matrix: relationship types x entry surfaces x orderings" do
    # {relationship setup, entry surface}
    @matrix [
      {:family_parent, "graphs_plus"},
      {:family_sibling, "repeat"},
      {:family_cousin, "chat_plan"},
      {:family_co_parent, "contact_plan"},
      {:close_friend, "chat_plan"},
      {:business, "graphs_plus"},
      {:acquaintance, "contact_plan"},
      {:friend, "repeat"},
      {:partner, "chat_plan"},
      {:none, "graphs_plus"}
    ]

    defp relate!(owner, other, kind) do
      # A dyad conversation is the relationship substrate (R15 law).
      dyad!(owner, other)

      case kind do
        :family_parent ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "family")
          assert {:ok, _} = Relationships.set_family_subtype(owner.id, other.id, "parent")

        :family_sibling ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "family")
          assert {:ok, _} = Relationships.set_family_subtype(owner.id, other.id, "sibling")

        :family_cousin ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "family")
          assert {:ok, _} = Relationships.set_family_subtype(owner.id, other.id, "cousin")

        :family_co_parent ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "family")
          assert {:ok, _} = Relationships.set_family_subtype(owner.id, other.id, "co_parent")

        :close_friend ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "close_friend")

        :business ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "business")

        :acquaintance ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "acquaintance")

        :friend ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "friend")

        :partner ->
          assert {:ok, _} = Relationships.set_type(owner.id, other.id, "partner")

        :none ->
          :ok
      end
    end

    test "every relationship/entry combination persists, reads back for both parties, hides from outsiders" do
      results =
        for {{kind, entry}, idx} <- Enum.with_index(@matrix) do
          owner = insert_user!("mx#{idx}o")
          other = insert_user!("mx#{idx}p")
          outsider = insert_user!("mx#{idx}x")
          relate!(owner, other, kind)

          draft =
            base_draft(%{
              "entry" => entry,
              "title" => "Matrix plan #{idx}",
              "participant_user_ids" => [other.id],
              "who_label" => other.display_name,
              "idempotency_key" => "gc-matrix-#{idx}-#{Ecto.UUID.generate()}"
            })

          # "repeat" entries repeat the owner's own just-made seed plan to
          # prove the surface works end to end; others create directly.
          draft =
            if entry == "repeat" do
              {:ok, seed, _, false} =
                SocialFlow.create_plan_from_graph_create(owner.id, base_draft())

              Map.put(draft, "source_plan_id", seed.id)
            else
              draft
            end

          assert {:ok, plan, participants, false} =
                   SocialFlow.create_plan_from_graph_create(owner.id, draft),
                 "matrix #{kind}/#{entry} failed to create"

          assert plan.alignment["entry"] == entry
          assert length(participants) == 2
          assert plan.id in listed_ids(owner.id)
          assert plan.id in listed_ids(other.id)
          assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, other.id)
          refute plan.id in listed_ids(outsider.id)
          assert {:error, :forbidden} = SocialFlow.get_plan_for_user(plan.id, outsider.id)

          {kind, entry, plan.id}
        end

      assert length(results) == length(@matrix)
      # All ten plans are distinct durable objects.
      assert results |> Enum.map(&elem(&1, 2)) |> Enum.uniq() |> length() == length(@matrix)
    end

    test "varied ordering: interleaved creates across accounts stay isolated and complete" do
      a = insert_user!("orda")
      b = insert_user!("ordb")
      c = insert_user!("ordc")
      relate!(a, b, :close_friend)
      relate!(b, c, :family_sibling)
      relate!(a, c, :business)

      # Interleave: A->B, B->C, A->C, C->A, B->A (creator order rotates).
      specs = [
        {a, b, "chat_plan"},
        {b, c, "graphs_plus"},
        {a, c, "contact_plan"},
        {c, a, "graphs_plus"},
        {b, a, "chat_plan"}
      ]

      plans =
        for {{creator, guest, entry}, idx} <- Enum.with_index(specs) do
          assert {:ok, plan, _, false} =
                   SocialFlow.create_plan_from_graph_create(
                     creator.id,
                     base_draft(%{
                       "entry" => entry,
                       "title" => "Order plan #{idx}",
                       "participant_user_ids" => [guest.id]
                     })
                   )

          plan
        end

      # Each plan is visible to exactly its creator + its guest.
      everyone = [a, b, c]

      for {plan, {creator, guest, _entry}} <- Enum.zip(plans, specs) do
        for person <- everyone do
          if person.id in [creator.id, guest.id] do
            assert plan.id in listed_ids(person.id)
          else
            refute plan.id in listed_ids(person.id)
          end
        end
      end

      assert a.id |> plan_count_for() == 2
      assert b.id |> plan_count_for() == 2
      assert c.id |> plan_count_for() == 1
    end
  end

  describe "inspired-by seed provenance (Repair #21, I-1)" do
    test "a visible moment seeds a plan whose contract carries the lineage" do
      author = insert_user!("seed-author")
      creator = insert_user!("seed-creator")

      {:ok, pub} =
        SocialMomentPublishing.publish(author.id, %{
          "caption" => "Sunset at the cove",
          "visibility" => "specific_people",
          "audience_user_ids" => [creator.id],
          "media_ids" => []
        })

      moment_id = pub["moment"]["id"]

      assert {:ok, plan, _participants, false} =
               SocialFlow.create_plan_from_graph_create(
                 creator.id,
                 base_draft(%{
                   "title" => "Sunset at the cove, my turn",
                   "inspired_by_moment_id" => moment_id,
                   "entry" => "flows-seed-solo",
                   "audience" => "private"
                 })
               )

      row = Repo.get!(SharedPlan, plan.id)
      assert row.alignment["inspired_by_moment_id"] == moment_id
      assert row.alignment["inspired_by_author_user_id"] == author.id

      # The lineage reads back on the plan contract (participant-scoped).
      {:ok, plans} = SocialFlow.list_plans_for_user(creator.id)
      read_back = Enum.find(plans, &(&1["id"] == plan.id))
      assert read_back["inspired_by_moment_id"] == moment_id
      assert read_back["inspired_by_author_user_id"] == author.id
    end

    test "a moment the creator cannot see seeds nothing" do
      author = insert_user!("seed-hidden-author")
      creator = insert_user!("seed-hidden-creator")

      {:ok, pub} =
        SocialMomentPublishing.publish(author.id, %{
          "caption" => "Not for you",
          "visibility" => "private",
          "media_ids" => []
        })

      moment_id = pub["moment"]["id"]
      before = plan_count_for(creator.id)

      assert {:error, :inspired_source_not_visible} =
               SocialFlow.create_plan_from_graph_create(
                 creator.id,
                 base_draft(%{"inspired_by_moment_id" => moment_id})
               )

      assert {:error, :inspired_source_not_visible} =
               SocialFlow.create_plan_from_graph_create(
                 creator.id,
                 base_draft(%{"inspired_by_moment_id" => "not-a-moment"})
               )

      assert plan_count_for(creator.id) == before
    end
  end
end
