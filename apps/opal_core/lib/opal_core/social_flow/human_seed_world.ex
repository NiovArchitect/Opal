defmodule OpalCore.SocialFlow.HumanSeedWorld do
  @moduledoc """
  Repair #19 (W1) — the believable human seed world for founder review.

  Why this exists: the founder reviewed rendered captures served from the
  regression/replay world and rejected its machine-speak — a person named
  "Regression A", three people all named "User A", plan titles carrying a
  run tag ("Race night dinner macreplay1"), thread spam like
  "R18REG macreplay1 order 0 / persistence one / persistence two", and
  plans all in Forming state. This module rebuilds the *review* world as
  a believable social graph, layered on the founder seeds.

  Cast (stable ids/handles are binding keys and never change; only
  display strings are human): Chanelle Brooks, Maya Torres, Jordan
  Ellis, Sabrina Nguyen, Alex Rivera, Nina Patel, plus Priya Shah and
  Marcus Lee, who are provisioned here.

  State distribution (hard requirement — no surface may read all-Forming):
  the governed state family is derived by NextPlan/Reveal from the plan
  row + the viewer's participant row (live window → happening; viewer
  pending → action; agreed → ready; otherwise forming; completed → past),
  so this module seeds the ROWS that make each state true:

    * happening — "Farmers market run", agreed, window open now;
    * action (needs the viewer) — "Rooftop drinks at The Brick Hotel",
      tentative, viewer pending (the graph seed's Oceanside Farmers
      Market plan is the second needs-you item: viewer pending there);
    * ready — "Dinner at Juniper & Ivy" (communication seed) and
      "Sunday brunch at Herb & Wood", agreed, viewer accepted;
    * forming — "Coffee and a coastal walk", tentative, viewer accepted,
      Priya Shah still to answer;
    * past — "Sunset picnic at Tamarack Beach" and "Saturday ride to
      Oceanside", both completed with real completed_at stamps.

  Calls: CallSession rows in varied states — a missed call from Maya
  Torres with an unresolved CallOutcome (open_question_created) attached,
  an answered/ended call with Chanelle Brooks, and a cancelled outgoing
  call to Jordan Ellis. HONEST LIMIT: CallSession stores no call/media
  type (video exists only as a transient push payload in Calls), so no
  "video call" row is seeded — claiming one would be painting data the
  record does not hold. The calls wave owns that schema gap.

  Stories: TemporaryStory rows created through the real publishing
  owners (SocialMomentPublishing.upload_media with real JPEG photo
  bytes, then TemporaryStoryPublishing.create), with human captions.
  Peer-story reach still obeys TemporaryStoryPublishing eligibility
  (relationship authority) — nothing here widens an audience.

  Imagery (Repair #19 BS-05): every seeded plan and story carries a
  REAL photograph on its record. The bytes are the Commons photos
  committed under priv/seed_assets (provenance in that directory's
  SOURCES.md), uploaded through the same media owner the product
  uses, so each image is a real media record with real dimensions —
  never a 1x1 pixel, never a title-derived placeholder. Plans carry
  the media id in their alignment (the R16 contract leg surfaces it
  as media_id, and SharedPlan.to_contract/2 projects image_url from
  it — the first field Home's planImageFromRecord reads); byte
  access for plan media is authorized for the plan's creator and
  participants in SocialMomentPublishing.read_media/2, the same
  deny-by-default pattern as story media. These are staging-world
  records: the photos depict the KIND of place/moment the plan is
  about; no record claims a photo IS the venue.

  HONEST LIMITS (named, never faked):
    * SharedPlan / PlanParticipant carry NO privacy/visibility field and
      NO location-sharing field, so no private-marked plan and no
      joiner location-sharing state is seeded. Trip convoy sharing
      (Trips.TripConvoyMember) is trip-scoped, not plan-joiner state;
      seeding a trip to imitate it would be a false record. Both are
      named for the graphs wave in the W1 report.
    * No venue/place record carries a photo field (the place Catalog
      has no photo_url), so plan imagery rides the media record —
      the product's own imagery path — not an invented place field.

  Seed-gated: the ONLY caller is the graph commitment seed's ensure!/2,
  which itself requires the founder-seed flag + explicit opt-in
  (MP-2 cage: seed-mode sites stay seed-gated). This module is
  registered visibly in the pattern-enforcement test (peer-UUID and
  plan-writer registries) in the same commit that introduced it.
  Idempotent: plans are
  found by (conversation, title), participants are insert-missing-only
  (an existing RSVP is never rewritten), calls are keyed by
  correlation_id, stories by (author, caption).

  Repair #19 W20 (JA-04): seeded call correlation_ids (and call
  outcome idempotency keys) are suffixed with the VIEWER's id.
  CallSession's correlation_id is globally unique, so the unsuffixed
  keys bound the whole call world to the FIRST viewer who seeded a
  fresh DB — every later review viewer got plans and stories but an
  empty Calls tab. Per-viewer keys attach the call world to each
  viewer the pack seeds.

  Repair #19 W20 (JA-10): the world also provisions Opal
  conversations (Orbits) for the viewer through the REAL
  scoped-birth path (OpalConversations.create_scoped_session/2 and
  start_new_chat/1 — no direct session inserts): two chats in
  Maya's person orbit, one in the Sunday brunch plan orbit, one in
  Jordan's person orbit flagged orbit-private, and two unanchored
  chats. Titles are set through rename_conversation/3 and each
  chat carries one user message, so the orbit log and rail read
  populated in the pack.

  Repair #24 (WS-9, seed-world stageability): the R23 handoff
  declared two glass legs unstageable in this world — account A's
  home feed composed ZERO moment cards and ZERO live cards. The
  diagnosis (proven red-first by
  r24_seedworld_stageability_test.exs at the R23 tip): the world
  seeded plans, calls, stories and chats, but no SocialMoment
  records and no LiveRooms at all. HomeFeed composes moment cards
  only from SocialMomentRecord rows (via
  SocialMomentPublishing.list_for_viewer), and the client's live
  cards come only from Lives.list_visible_lives — neither record
  family existed, so neither card could ever compose. The seeded
  stories are TemporaryStory rows: they feed the rail, never the
  stream's moment cards, so their presence staged neither journey.
  Timing and visibility were NOT the cause: nothing existed to be
  mistimed or hidden. The enrichment below therefore seeds the
  missing record families through their real owners — moments via
  SocialMomentPublishing.publish plus SocialMomentEngagement, and
  one live room via Lives.go_live — with the existing cast, at the
  existing places, on the existing seed photos.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calls.{CallOutcome, CallSession}
  alias OpalCore.Lives
  alias OpalCore.Lives.Venue
  alias OpalCore.Messages
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    PlanParticipant,
    SharedPlan,
    SocialMomentComment,
    SocialMomentEngagement,
    SocialMomentMedia,
    SocialMomentPublishing,
    SocialMomentRecord,
    TemporaryStory,
    TemporaryStoryPublishing
  }

  @priya_id "f0c4a4e1-1111-4111-8111-c4a4e1100007"
  @marcus_id "f0c4a4e1-1111-4111-8111-c4a4e1100008"

  # Repair #19 BS-05 — the seed's real photo fixtures: file name ->
  # {width, height} as committed under priv/seed_assets (real
  # dimensions of the actual JPEG bytes; provenance in SOURCES.md
  # beside them). The pre-fix world uploaded a 1x1 PNG as every
  # story's media; that fixture is gone.
  @seed_images %{
    "market_run.jpg" => {640, 480},
    "rooftop_drinks.jpg" => {640, 426},
    "coffee_walk.jpg" => {640, 427},
    "brunch.jpg" => {640, 422},
    "picnic_sunset.jpg" => {640, 360},
    "coastal_ride.jpg" => {640, 359},
    "juniper_dinner.jpg" => {640, 426},
    "story_tamarack.jpg" => {640, 423},
    "story_flowers.jpg" => {640, 427}
  }

  # The seed world's home zone is America/Los_Angeles: every seeded
  # plan row carries that timezone (ensure_plan!), and dated seed
  # instants are built in it (BS-12) so a plan's stored instant and
  # its human label agree.

  @doc """
  Idempotent. Provisions the human world for `viewer_user_id`.
  `peer_ids` is the founder-seed peer map (atom keys from the
  communication seed's peer_ids/0, plus :nina from the graph seed).
  Returns a JSON-shaped summary of what the world holds.
  """
  def ensure!(viewer_user_id, peer_ids)
      when is_binary(viewer_user_id) and is_map(peer_ids) do
    priya = upsert_user!(@priya_id, "founder-priya", "Priya Shah")
    marcus = upsert_user!(@marcus_id, "founder-marcus", "Marcus Lee")

    peers = %{
      chanelle: peer_ids.chanelle,
      maya: peer_ids.maya,
      jordan: peer_ids.jordan,
      sabrina: peer_ids.sabrina,
      alex: peer_ids.alex,
      nina: peer_ids.nina,
      priya: priya.id,
      marcus: marcus.id
    }

    plans = [
      happening_market_run!(viewer_user_id, peers),
      action_rooftop_drinks!(viewer_user_id, peers),
      forming_coffee_walk!(viewer_user_id, peers),
      ready_sunday_brunch!(viewer_user_id, peers),
      past_sunset_picnic!(viewer_user_id, peers),
      past_saturday_ride!(viewer_user_id, peers)
    ]

    # BS-05: the founder seeds' own plans are part of the walk world
    # too — they get real imagery on the same media-record path.
    ensure_named_plan_image!(viewer_user_id, "Dinner at Juniper & Ivy", "juniper_dinner.jpg")

    ensure_named_plan_image!(
      viewer_user_id,
      "Saturday morning at Oceanside Farmers Market",
      "market_run.jpg"
    )

    calls = seed_calls!(viewer_user_id, peers)
    maya_direct_plan = ensure_maya_direct_plan!(viewer_user_id, peers)
    stories = seed_stories!(viewer_user_id, peers)

    # Repair #24 (WS-9): the two record families the Flows Voice and
    # Live glass journeys stage on — durable moments for the stream
    # and one live room — seeded after the directs and plans exist,
    # because moment visibility rides the dyad conversations and the
    # live host is the market plan's lead.
    moments = seed_moments!(viewer_user_id, peers)
    live = seed_live!(viewer_user_id, peers)

    # W21 (ABS-1, contacts leg): the anchor-proposal detection
    # resolves the Opal reply's named person against the account's
    # relationship contacts, and the seed world previously had
    # NONE — so no seeded proposal could ever resolve, however it
    # was carried. The viewer knows Maya: record that the way the
    # product records it, through Relationships.set_type (the
    # explicit user-set type write; an upsert, so re-seeds hold).
    #
    # Repair #19 W24 (DL-13): the cast now carries a human, varied
    # set of ties through the SAME real path (set_type), so every
    # tie-rendering surface in the review pack — profile, thread
    # header, chats rows, graph roster, orbit sheet, picker — shows
    # the relationship layer instead of a single typed contact. The
    # rest of the cast stays untyped on purpose: honest absence is
    # part of the demo.
    #
    # NO family tie is seeded for the viewer, deliberately: the
    # check-in sweep resolves the organizer's ENTIRE family set
    # (SocialFlow.Checkin), and the API battery's family-sweep case
    # (FR-B3-01) builds its five-person circle from the battery's
    # own phone-pool accounts — a seed-typed family member becomes
    # a sixth sweep target and the case fails (proven on a fresh
    # DB: 100/101 with a family row seeded, Jordan Ellis the sixth
    # member). Family + subtype is one tap away in the pack through
    # the DL-01 identification picker, which is the product's own
    # path for exactly this. Do not re-add a family set_type here
    # without re-proving FR-B3-01.
    {:ok, _} = OpalCore.Relationships.set_type(viewer_user_id, peers.maya, "close_friend")
    {:ok, _} = OpalCore.Relationships.set_type(viewer_user_id, peers.chanelle, "partner")
    {:ok, _} = OpalCore.Relationships.set_type(viewer_user_id, peers.sabrina, "friend")
    {:ok, _} = OpalCore.Relationships.set_type(viewer_user_id, peers.alex, "business")

    opal_conversations = seed_opal_conversations!(viewer_user_id, peers, plans)

    %{
      "cast" => [
        "Chanelle Brooks",
        "Maya Torres",
        "Jordan Ellis",
        "Sabrina Nguyen",
        "Alex Rivera",
        "Nina Patel",
        "Priya Shah",
        "Marcus Lee"
      ],
      "plans" => plans,
      "maya_direct_plan" => maya_direct_plan,
      "calls" => calls,
      "stories" => stories,
      "moments" => moments,
      "live" => live,
      "opal_conversations" => opal_conversations,
      "plan_privacy_flag" => "absent_no_field_on_shared_plan",
      "joiner_location_sharing" => "absent_no_field_on_plan_participant",
      "venue_photo" => "seeded_as_media_records_on_plan_and_story_records"
    }
  end

  # --- plans -------------------------------------------------------------

  defp happening_market_run!(viewer_id, peers) do
    conv =
      ensure_group!(
        viewer_id,
        [peers.maya, peers.jordan],
        "Weekend Crew"
      )

    seed_msg(
      conv,
      peers.maya,
      "world-market-maya-1",
      "I'm by the flower stall — the dahlias are unreal today."
    )

    seed_msg(
      conv,
      peers.jordan,
      "world-market-jordan-1",
      "Running five behind, save me a coffee?"
    )

    seed_msg(conv, viewer_id, "world-market-you-1", "On my way — two minutes out.")

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    plan =
      ensure_plan!(conv, %{
        title: "Farmers market run",
        status: "agreed",
        location: "Oceanside Farmers Market",
        start_at: DateTime.add(now, -45 * 60, :second),
        end_at: DateTime.add(now, 105 * 60, :second),
        time_label: "This morning · Oceanside",
        created_by_user_id: peers.maya
      })

    plan = ensure_plan_image!(plan, "market_run.jpg")

    ensure_participants!(plan, [
      {viewer_id, "participant", "accepted"},
      {peers.maya, "lead", "accepted"},
      {peers.jordan, "participant", "accepted"}
    ])

    plan_summary(plan, "happening")
  end

  defp action_rooftop_drinks!(viewer_id, peers) do
    {:ok, direct} = Messages.ensure_direct_conversation(viewer_id, peers.chanelle)
    conv = direct.conversation_id

    seed_msg(
      conv,
      peers.chanelle,
      "world-rooftop-chanelle-1",
      "Rooftop drinks at The Brick Hotel on Friday? They do a proper sunset."
    )

    seed_msg(
      conv,
      peers.chanelle,
      "world-rooftop-chanelle-2",
      "I can book the corner table if you're in."
    )

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    plan =
      ensure_plan!(conv, %{
        title: "Rooftop drinks at The Brick Hotel",
        status: "tentative",
        location: "The Brick Hotel, Oceanside",
        start_at: DateTime.add(now, 3 * 24 * 3600, :second),
        time_label: "Friday · Sunset",
        created_by_user_id: peers.chanelle
      })

    plan = ensure_plan_image!(plan, "rooftop_drinks.jpg")

    # The unresolved action: the viewer has not answered. NextPlan/Reveal
    # derive "action" (Needs you) from exactly this pending row.
    ensure_participants!(plan, [
      {peers.chanelle, "lead", "accepted"},
      {viewer_id, "participant", "pending"}
    ])

    plan_summary(plan, "action")
  end

  defp forming_coffee_walk!(viewer_id, peers) do
    {:ok, direct} = Messages.ensure_direct_conversation(viewer_id, peers.priya)
    conv = direct.conversation_id

    seed_msg(
      conv,
      viewer_id,
      "world-coffee-you-1",
      "Coffee Sunday morning, then a walk down the coast path?"
    )

    seed_msg(
      conv,
      peers.priya,
      "world-coffee-priya-1",
      "That sounds lovely — let me check what time my sister leaves."
    )

    plan =
      ensure_plan!(conv, %{
        title: "Coffee and a coastal walk",
        status: "tentative",
        location: "Moonlight Beach, Encinitas",
        time_label: "Sunday morning · Moonlight Beach",
        created_by_user_id: viewer_id
      })

    plan = ensure_plan_image!(plan, "coffee_walk.jpg")

    ensure_participants!(plan, [
      {viewer_id, "lead", "accepted"},
      {peers.priya, "participant", "pending"}
    ])

    plan_summary(plan, "forming")
  end

  defp ready_sunday_brunch!(viewer_id, peers) do
    conv =
      ensure_group!(
        viewer_id,
        [peers.maya, peers.sabrina, peers.nina],
        "Sunday Table"
      )

    seed_msg(
      conv,
      peers.sabrina,
      "world-brunch-sabrina-1",
      "Herb & Wood does a Sunday brunch now — 11 work for everyone?"
    )

    seed_msg(
      conv,
      peers.maya,
      "world-brunch-maya-1",
      "Works for me. Their lemon pancakes are worth the drive."
    )

    seed_msg(conv, peers.nina, "world-brunch-nina-1", "In. I'll book if we hit five people.")

    plan =
      ensure_plan!(conv, %{
        title: "Sunday brunch at Herb & Wood",
        status: "agreed",
        location: "Herb & Wood, Little Italy",
        start_at: next_sunday_late_morning(),
        time_label: "Sunday · 11:00 AM",
        created_by_user_id: peers.sabrina
      })

    plan = ensure_plan_image!(plan, "brunch.jpg")

    ensure_participants!(plan, [
      {viewer_id, "participant", "accepted"},
      {peers.maya, "participant", "accepted"},
      {peers.sabrina, "lead", "accepted"},
      {peers.nina, "participant", "accepted"}
    ])

    plan_summary(plan, "ready")
  end

  defp past_sunset_picnic!(viewer_id, peers) do
    {:ok, direct} = Messages.ensure_direct_conversation(viewer_id, peers.alex)
    conv = direct.conversation_id

    seed_msg(
      conv,
      peers.alex,
      "world-picnic-alex-1",
      "That sunset was ridiculous. Same spot next month?"
    )

    seed_msg(
      conv,
      viewer_id,
      "world-picnic-you-1",
      "Deal. I'll bring the blanket that actually fits everyone."
    )

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    start = DateTime.add(now, -3 * 24 * 3600, :second)

    plan =
      ensure_plan!(conv, %{
        title: "Sunset picnic at Tamarack Beach",
        status: "completed",
        location: "Tamarack Beach, Carlsbad",
        start_at: start,
        end_at: DateTime.add(start, 2 * 3600, :second),
        completed_at: DateTime.add(start, 2 * 3600, :second),
        time_label: "Tamarack Beach · Golden hour",
        created_by_user_id: peers.alex
      })

    plan = ensure_plan_image!(plan, "picnic_sunset.jpg")

    ensure_participants!(plan, [
      {viewer_id, "participant", "accepted"},
      {peers.alex, "lead", "accepted"}
    ])

    plan_summary(plan, "past")
  end

  defp past_saturday_ride!(viewer_id, peers) do
    conv =
      ensure_group!(
        viewer_id,
        [peers.jordan, peers.marcus, peers.maya],
        "Weekend Crew"
      )

    seed_msg(
      conv,
      peers.jordan,
      "world-ride-jordan-1",
      "Legs are still feeling that ride. Worth it for the pier coffee though."
    )

    seed_msg(
      conv,
      peers.marcus,
      "world-ride-marcus-1",
      "Next time we start an hour earlier and beat the headwind."
    )

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    start = DateTime.add(now, -8 * 24 * 3600, :second)

    plan =
      ensure_plan!(conv, %{
        title: "Saturday ride to Oceanside",
        status: "completed",
        location: "Oceanside Pier",
        start_at: start,
        end_at: DateTime.add(start, 3 * 3600, :second),
        completed_at: DateTime.add(start, 3 * 3600, :second),
        time_label: "Saturday · 9:00 AM",
        created_by_user_id: peers.jordan
      })

    plan = ensure_plan_image!(plan, "coastal_ride.jpg")

    ensure_participants!(plan, [
      {viewer_id, "participant", "accepted"},
      {peers.jordan, "lead", "accepted"},
      {peers.marcus, "participant", "accepted"},
      {peers.maya, "participant", "declined"}
    ])

    plan_summary(plan, "past")
  end

  # V-1 identity coherence (Repair #20 amendment): the Maya direct
  # thread's missed-call open question ("Can we talk tonight about
  # Saturday?") folds into a plan at read time. Born from the fold
  # with no locked activity, its fallback title names the OTHER
  # participant from the question-owner's seat - "Plan with Ethan
  # Walker" - which the viewer then sees as a plan with THEMSELVES.
  # A capture world must be identity-coherent: the greeting names
  # the viewer, and no card may name the viewer as their own
  # counterparty. So the world carries the plan explicitly, titled
  # by its subject (Maya's own words), lineage-stamped the way the
  # Juniper seed stamps its plan, and any fold-born people-titled
  # row already in the conversation is retitled onto it.
  defp ensure_maya_direct_plan!(viewer_id, peers) do
    {:ok, direct} = Messages.ensure_direct_conversation(viewer_id, peers.maya)
    conv = direct.conversation_id
    title = "Talk tonight about Saturday"

    fold_born =
      from(p in SharedPlan,
        where:
          p.conversation_id == ^conv and p.status in ^~w(tentative agreed changed) and
            like(p.title, "Plan with %"),
        order_by: [desc: p.inserted_at],
        limit: 1
      )
      |> Repo.one()

    plan =
      case fold_born do
        %SharedPlan{} = existing ->
          alignment =
            (existing.alignment || %{"schema_version" => 1})
            |> Map.put("lineage_id", existing.id)

          {:ok, retitled} =
            existing
            |> SharedPlan.changeset(%{title: title, alignment: alignment})
            |> Repo.update()

          retitled

        nil ->
          ensured =
            ensure_plan!(conv, %{
              title: title,
              status: "tentative",
              location: nil,
              time_label: "tomorrow after 10 PM",
              created_by_user_id: peers.maya
            })

          ensure_participants!(ensured, [
            {peers.maya, "lead", "accepted"},
            {viewer_id, "participant", "pending"}
          ])

          ensured
      end

    plan_summary(plan, "action")
  end

  # --- calls -------------------------------------------------------------

  defp seed_calls!(viewer_id, peers) do
    {:ok, maya_direct} = Messages.ensure_direct_conversation(viewer_id, peers.maya)
    {:ok, chanelle_direct} = Messages.ensure_direct_conversation(viewer_id, peers.chanelle)
    {:ok, jordan_direct} = Messages.ensure_direct_conversation(viewer_id, peers.jordan)

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    two_hours_ago = DateTime.add(now, -2 * 3600, :second)
    yesterday = DateTime.add(now, -26 * 3600, :second)

    missed =
      ensure_call!(%{
        caller_user_id: peers.maya,
        callee_user_id: viewer_id,
        conversation_id: maya_direct.conversation_id,
        status: "missed",
        correlation_id: "seed-world-call-maya-missed-#{viewer_id}",
        ringing_at: two_hours_ago
      })

    # The unresolved action attached to the missed call: Maya's open
    # question, recorded as call lineage (never plan authority).
    ensure_call_outcome!(missed, %{
      conversation_id: maya_direct.conversation_id,
      outcome_type: "open_question_created",
      source_type: "call",
      actor_user_id: peers.maya,
      after_value: "Can we talk tonight about Saturday?",
      idempotency_key: "seed-world-call-maya-missed-open-question-#{viewer_id}"
    })

    seed_msg(
      maya_direct.conversation_id,
      peers.maya,
      "world-call-maya-followup",
      "Sorry I missed you earlier — can we talk tonight about Saturday?"
    )

    answered =
      ensure_call!(%{
        caller_user_id: viewer_id,
        callee_user_id: peers.chanelle,
        conversation_id: chanelle_direct.conversation_id,
        status: "ended",
        correlation_id: "seed-world-call-chanelle-answered-#{viewer_id}",
        ringing_at: yesterday
      })

    answered
    |> CallSession.transition_changeset(%{
      status: "ended",
      answered_at: DateTime.add(yesterday, 20, :second),
      ended_at: DateTime.add(yesterday, 14 * 60, :second),
      ended_reason: "completed"
    })
    |> Repo.update!()

    ensure_call_outcome!(answered, %{
      conversation_id: chanelle_direct.conversation_id,
      outcome_type: "plan_time_kept",
      source_type: "call",
      actor_user_id: peers.chanelle,
      after_value: "Saturday · 7:30 PM",
      idempotency_key: "seed-world-call-chanelle-time-kept-#{viewer_id}"
    })

    cancelled =
      ensure_call!(%{
        caller_user_id: viewer_id,
        callee_user_id: peers.jordan,
        conversation_id: jordan_direct.conversation_id,
        status: "canceled",
        correlation_id: "seed-world-call-jordan-cancelled-#{viewer_id}",
        ringing_at: DateTime.add(now, -5 * 3600, :second)
      })

    [
      %{
        "id" => missed.id,
        "state" => "missed",
        "with" => "Maya Torres",
        "unresolved_action" => true
      },
      %{
        "id" => answered.id,
        "state" => "answered",
        "with" => "Chanelle Brooks",
        "unresolved_action" => false
      },
      %{
        "id" => cancelled.id,
        "state" => "canceled",
        "with" => "Jordan Ellis",
        "unresolved_action" => false
      }
    ]
  end

  defp ensure_call!(attrs) do
    case Repo.get_by(CallSession, correlation_id: attrs.correlation_id) do
      %CallSession{} = existing ->
        existing

      nil ->
        attrs
        |> CallSession.create_changeset()
        |> Repo.insert!()
    end
  end

  defp ensure_call_outcome!(%CallSession{} = call, attrs) do
    case Repo.get_by(CallOutcome, idempotency_key: attrs.idempotency_key) do
      %CallOutcome{} = existing ->
        existing

      nil ->
        %CallOutcome{}
        |> CallOutcome.changeset(Map.put(attrs, :call_id, call.id))
        |> Repo.insert!()
    end
  end

  # --- opal conversations (Orbits) ------------------------------------
  #
  # Repair #19 W20 (JA-10): before this, the world seeded ZERO Opal
  # conversations, so Orbits — a headline surface — was invisible in
  # the pack (the orbit log showed only "Continuing — New chat").
  # Every chat below is born through the REAL birth paths
  # (create_scoped_session/2 for anchored chats, start_new_chat/1
  # for unanchored ones), titled through rename_conversation/3, and
  # given one user message so the log carries a real preview.
  # Idempotent by title: a re-seed finds the titled sessions and
  # births nothing new.

  defp seed_opal_conversations!(viewer_id, peers, plans) do
    brunch = Enum.find(plans, &(&1["title"] == "Sunday brunch at Herb & Wood"))
    {:ok, maya_direct} = Messages.ensure_direct_conversation(viewer_id, peers.maya)

    specs = [
      %{
        birth:
          {:scoped,
           %{"person_id" => peers.maya, "conversation_id" => maya_direct.conversation_id}},
        title: "Saturday with Maya",
        body: "Help me plan something good with Maya for Saturday."
      },
      %{
        birth: {:scoped, %{"person_id" => peers.maya}},
        title: "A gift idea for Maya",
        body: "What would Maya actually love for her birthday this year?"
      },
      %{
        birth: {:scoped, %{"person_id" => peers.sabrina, "plan_id" => brunch["id"]}},
        title: "Brunch headcount",
        body: "Who still needs to answer about Sunday brunch?"
      },
      %{
        birth: {:scoped, %{"person_id" => peers.jordan}},
        title: "Just between us — Jordan",
        body: "Keep this one between us: a surprise for Jordan.",
        private_anchor: {"person", peers.jordan}
      },
      %{
        # W21 (ABS-1): a PENDING anchor proposal, seeded through the
        # real stored state the proposal mechanism reads — an
        # UNANCHORED Opal conversation whose Opal reply carries the
        # context_snapshot the Center pipeline stamps on its own
        # replies (OpalConversations post_message: metadata
        # "context_snapshot" with "who"). The web's detection
        # (anchorProposalFromMessages) resolves that name uniquely
        # against the account's contacts and offers the chip; no
        # anchor is filed until the user accepts. Nothing here is a
        # painted fixture: the conversation is born through
        # start_new_chat and the reply is a real OpalMessage row.
        birth: :new,
        title: "A birthday gift for Maya",
        body: "I want to get Maya something thoughtful for her birthday.",
        opal_reply: %{
          body:
            "Maya lights up around good food and the coast. A small dinner with her favorite people, or a morning at the pier, would land well. Want me to shape one of those into a plan?",
          who: "Maya Torres"
        }
      },
      %{
        birth: :new,
        title: "Weekend ideas",
        body: "Give me three ideas for this weekend that are not dinner."
      },
      %{
        birth: :new,
        title: "Thank-you note help",
        body: "Help me write a short thank-you note to Sabrina."
      }
    ]

    Enum.map(specs, fn spec ->
      conv = ensure_opal_chat!(viewer_id, spec)
      %{"id" => conv.id, "title" => spec.title}
    end)
  end

  defp ensure_opal_chat!(viewer_id, spec) do
    existing =
      viewer_id
      |> OpalConversations.list_sessions(limit: 200)
      |> Enum.find(&(&1["title"] == spec.title))

    conv =
      case existing do
        %{"id" => id} ->
          {:ok, conv} = OpalConversations.get_conversation_for_user(viewer_id, id)
          conv

        nil ->
          {:ok, %{conversation: conv}} =
            case spec.birth do
              {:scoped, scope} -> OpalConversations.create_scoped_session(viewer_id, scope)
              :new -> OpalConversations.start_new_chat(viewer_id)
            end

          {:ok, _} = OpalConversations.rename_conversation(viewer_id, conv.id, spec.title)
          conv
      end

    if OpalConversations.list_messages(conv.id, 5) == [] do
      %OpalMessage{}
      |> OpalMessage.changeset(%{
        "conversation_id" => conv.id,
        "role" => "user",
        "body" => spec.body
      })
      |> Repo.insert!()
    end

    # W21 (ABS-1): the spec's Opal reply — a real OpalMessage row in
    # the exact shape the Center pipeline writes (role "opal",
    # metadata "context_snapshot" naming who the reply is about).
    # Idempotent: inserted only when the conversation has no Opal
    # reply yet.
    if Map.has_key?(spec, :opal_reply) do
      already_replied =
        conv.id
        |> OpalConversations.list_messages(50)
        |> Enum.any?(&(&1.role == "opal"))

      unless already_replied do
        %OpalMessage{}
        |> OpalMessage.changeset(%{
          "conversation_id" => conv.id,
          "role" => "opal",
          "body" => spec.opal_reply.body,
          "metadata" => %{
            "context_snapshot" => %{"who" => spec.opal_reply.who}
          }
        })
        |> Repo.insert!()
      end
    end

    if Map.has_key?(spec, :private_anchor) do
      {anchor_type, anchor_id} = spec.private_anchor
      {:ok, _} = OpalConversations.set_orbit_private(viewer_id, anchor_type, anchor_id, true)
    end

    conv
  end

  # --- moments + live (Repair #24 WS-9) --------------------------------
  #
  # Diagnosis (proven by r24_seedworld_stageability_test.exs red at the
  # R23 tip): this world seeded plans, calls, stories and chats, but no
  # SocialMoment records and no LiveRooms at all, so A's home feed
  # composed zero moment cards (HomeFeed reads SocialMomentRecord rows
  # through SocialMomentPublishing.list_for_viewer) and zero live cards
  # (the client reads Lives.list_visible_lives). The stories above are
  # TemporaryStory rows - they feed the rail, never the stream's moment
  # cards - so their presence never staged either journey.

  # Moments: real posts by A's own people, published through the real
  # owner (SocialMomentPublishing.publish) with real seed photos
  # uploaded through the same media owner the stories use. Every
  # author holds a direct (dyad) conversation with the viewer, which
  # is exactly the relationship authority "friends" visibility checks
  # (RelationshipGraph.friend_visibility_authorized?), so A can see
  # them and a stranger cannot. Engagement is seeded through the real
  # engagement owner by people authorized to interact (the viewer and
  # each moment's own author), in varied states: one thread the
  # comments door can open, one moment the viewer has lit, one the
  # viewer saved, one the viewer reposted, one still quiet.
  # Idempotent: moments are found by (author, caption); likes /
  # reposts / saves are the owner's own idempotent writes; comments
  # are insert-missing-only by (moment, author, body).
  @seed_moments [
    %{
      author: :maya,
      caption: "Dahlias were worth the early start - the flower stall did not disappoint",
      place: "Oceanside Farmers Market",
      asset: "story_flowers.jpg",
      engage: :thread
    },
    %{
      author: :chanelle,
      caption: "Booked the corner table for Saturday - Juniper & Ivy at golden hour",
      place: "Juniper & Ivy",
      asset: "juniper_dinner.jpg",
      engage: :commented
    },
    %{
      author: :sabrina,
      caption: "The little bakery on my block finally opened - cardamom bun first, obviously",
      place: nil,
      asset: "brunch.jpg",
      engage: :quiet
    },
    %{
      author: :alex,
      caption: "Tamarack at golden hour, from the picnic blanket",
      place: "Tamarack Beach, Carlsbad",
      asset: "picnic_sunset.jpg",
      engage: :saved
    },
    %{
      author: :priya,
      caption: "Sunday coast path scouting - coffee first, then the walk down to Moonlight",
      place: "Moonlight Beach, Encinitas",
      asset: "coffee_walk.jpg",
      engage: :reposted
    }
  ]

  defp seed_moments!(viewer_id, peers) do
    Enum.map(@seed_moments, fn spec ->
      author_id = Map.fetch!(peers, spec.author)
      moment = ensure_moment!(author_id, spec)
      ensure_moment_engagement!(viewer_id, author_id, moment["id"], spec.engage)

      %{
        "id" => moment["id"],
        "author" => display_name_of(author_id),
        "caption" => spec.caption
      }
    end)
  end

  defp ensure_moment!(author_id, spec) do
    existing =
      from(m in SocialMomentRecord,
        where: m.author_user_id == ^author_id and m.caption == ^spec.caption,
        order_by: [asc: m.inserted_at],
        limit: 1
      )
      |> Repo.one()

    case existing do
      %SocialMomentRecord{} = record ->
        SocialMomentRecord.public_contract(record)

      nil ->
        {:ok, media_id} = upload_seed_image(author_id, spec.asset)

        attrs = %{
          "caption" => spec.caption,
          "visibility" => "friends",
          "media_ids" => [media_id]
        }

        attrs =
          if spec.place,
            do: Map.put(attrs, "place_ref", %{"display_name" => spec.place}),
            else: attrs

        {:ok, %{"moment" => moment}} = SocialMomentPublishing.publish(author_id, attrs)
        moment
    end
  end

  defp ensure_moment_engagement!(_viewer_id, _author_id, _moment_id, :quiet), do: :ok

  defp ensure_moment_engagement!(viewer_id, author_id, moment_id, :thread) do
    {:ok, _} = SocialMomentEngagement.like(viewer_id, moment_id)

    ensure_comment!(
      viewer_id,
      moment_id,
      "Save me a bunch of the pink ones - I will swing by on my way over"
    )

    ensure_comment!(
      author_id,
      moment_id,
      "Already set aside. They are too good to share, honestly"
    )

    :ok
  end

  defp ensure_moment_engagement!(viewer_id, _author_id, moment_id, :commented) do
    ensure_comment!(viewer_id, moment_id, "Golden hour on that patio is the whole reason to go")
    :ok
  end

  defp ensure_moment_engagement!(viewer_id, _author_id, moment_id, :saved) do
    {:ok, _} = SocialMomentEngagement.save(viewer_id, moment_id)
    :ok
  end

  defp ensure_moment_engagement!(viewer_id, _author_id, moment_id, :reposted) do
    {:ok, _} = SocialMomentEngagement.repost(viewer_id, moment_id)
    :ok
  end

  # add_comment is not idempotent in the engagement owner, so the
  # seed guards it the same insert-missing-only way it guards
  # participant rows: an existing identical comment is left alone.
  defp ensure_comment!(author_id, moment_id, body) do
    existing =
      from(c in SocialMomentComment,
        where:
          c.moment_id == ^moment_id and c.author_user_id == ^author_id and c.body == ^body and
            is_nil(c.deleted_at),
        limit: 1
      )
      |> Repo.one()

    case existing do
      %SocialMomentComment{} ->
        :ok

      nil ->
        {:ok, _} = SocialMomentEngagement.add_comment(author_id, moment_id, body)
        :ok
    end
  end

  # One live room, hosted by Maya Torres at the market - she is the
  # market run's lead and her seeded words already put her there
  # ("I'm by the flower stall"). The room is born through the real
  # Lives owner (go_live), at a venue carrying the seed place's real
  # name; the venue graduates out of quarantine the same way the
  # Lives suite's own helper graduates the venues it stands up, so
  # the place label the card renders is the place's name plainly.
  # Idempotent: a host has at most one active room (the owner ends
  # prior rooms on a new go-live), so an already-live room for Maya
  # is reused and a re-seed never stacks rooms or burns the owner's
  # per-day venue rate limit.
  @live_place_id "fixture_oceanside_farmers_market"
  @live_title "Morning at the flower stall"

  defp seed_live!(viewer_id, peers) do
    _ = viewer_id
    host_id = peers.maya

    room =
      case Lives.active_live_for(host_id) do
        {:ok, room, _venue} ->
          room

        {:error, :not_found} ->
          {:ok, %{live_room: room, venue: venue}} =
            Lives.go_live(host_id, @live_place_id,
              allow_fixture: true,
              name: "Oceanside Farmers Market",
              address: "Pier View Way, Oceanside",
              types: ["point_of_interest", "establishment"],
              title: @live_title,
              audience: "friends",
              location_precision: "venue"
            )

          {:ok, _} =
            venue
            |> Venue.changeset(%{status: "full", quarantine_until: nil})
            |> Repo.update()

          room
      end

    %{
      "id" => room.id,
      "host" => display_name_of(host_id),
      "title" => room.title || @live_title,
      "place" => "Oceanside Farmers Market",
      "status" => room.status
    }
  end

  defp display_name_of(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} -> name
      _ -> nil
    end
  end

  # --- stories -----------------------------------------------------------

  defp seed_stories!(viewer_id, peers) do
    [
      ensure_story!(
        viewer_id,
        "Morning light at Tamarack — picnic weather if this holds",
        "friends",
        "story_tamarack.jpg"
      ),
      ensure_story!(
        peers.maya,
        "Flower stall haul at the market this morning",
        "friends",
        "story_flowers.jpg"
      )
    ]
    |> Enum.reject(&is_nil/1)
  end

  defp ensure_story!(author_id, caption, visibility, asset) do
    existing =
      from(s in TemporaryStory,
        where: s.author_user_id == ^author_id and s.caption == ^caption,
        limit: 1
      )
      |> Repo.one()

    case existing do
      %TemporaryStory{} = story ->
        story = ensure_story_image!(story, asset)
        %{"id" => story.id, "caption" => story.caption, "author_user_id" => author_id}

      nil ->
        with {:ok, media_id} <- upload_seed_image(author_id, asset),
             {:ok, story} <-
               TemporaryStoryPublishing.create(author_id, %{
                 "media_id" => media_id,
                 "caption" => caption,
                 "visibility" => visibility,
                 "ttl_hours" => 24
               }) do
          %{"id" => story["id"], "caption" => caption, "author_user_id" => author_id}
        else
          _ -> nil
        end
    end
  end

  # BS-05 upgrade leg: a story seeded by the pre-fix world carries
  # the 1x1 PNG. When its media record is not a real image (missing,
  # or either dimension <= 1), replace the story's media with the
  # real photo — the seed converges to real imagery instead of
  # stranding the pixel forever. A story already carrying a real
  # image is left exactly as it is.
  defp ensure_story_image!(%TemporaryStory{} = story, asset) do
    if story_media_real?(story) do
      story
    else
      case upload_seed_image(story.author_user_id, asset) do
        {:ok, media_id} ->
          story
          |> Ecto.Changeset.change(%{media_ref: "media:" <> media_id})
          |> Repo.update!()

        _ ->
          story
      end
    end
  end

  defp story_media_real?(%TemporaryStory{media_ref: "media:" <> media_id}) do
    case Repo.get(SocialMomentMedia, media_id) do
      %SocialMomentMedia{width: w, height: h}
      when is_integer(w) and is_integer(h) and w > 1 and h > 1 ->
        true

      _ ->
        false
    end
  end

  defp story_media_real?(_), do: false

  # --- imagery (BS-05) ---------------------------------------------------

  # Upload one committed seed photo through the product's own media
  # owner. The media record carries the photo's real dimensions.
  defp upload_seed_image(owner_id, asset) do
    {width, height} = Map.fetch!(@seed_images, asset)

    base64 =
      :opal_core
      |> :code.priv_dir()
      |> Path.join("seed_assets/" <> asset)
      |> File.read!()
      |> Base.encode64()

    case SocialMomentPublishing.upload_media(owner_id, %{
           "base64" => base64,
           "mime_type" => "image/jpeg",
           "width" => width,
           "height" => height
         }) do
      {:ok, media} -> {:ok, media["id"]}
      other -> other
    end
  end

  # Attach a real photo to a plan that does not carry one yet
  # (insert-missing-only: an existing media_id is never rewritten).
  # The media is owned by the plan's creator — the person whose plan
  # it is — and read access for the plan's people is authorized in
  # SocialMomentPublishing.read_media/2's plan leg.
  defp ensure_plan_image!(%SharedPlan{} = plan, asset) do
    case plan.alignment do
      %{"media_id" => mid} when is_binary(mid) and mid != "" ->
        plan

      _ ->
        case upload_seed_image(plan.created_by_user_id, asset) do
          {:ok, media_id} ->
            plan
            |> SharedPlan.changeset(%{
              alignment: Map.put(plan.alignment || %{}, "media_id", media_id)
            })
            |> Repo.update!()

          _ ->
            plan
        end
    end
  end

  # The founder seeds' plans (created before this module runs) get
  # their imagery here, found by the viewer's participant row +
  # title — the same identity the seeds themselves use.
  defp ensure_named_plan_image!(viewer_id, title, asset) do
    plan =
      from(p in SharedPlan,
        join: pp in PlanParticipant,
        on: pp.plan_id == p.id and pp.user_id == ^viewer_id,
        where: p.title == ^title,
        limit: 1
      )
      |> Repo.one()

    if plan, do: ensure_plan_image!(plan, asset), else: nil
  end

  # --- shared helpers ----------------------------------------------------

  defp upsert_user!(id, handle, display_name) do
    case Repo.get(User, id) do
      %User{} = u ->
        if u.display_name != display_name do
          u |> User.changeset(%{display_name: display_name}) |> Repo.update!()
        else
          u
        end

      nil ->
        %User{}
        |> User.changeset(%{id: id, handle: handle, display_name: display_name})
        |> Repo.insert!()
    end
  end

  defp ensure_group!(viewer_id, other_ids, label) do
    existing =
      from(c in Conversation,
        join: m in ConversationMember,
        on: m.conversation_id == c.id,
        where: c.label == ^label and m.user_id == ^viewer_id,
        select: c.id,
        limit: 1
      )
      |> Repo.one()

    case existing do
      cid when is_binary(cid) ->
        for uid <- [viewer_id | other_ids], do: ensure_member!(cid, uid)
        cid

      nil ->
        case Messages.create_group_conversation(viewer_id, other_ids, label: label) do
          {:ok, result} ->
            cid = result.conversation_id
            for uid <- [viewer_id | other_ids], do: ensure_member!(cid, uid)
            cid

          {:error, reason} ->
            raise "human seed world group failed (#{label}): #{inspect(reason)}"
        end
    end
  end

  defp ensure_member!(conversation_id, user_id) do
    case Repo.get_by(ConversationMember,
           conversation_id: conversation_id,
           user_id: user_id
         ) do
      %ConversationMember{} ->
        :ok

      nil ->
        %ConversationMember{}
        |> ConversationMember.changeset(%{
          conversation_id: conversation_id,
          user_id: user_id
        })
        |> Repo.insert!()
    end
  end

  defp ensure_plan!(conversation_id, attrs) do
    case from(p in SharedPlan,
           where: p.conversation_id == ^conversation_id and p.title == ^attrs.title,
           order_by: [desc: p.inserted_at],
           limit: 1
         )
         |> Repo.one() do
      %SharedPlan{} = existing ->
        existing

      nil ->
        {:ok, created} =
          %SharedPlan{}
          |> SharedPlan.changeset(
            Map.merge(attrs, %{
              conversation_id: conversation_id,
              timezone: "America/Los_Angeles",
              source: "conversation",
              alignment: %{"schema_version" => 1}
            })
          )
          |> Repo.insert()

        {:ok, stamped} =
          created
          |> SharedPlan.changeset(%{
            alignment: Map.put(created.alignment, "lineage_id", created.id)
          })
          |> Repo.update()

        stamped
    end
  end

  # Insert-missing-only: an existing participant row (and its RSVP) is
  # never rewritten by re-seeding — the same law the Juniper seed follows.
  defp ensure_participants!(plan, rows) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for {user_id, role, state} <- rows do
      case Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: user_id) do
        %PlanParticipant{} ->
          :ok

        nil ->
          %PlanParticipant{}
          |> PlanParticipant.changeset(%{
            plan_id: plan.id,
            user_id: user_id,
            role: role,
            response_state: state,
            responded_at: now,
            authority_source: "human_seed_world"
          })
          |> Repo.insert!()
      end
    end

    :ok
  end

  defp plan_summary(%SharedPlan{} = plan, state_family) do
    %{
      "id" => plan.id,
      "title" => plan.title,
      "status" => plan.status,
      "state_family" => state_family,
      "location" => plan.location,
      "has_image" =>
        case plan.alignment do
          %{"media_id" => mid} when is_binary(mid) and mid != "" -> true
          _ -> false
        end
    }
  end

  # Repair #19 BS-12 — the brunch instant is built in the world's
  # home zone (@home_zone), NOT in UTC: the plan's label says
  # "Sunday · 11:00 AM", so the stored instant is next Sunday at
  # 11:00 AM home-zone time. (The pre-fix seed built 11:00 UTC,
  # which is 4:00 AM PDT — the label and the instant disagreed by
  # the whole zone offset.) No tzdata dependency exists in this
  # app, so the zone's UTC offset follows the US DST rule directly
  # (the same fixed-rule approach SharedPlan's local-time code
  # uses): PDT (-7) from the second Sunday of March to the first
  # Sunday of November, PST (-8) otherwise. At an 11:00 AM target
  # the date-level rule is exact — the 2:00 AM switch has already
  # happened by 11:00 AM on a switch day.
  defp next_sunday_late_morning do
    utc_now = DateTime.utc_now()

    today_local =
      utc_now
      |> DateTime.add(home_zone_offset_seconds(DateTime.to_date(utc_now)), :second)
      |> DateTime.to_date()

    days = rem(7 - Date.day_of_week(today_local) + 7, 7)
    days = if days == 0, do: 7, else: days
    sunday = Date.add(today_local, days)
    offset = home_zone_offset_seconds(sunday)

    sunday
    |> NaiveDateTime.new!(~T[11:00:00])
    |> DateTime.from_naive!("Etc/UTC")
    |> DateTime.add(-offset, :second)
    |> DateTime.truncate(:microsecond)
  end

  defp home_zone_offset_seconds(%Date{} = date) do
    dst_start = nth_weekday_of_month(date.year, 3, 7, 2)
    dst_end = nth_weekday_of_month(date.year, 11, 7, 1)

    if Date.compare(date, dst_start) != :lt and Date.compare(date, dst_end) == :lt do
      -7 * 3600
    else
      -8 * 3600
    end
  end

  # dow uses Date.day_of_week/1 numbering (Monday = 1, Sunday = 7).
  defp nth_weekday_of_month(year, month, dow, n) do
    first = Date.new!(year, month, 1)
    delta = rem(dow - Date.day_of_week(first) + 7, 7)
    Date.add(first, delta + (n - 1) * 7)
  end

  defp seed_msg(conversation_id, sender_user_id, client_message_id, body) do
    _ =
      Messages.accept_message(%{
        conversation_id: conversation_id,
        sender_user_id: sender_user_id,
        client_message_id: client_message_id,
        message_type: "text",
        body: body
      })

    :ok
  end
end
