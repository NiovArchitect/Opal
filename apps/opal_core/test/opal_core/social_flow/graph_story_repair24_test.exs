defmodule OpalCore.SocialFlow.GraphStoryRepair24Test do
  @moduledoc """
  Repair #24 WS-2 — graph-story POSTING, the real server path.

  Before this repair, TemporaryStory had no graph reference and its
  contract asserted "not_graph" => true for every story: a story could
  be PLAYED as a graph piece in the viewer (same 24h law, pinned by
  the web storytime suite) but could never be POSTED anchored to a
  graph.

  Law pinned here:
  - A story may be anchored to a SharedPlan (a graph) the author is a
    party to. Parties are exactly the plan-media precedent
    (SharedPlan.plan_media_authorized?/2): the plan's creator plus its
    PlanParticipant rows. Friendship / close-circle standing with the
    author is NOT party standing.
  - A graph story is visible to exactly the graph's parties: the
    anchor overrides the person-story visibility branches.
  - A non-party cannot post to the graph (rejected, nothing persists)
    and cannot read the story - including its media bytes.
  - The SAME 24h expiry law applies unchanged.
  - The person-story path is unchanged: no anchor, "not_graph" true,
    person visibility branches exactly as before.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{SocialMomentPublishing, TemporaryStory, TemporaryStoryPublishing}

  @png_b64 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

  setup do
    author = insert_user!("author")
    party = insert_user!("party")
    pal = insert_user!("pal")
    outsider = insert_user!("outsider")

    # pal is the author's close friend (dyad = friend authority, plus
    # an explicit close_friend type) but is NOT a party to the graph.
    # This is the discriminating case: person-story audiences reach
    # pal; graph stories must not.
    dyad!(author, pal)
    assert {:ok, _} = Relationships.set_type(author.id, pal.id, "close_friend")

    assert {:ok, plan, participants, false} =
             SocialFlow.create_plan_from_graph_create(author.id, %{
               "title" => "Graph story paddle #{System.unique_integer([:positive])}",
               "location" => "Moonlight Beach",
               "time_label" => "Saturday - around 6:00 PM",
               "participant_user_ids" => [party.id]
             })

    assert Enum.any?(participants, &(&1.user_id == author.id))
    assert Enum.any?(participants, &(&1.user_id == party.id))

    %{author: author, party: party, pal: pal, outsider: outsider, plan: plan}
  end

  describe "posting a graph story" do
    test "a party author posts a story anchored to the graph", ctx do
      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "visibility" => "friends",
                 "caption" => "for the paddle graph",
                 "graph_plan_id" => ctx.plan.id
               })

      assert story["graph_plan_id"] == ctx.plan.id
      assert story["not_graph"] == false
      assert story["not_memory"] == true
      assert story["object_type"] == "story"
      # The stored audience is the graph itself, never the person
      # visibility the client happened to send alongside the anchor.
      assert story["visibility"] == "graph"
      assert story["expired"] == false

      row = Repo.get!(TemporaryStory, story["id"])
      assert row.graph_plan_id == ctx.plan.id
      assert row.visibility == "graph"

      # Same 24h law: expiry is ~24h out, exactly as a person story.
      seconds = DateTime.diff(row.expires_at, DateTime.utc_now(), :second)
      assert seconds > 23 * 3600 and seconds <= 24 * 3600
    end

    test "the plan_id alias anchors the same way", ctx do
      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "plan_id" => ctx.plan.id
               })

      assert story["graph_plan_id"] == ctx.plan.id
      assert story["not_graph"] == false
    end

    test "a participant (not the creator) can also post to the graph", ctx do
      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.party.id, %{
                 "media_ref" => "/demo/moments/food.jpg",
                 "graph_plan_id" => ctx.plan.id
               })

      assert story["author_user_id"] == ctx.party.id
      assert story["id"] in listed_ids(ctx.author)
      assert story["id"] in listed_ids(ctx.party)
      refute story["id"] in listed_ids(ctx.pal)
    end

    test "a non-party cannot post to the graph - rejected, nothing persists", ctx do
      for non_party <- [ctx.pal, ctx.outsider] do
        assert {:error, :not_graph_party} =
                 TemporaryStoryPublishing.create(non_party.id, %{
                   "media_ref" => "/demo/moments/portrait.jpg",
                   "graph_plan_id" => ctx.plan.id
                 })
      end

      assert Repo.aggregate(TemporaryStory, :count) == 0
    end

    test "an unknown or junk graph id is rejected, nothing persists", ctx do
      assert {:error, :graph_not_found} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "graph_plan_id" => Ecto.UUID.generate()
               })

      assert {:error, :graph_not_found} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "graph_plan_id" => "not-a-uuid"
               })

      assert Repo.aggregate(TemporaryStory, :count) == 0
    end
  end

  describe "graph-story visibility: exactly the graph's parties" do
    test "parties read it; the author's close friend and outsiders do not", ctx do
      assert {:ok, story} = graph_story!(ctx)

      assert story["id"] in listed_ids(ctx.author)
      assert story["id"] in listed_ids(ctx.party)
      refute story["id"] in listed_ids(ctx.pal)
      refute story["id"] in listed_ids(ctx.outsider)

      row = Repo.get!(TemporaryStory, story["id"])
      assert TemporaryStoryPublishing.eligible_story?(row, ctx.party.id)
      refute TemporaryStoryPublishing.eligible_story?(row, ctx.pal.id)
      refute TemporaryStoryPublishing.eligible_story?(row, ctx.outsider.id)
    end

    test "graph story media bytes follow the same party law", ctx do
      assert {:ok, media} =
               SocialMomentPublishing.upload_media(ctx.author.id, %{
                 "base64" => @png_b64,
                 "mime_type" => "image/png"
               })

      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_id" => media["id"],
                 "graph_plan_id" => ctx.plan.id,
                 "caption" => "graph bytes"
               })

      assert story["media_id"] == media["id"]

      assert {:ok, bin} = SocialMomentPublishing.read_media(media["id"], ctx.party.id)
      assert byte_size(bin) > 32
      assert {:ok, _} = SocialMomentPublishing.read_media(media["id"], ctx.author.id)
      assert {:error, :not_found} = SocialMomentPublishing.read_media(media["id"], ctx.pal.id)

      assert {:error, :not_found} =
               SocialMomentPublishing.read_media(media["id"], ctx.outsider.id)
    end

    test "the same 24h expiry law removes a graph story from every list", ctx do
      assert {:ok, story} = graph_story!(ctx)
      assert story["id"] in listed_ids(ctx.party)

      past = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:microsecond)

      Repo.get!(TemporaryStory, story["id"])
      |> TemporaryStory.changeset(%{expires_at: past})
      |> Repo.update!()

      refute story["id"] in listed_ids(ctx.party)
      refute story["id"] in listed_ids(ctx.author)
    end
  end

  describe "person-story path is unchanged (non-regression)" do
    test "no anchor: not_graph true, no graph_plan_id, close-circle law intact", ctx do
      assert {:ok, story} =
               TemporaryStoryPublishing.create(ctx.author.id, %{
                 "media_ref" => "/demo/moments/portrait.jpg",
                 "visibility" => "close_circle",
                 "caption" => "just mine"
               })

      assert story["not_graph"] == true
      assert story["graph_plan_id"] == nil
      assert story["visibility"] == "close_circle"

      row = Repo.get!(TemporaryStory, story["id"])
      assert row.graph_plan_id == nil

      # Close circle still reaches the close friend, never the
      # graph-only party (who has no relationship standing here).
      assert story["id"] in listed_ids(ctx.pal)
      refute story["id"] in listed_ids(ctx.party)
      refute story["id"] in listed_ids(ctx.outsider)
    end
  end

  defp graph_story!(ctx) do
    TemporaryStoryPublishing.create(ctx.author.id, %{
      "media_ref" => "/demo/moments/portrait.jpg",
      "caption" => "anchored",
      "graph_plan_id" => ctx.plan.id
    })
  end

  defp listed_ids(viewer) do
    Enum.map(TemporaryStoryPublishing.list_for_viewer(viewer.id), & &1["id"])
  end

  defp dyad!(a, b) do
    uid = System.unique_integer([:positive])

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "r24gs-#{uid}-#{Ecto.UUID.generate()}"})
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
    |> User.changeset(%{handle: "r24gs#{tag}#{uniq}", display_name: "R24GS #{tag} #{uniq}"})
    |> Repo.insert!()
  end
end
