defmodule OpalCore.SocialFlow.R24SeedworldStageabilityTest do
  @moduledoc """
  Repair #24 (WS-9) - seed-world stageability proof.

  The R23 handoff declared two glass legs unstageable in the
  founder-seed world: account A's home feed composed ZERO moment
  cards (so no comments door existed to tap) and ZERO live cards
  (so no Live journey existed to tap). This suite is the runnable
  proof that the enriched seed world stages both journeys through
  the REAL feed paths the client consumes:

    * moment cards - HomeFeed.compose/1, the payload behind
      GET /api/v1/product/home/feed (its "objects" are the cards
      shellData maps to kind "memory");
    * live cards - Lives.list_visible_lives/1, the payload behind
      GET /api/v1/product/lives/visible (its rows are the rooms
      shellData's liveFeedFromRooms maps to kind "live").

  The composition itself (braiding lives + moments + plan/place
  stones, capped) happens client-side in shellData, so this proof
  sits exactly at the API/feed-payload layer the task names: if
  these two payloads carry the cards, the glass can stage them.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Lives
  alias OpalCore.Lives.LiveRoom
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    FounderGraphCommitmentSeed,
    HomeFeed,
    PlanParticipant,
    SharedPlan,
    SocialMomentComment,
    SocialMomentEngagement,
    SocialMomentRecord
  }

  @machine_speak ["macreplay", "R18REG", "Regression A", "Regression B", "User A", "User B"]

  setup do
    viewer =
      %User{}
      |> User.changeset(%{
        handle: "stageability-viewer-#{System.unique_integer([:positive])}",
        display_name: "Ethan Walker"
      })
      |> Repo.insert!()

    %{viewer: viewer}
  end

  defp seed!(viewer_id) do
    assert {:ok, payload} = FounderGraphCommitmentSeed.ensure!(viewer_id, explicit_opt_in: true)
    payload
  end

  test "A's home feed composes moment cards from A's people, with a comments door that opens",
       %{viewer: viewer} do
    payload = seed!(viewer.id)
    world = payload["world"]

    # The seed payload itself names the new world members.
    assert length(world["moments"]) >= 3
    assert world["live"]["host"] == "Maya Torres"

    feed = HomeFeed.compose(viewer.id)
    cards = feed["objects"]

    # Several moment cards, from several of A's people - not one
    # author repeated, not the viewer's own posts filling the feed.
    assert length(cards) >= 3,
           "expected several moment cards in A's home feed, got #{length(cards)}"

    authors = cards |> Enum.map(& &1["actor"]["display_name"]) |> Enum.uniq()

    assert length(authors) >= 3,
           "moment cards should span several authors, got #{inspect(authors)}"

    refute "Ethan Walker" in authors

    for card <- cards do
      assert card["object_type"] == "memory"
      assert is_binary(card["caption"]) and String.trim(card["caption"]) != ""
      # Every card carries a real photo through the moment's own media.
      assert is_binary(card["media_ref"]) and card["media_ref"] != ""

      for token <- @machine_speak do
        refute String.contains?(card["caption"], token)
      end
    end

    # At least one card carries comments-door engagement: comments
    # already on the moment, readable through the same engagement
    # read the comments sheet uses.
    commented =
      Enum.find(cards, fn c -> (c["engagement_summary"]["comment_count"] || 0) > 0 end)

    assert commented != nil, "no seeded moment card carries any comment"

    assert {:ok, %{"comments" => comments}} =
             SocialMomentEngagement.list_comments(viewer.id, commented["id"])

    assert comments != []

    assert Enum.all?(comments, fn c ->
             is_binary(c["body"]) and String.trim(c["body"]) != ""
           end)

    # Varied engagement states across the deck - not a uniform
    # demo reel: at least one card the viewer has lit, and at
    # least one card with no engagement at all yet.
    assert Enum.any?(cards, fn c -> c["engagement_summary"]["viewer_liked"] == true end)

    assert Enum.any?(cards, fn c ->
             (c["engagement_summary"]["like_count"] || 0) == 0 and
               (c["engagement_summary"]["comment_count"] || 0) == 0
           end)

    # Calibrated presence, not a flood: the moment count stays a
    # minority presence next to the world's plans/places.
    assert length(cards) <= 8

    plan_count =
      from(p in SharedPlan,
        join: pp in PlanParticipant,
        on: pp.plan_id == p.id and pp.user_id == ^viewer.id,
        select: count(p.id)
      )
      |> Repo.one()

    assert plan_count >= 8
  end

  test "A's visible lives carry at least one live card, honestly hosted and placed",
       %{viewer: viewer} do
    seed!(viewer.id)

    lives = Lives.list_visible_lives(viewer.id)
    rooms = Enum.map(lives, & &1["live_room"])

    assert rooms != [], "expected at least one visible live room for A, got none"

    room = hd(rooms)
    assert room["status"] == "live"
    assert room["host_display_name"] == "Maya Torres"
    assert room["mine"] == false

    # The place is a real place of the seed world, stated plainly -
    # no test-venue badge or fixture wording reaches the label.
    assert room["place_label"] == "Oceanside Farmers Market"
    refute String.contains?(room["place_label"], "TEST")

    assert is_binary(room["title"]) and String.trim(room["title"]) != ""

    for token <- @machine_speak do
      refute String.contains?(room["title"], token)
    end

    # The show path agrees with the list path (R23 top-up law):
    # the same room opens for A through get_live/2.
    assert {:ok, shown} = Lives.get_live(room["id"], viewer.id)
    assert shown["id"] == room["id"]
    assert shown["host_display_name"] == "Maya Torres"
  end

  test "a stranger sees none of the seeded moments and none of the live room", %{viewer: viewer} do
    seed!(viewer.id)

    stranger =
      %User{}
      |> User.changeset(%{
        handle: "stageability-stranger-#{System.unique_integer([:positive])}",
        display_name: "Outside Observer"
      })
      |> Repo.insert!()

    seeded_ids =
      from(m in SocialMomentRecord, select: m.id) |> Repo.all() |> MapSet.new()

    stranger_feed_ids =
      HomeFeed.compose(stranger.id)["objects"] |> Enum.map(& &1["id"]) |> MapSet.new()

    assert MapSet.disjoint?(seeded_ids, stranger_feed_ids)
    assert Lives.list_visible_lives(stranger.id) == []
  end

  test "re-seeding is idempotent for moments, comments, and the live room", %{viewer: viewer} do
    seed!(viewer.id)

    moment_count = from(m in SocialMomentRecord, select: count(m.id)) |> Repo.one()
    assert moment_count >= 3

    live_count =
      from(r in LiveRoom, where: r.status == "live", select: count(r.id)) |> Repo.one()

    assert live_count == 1

    seed!(viewer.id)
    seed!(viewer.id)

    assert from(m in SocialMomentRecord, select: count(m.id)) |> Repo.one() == moment_count

    assert from(r in LiveRoom, where: r.status == "live", select: count(r.id)) |> Repo.one() ==
             live_count

    # The seed's own comments did not duplicate across the re-seeds.
    # The invariant is per (moment, author, body) triple: the
    # moments are world-shared records, so another viewer's seed
    # lawfully adds THAT viewer's own comments on them (and in this
    # repo's shared-sandbox sync runs, a neighbouring suite's world
    # can be visible in the same transaction) - what must never
    # happen is the same author writing the same seeded comment
    # twice, or this viewer's seeded set going missing.
    seeded_bodies = [
      "Save me a bunch of the pink ones - I will swing by on my way over",
      "Already set aside. They are too good to share, honestly",
      "Golden hour on that patio is the whole reason to go"
    ]

    triples =
      from(c in SocialMomentComment,
        where: c.body in ^seeded_bodies and is_nil(c.deleted_at),
        select: {c.moment_id, c.author_user_id, c.body}
      )
      |> Repo.all()

    assert triples == Enum.uniq(triples),
           "a seeded comment triple was duplicated: #{inspect(triples -- Enum.uniq(triples))}"

    maya = Repo.get_by!(User, handle: "user-maya")
    mine = Enum.filter(triples, fn {_, author, _} -> author in [viewer.id, maya.id] end)

    assert length(mine) == 3,
           "expected this viewer's 2 seeded comments + Maya's reply, got #{inspect(mine)}"
  end
end
