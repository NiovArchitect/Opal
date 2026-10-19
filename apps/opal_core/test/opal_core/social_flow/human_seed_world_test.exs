defmodule OpalCore.SocialFlow.HumanSeedWorldTest do
  @moduledoc """
  Repair #19 (W1) — the human seed world: believable people, human
  titles/messages, and the hard state-distribution requirement.

  This is also the backend half of the permanent machine-speak check:
  every display string the seed world writes (person names, plan
  titles, message bodies, story captions) is asserted free of the
  tokens the founder rejected. The API/rendered half lives in
  shots/regression (scanSeedWorld gate in lib/harness.mjs).
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calls.{CallOutcome, CallSession}
  alias OpalCore.Messages
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    FounderGraphCommitmentSeed,
    PlanParticipant,
    SharedPlan,
    SocialMomentMedia,
    SocialMomentPublishing,
    TemporaryStory
  }

  @machine_speak ["macreplay", "R18REG", "Regression A", "Regression B", "User A", "User B"]

  @seeded_opal_titles [
    "Saturday with Maya",
    "A gift idea for Maya",
    "Brunch headcount",
    "Just between us — Jordan",
    "A birthday gift for Maya",
    "Weekend ideas",
    "Thank-you note help"
  ]

  setup do
    viewer =
      %User{}
      |> User.changeset(%{
        handle: "human-world-viewer-#{System.unique_integer([:positive])}",
        display_name: "Ethan Walker"
      })
      |> Repo.insert!()

    %{viewer: viewer}
  end

  defp viewer_plans(viewer_id) do
    from(p in SharedPlan,
      join: pp in PlanParticipant,
      on: pp.plan_id == p.id and pp.user_id == ^viewer_id,
      select: p
    )
    |> Repo.all()
  end

  test "world seeds a believable cast with a full state distribution", %{viewer: viewer} do
    assert {:ok, payload} =
             FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    world = payload["world"]

    assert world["cast"] == [
             "Chanelle Brooks",
             "Maya Torres",
             "Jordan Ellis",
             "Sabrina Nguyen",
             "Alex Rivera",
             "Nina Patel",
             "Priya Shah",
             "Marcus Lee"
           ]

    plans = viewer_plans(viewer.id)
    titles = Enum.map(plans, & &1.title)

    for expected <- [
          "Dinner at Juniper & Ivy",
          "Saturday morning at Oceanside Farmers Market",
          "Farmers market run",
          "Rooftop drinks at The Brick Hotel",
          "Coffee and a coastal walk",
          "Sunday brunch at Herb & Wood",
          "Sunset picnic at Tamarack Beach",
          "Saturday ride to Oceanside"
        ] do
      assert expected in titles,
             "missing seed-world plan #{inspect(expected)} in #{inspect(titles)}"
    end

    by_status = Enum.group_by(plans, & &1.status)

    # State distribution: no surface can read all-Forming.
    assert length(by_status["tentative"] || []) >= 2
    assert length(by_status["agreed"] || []) >= 3
    assert length(by_status["completed"] || []) == 2

    # Happening: the market run's window is open right now.
    now = DateTime.utc_now()
    market = Enum.find(plans, &(&1.title == "Farmers market run"))
    assert DateTime.compare(market.start_at, now) == :lt
    assert DateTime.compare(market.end_at, now) == :gt

    # Needs-you: the viewer's own pending rows are the unresolved
    # actions (rooftop drinks + the graph seed's market plan).
    pending_titles =
      from(p in SharedPlan,
        join: pp in PlanParticipant,
        on: pp.plan_id == p.id and pp.user_id == ^viewer.id,
        where: pp.response_state in ["pending", "proposed", "tentative"],
        select: p.title
      )
      |> Repo.all()

    assert "Rooftop drinks at The Brick Hotel" in pending_titles
    assert "Saturday morning at Oceanside Farmers Market" in pending_titles

    # Forming: viewer accepted, Priya still to answer, no agreed stamp.
    coffee = Enum.find(plans, &(&1.title == "Coffee and a coastal walk"))
    assert coffee.status == "tentative"

    coffee_states =
      from(pp in PlanParticipant,
        where: pp.plan_id == ^coffee.id,
        select: {pp.user_id, pp.response_state}
      )
      |> Repo.all()
      |> Map.new()

    assert coffee_states[viewer.id] == "accepted"
    assert Map.values(coffee_states) |> Enum.member?("pending")

    # Past: completed rows carry real completion stamps in the past.
    for past <- by_status["completed"] do
      assert past.completed_at
      assert DateTime.compare(past.completed_at, now) == :lt
    end

    # Honest absences are named in the payload, never faked.
    assert world["plan_privacy_flag"] == "absent_no_field_on_shared_plan"
    assert world["joiner_location_sharing"] == "absent_no_field_on_plan_participant"
    # BS-05: plan imagery is no longer absent — it rides media records.
    assert world["venue_photo"] == "seeded_as_media_records_on_plan_and_story_records"
  end

  test "BS-05: every seeded plan and story carries a real image on its record",
       %{viewer: viewer} do
    assert {:ok, payload} =
             FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    # Plans: media_id on the record, a real JPEG media record behind
    # it (real dimensions, real bytes), and the contract's image_url
    # — the field Home's planImageFromRecord reads first. Scoped to
    # the walk world's named plans (the founder seeds also create
    # utility 1:1 plans that are not venue cards).
    world_titles = [
      "Dinner at Juniper & Ivy",
      "Saturday morning at Oceanside Farmers Market",
      "Farmers market run",
      "Rooftop drinks at The Brick Hotel",
      "Coffee and a coastal walk",
      "Sunday brunch at Herb & Wood",
      "Sunset picnic at Tamarack Beach",
      "Saturday ride to Oceanside"
    ]

    world_plans =
      Enum.filter(viewer_plans(viewer.id), &(&1.title in world_titles))

    assert Enum.map(world_plans, & &1.title) |> Enum.sort() == Enum.sort(world_titles)

    for plan <- world_plans do
      media_id = plan.alignment["media_id"]

      assert is_binary(media_id) and media_id != "",
             "seeded plan #{inspect(plan.title)} carries no media_id"

      media = Repo.get!(SocialMomentMedia, media_id)
      assert media.mime_type == "image/jpeg"
      assert media.width > 1 and media.height > 1
      assert media.byte_size > 1_000

      contract = SharedPlan.to_contract(plan)
      assert contract["image_url"] == "/api/v1/product/social-moments/media/" <> media_id
      assert contract["media_id"] == media_id

      # Byte access: the plan's people can read it; a stranger cannot.
      assert {:ok, bytes} = SocialMomentPublishing.read_media(media_id, viewer.id)
      assert byte_size(bytes) == media.byte_size

      stranger =
        %User{}
        |> User.changeset(%{
          handle: "seed-world-stranger-#{System.unique_integer([:positive])}",
          display_name: "Outside Observer"
        })
        |> Repo.insert!()

      assert {:error, :not_found} = SocialMomentPublishing.read_media(media_id, stranger.id)
    end

    assert Enum.all?(payload["world"]["plans"], & &1["has_image"])

    # Stories: the media behind each story is a real photograph now,
    # never the pre-fix 1x1 PNG.
    stories = from(s in TemporaryStory, select: s) |> Repo.all()
    assert stories != []

    for story <- stories do
      "media:" <> media_id = story.media_ref
      media = Repo.get!(SocialMomentMedia, media_id)
      assert media.mime_type == "image/jpeg"
      assert media.width > 1 and media.height > 1
      assert media.byte_size > 1_000
    end
  end

  test "BS-12: the brunch plan's stored instant is 11:00 AM in its home zone",
       %{viewer: viewer} do
    assert {:ok, _} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    brunch = Enum.find(viewer_plans(viewer.id), &(&1.title == "Sunday brunch at Herb & Wood"))
    assert brunch.time_label == "Sunday · 11:00 AM"
    assert brunch.timezone == "America/Los_Angeles"

    # The instant, read in America/Los_Angeles (US DST rule), is a
    # Sunday at exactly 11:00 — label and instant agree.
    local =
      DateTime.add(brunch.start_at, la_offset_seconds(DateTime.to_date(brunch.start_at)), :second)

    assert Date.day_of_week(DateTime.to_date(local)) == 7
    assert {local.hour, local.minute} == {11, 0}
    assert DateTime.compare(brunch.start_at, DateTime.utc_now()) == :gt
  end

  # America/Los_Angeles UTC offset for a UTC date, US DST rule —
  # the test-side mirror of the seed's rule (BS-12's pin).
  defp la_offset_seconds(%Date{} = date) do
    dst_start = nth_sunday(date.year, 3, 2)
    dst_end = nth_sunday(date.year, 11, 1)

    if Date.compare(date, dst_start) != :lt and Date.compare(date, dst_end) == :lt,
      do: -7 * 3600,
      else: -8 * 3600
  end

  defp nth_sunday(year, month, n) do
    first = Date.new!(year, month, 1)
    delta = rem(7 - Date.day_of_week(first) + 7, 7)
    Date.add(first, delta + (n - 1) * 7)
  end

  test "calls are seeded in varied states with an unresolved action on the missed call",
       %{viewer: viewer} do
    assert {:ok, _} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    # JA-04: correlation ids are keyed per viewer.
    missed_id = "seed-world-call-maya-missed-#{viewer.id}"
    answered_id = "seed-world-call-chanelle-answered-#{viewer.id}"
    cancelled_id = "seed-world-call-jordan-cancelled-#{viewer.id}"

    calls =
      from(c in CallSession,
        where: c.correlation_id in [^missed_id, ^answered_id, ^cancelled_id],
        select: {c.correlation_id, c.status}
      )
      |> Repo.all()
      |> Map.new()

    assert calls[missed_id] == "missed"
    assert calls[answered_id] == "ended"
    assert calls[cancelled_id] == "canceled"

    missed = Repo.get_by!(CallSession, correlation_id: missed_id)

    outcome =
      Repo.get_by!(CallOutcome,
        call_id: missed.id,
        idempotency_key: "seed-world-call-maya-missed-open-question-#{viewer.id}"
      )

    assert outcome.outcome_type == "open_question_created"
    assert outcome.after_value == "Can we talk tonight about Saturday?"
  end

  test "stories exist with human captions and no machine-speak reaches any display string",
       %{viewer: viewer} do
    assert {:ok, _} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    captions =
      from(s in TemporaryStory, select: s.caption) |> Repo.all()

    assert "Morning light at Tamarack — picnic weather if this holds" in captions
    assert "Flower stall haul at the market this morning" in captions

    # The permanent machine-speak assertion over every display string
    # this world writes: people, plan titles/locations, message bodies,
    # story captions.
    names = from(u in User, select: u.display_name) |> Repo.all()
    plans = viewer_plans(viewer.id)

    convs = Messages.list_conversations(viewer.id)

    bodies =
      Enum.flat_map(convs, fn c ->
        case Messages.list_messages(c["id"], viewer.id) do
          {:ok, msgs} -> Enum.map(msgs, & &1["body"])
          _ -> []
        end
      end)

    strings =
      names ++
        Enum.flat_map(plans, &[&1.title, &1.location || ""]) ++
        captions ++
        Enum.filter(bodies, &is_binary/1)

    for s <- strings, token <- @machine_speak do
      refute String.contains?(s, token),
             "machine-speak #{inspect(token)} in seed-world display string #{inspect(s)}"
    end
  end

  test "the world interlocks: a cast member sees the same shared plan rows from her side",
       %{viewer: viewer} do
    assert {:ok, payload} =
             FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    world_plan_ids = MapSet.new(Enum.map(payload["world"]["plans"], & &1["id"]))

    maya = Repo.get_by!(User, handle: "user-maya")

    # From Maya's account, the SAME plan rows are visible through her
    # own participant rows — one row, two accounts, not copies. (A full
    # re-seed with a cast peer as the viewer is a pre-existing founder
    # seed limitation, named in the W1 report: the communication seed
    # directs the viewer to every peer, so a peer-viewer self-directs
    # and ensure_direct_conversation refuses with {:error, :self}.)
    maya_plans = viewer_plans(maya.id)
    maya_plan_ids = maya_plans |> Enum.map(& &1.id) |> MapSet.new()

    shared = MapSet.intersection(world_plan_ids, maya_plan_ids)
    assert MapSet.size(shared) >= 2

    maya_titles = Enum.map(maya_plans, & &1.title)
    assert "Farmers market run" in maya_titles
    assert "Sunday brunch at Herb & Wood" in maya_titles

    # Her conversations list carries the shared crew thread too.
    maya_convs = Messages.list_conversations(maya.id)
    assert Enum.any?(maya_convs, &(&1["title"] == "Weekend Crew"))
  end

  test "re-seeding is idempotent: no duplicate plans, calls, or stories", %{viewer: viewer} do
    assert {:ok, _} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)
    first = viewer_plans(viewer.id) |> length()
    assert {:ok, _} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)
    assert viewer_plans(viewer.id) |> length() == first

    missed_count =
      from(c in CallSession,
        where: c.correlation_id == ^"seed-world-call-maya-missed-#{viewer.id}"
      )
      |> Repo.aggregate(:count)

    assert missed_count == 1

    # JA-10 re-seed: no duplicate Opal conversations either.
    assert {:ok, payload} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)
    assert length(payload["world"]["opal_conversations"]) == 7

    sessions = OpalCore.OpalConversations.list_sessions(viewer.id, limit: 200)
    seeded = Enum.filter(sessions, &(&1["title"] in @seeded_opal_titles))
    assert length(seeded) == 7
  end

  test "JA-04: a second viewer seeding the same DB gets their OWN call world", %{viewer: viewer} do
    assert {:ok, _} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    viewer2 =
      %User{}
      |> User.changeset(%{
        handle: "human-world-viewer2-#{System.unique_integer([:positive])}",
        display_name: "Second Viewer"
      })
      |> Repo.insert!()

    assert {:ok, payload2} = FounderGraphCommitmentSeed.ensure!(viewer2.id, explicit_opt_in: true)
    assert length(payload2["world"]["calls"]) == 3

    calls2 =
      from(c in CallSession,
        where:
          c.correlation_id in [
            ^"seed-world-call-maya-missed-#{viewer2.id}",
            ^"seed-world-call-chanelle-answered-#{viewer2.id}",
            ^"seed-world-call-jordan-cancelled-#{viewer2.id}"
          ],
        select: {c.correlation_id, c.status, c.callee_user_id, c.caller_user_id}
      )
      |> Repo.all()

    assert length(calls2) == 3

    missed2 =
      Repo.get_by!(CallSession, correlation_id: "seed-world-call-maya-missed-#{viewer2.id}")

    assert missed2.status == "missed"
    assert missed2.callee_user_id == viewer2.id

    # The unresolved outcome hangs off the SECOND viewer's own
    # missed call — not the first viewer's.
    outcome2 =
      Repo.get_by!(CallOutcome,
        call_id: missed2.id,
        idempotency_key: "seed-world-call-maya-missed-open-question-#{viewer2.id}"
      )

    assert outcome2.outcome_type == "open_question_created"

    # And the first viewer's calls are untouched and distinct.
    missed1 =
      Repo.get_by!(CallSession, correlation_id: "seed-world-call-maya-missed-#{viewer.id}")

    assert missed1.id != missed2.id
    assert missed1.callee_user_id == viewer.id
  end

  test "JA-10: the world provisions believable Opal conversations through scoped birth", %{
    viewer: viewer
  } do
    assert {:ok, payload} = FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)
    assert length(payload["world"]["opal_conversations"]) == 7

    sessions = OpalCore.OpalConversations.list_sessions(viewer.id, limit: 200)
    by_title = Map.new(sessions, &{&1["title"], &1})

    for title <- @seeded_opal_titles do
      assert Map.has_key?(by_title, title), "missing seeded Opal chat #{inspect(title)}"
      assert by_title[title]["message_count"] >= 1
      assert is_binary(by_title[title]["last_message_preview"])
    end

    # Maya's person orbit holds two chats.
    maya_chats =
      Enum.filter(sessions, fn s ->
        is_map(s["anchor"]) and s["anchor"]["type"] == "person" and
          s["title"] in ["Saturday with Maya", "A gift idea for Maya"]
      end)

    assert length(maya_chats) == 2
    assert Enum.all?(maya_chats, &(&1["anchor"]["label"] == "Maya Torres"))

    # One plan orbit, anchored to the brunch plan.
    brunch_chat = by_title["Brunch headcount"]
    assert brunch_chat["anchor"]["type"] == "plan"
    assert brunch_chat["anchor"]["label"] == "Sunday brunch at Herb & Wood"

    # One private-flagged orbit (Jordan's).
    jordan_chat = by_title["Just between us — Jordan"]
    assert jordan_chat["anchor"]["type"] == "person"
    assert jordan_chat["anchor"]["private"] == true

    # Three unanchored chats.
    for title <- ["Weekend ideas", "Thank-you note help", "A birthday gift for Maya"] do
      assert by_title[title]["anchor"] == nil
    end

    # W21 (ABS-1): the birthday chat carries a PENDING anchor
    # proposal in the real stored state — an Opal reply whose
    # metadata context_snapshot names Maya, exactly what the
    # Center pipeline stamps and the web detection reads. The
    # conversation itself stays unanchored until a user accepts.
    birthday = by_title["A birthday gift for Maya"]
    messages = OpalCore.OpalConversations.list_messages(birthday["id"], 50)
    opal_reply = Enum.find(messages, &(&1.role == "opal"))
    assert opal_reply != nil
    assert opal_reply.metadata["context_snapshot"]["who"] == "Maya Torres"
  end
end
