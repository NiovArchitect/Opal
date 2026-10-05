defmodule OpalCoreWeb.Router do
  use OpalCoreWeb, :router

  pipeline :api do
    plug(:accepts, ["json"])
  end

  pipeline :dev_auth do
    plug(OpalCoreWeb.Plugs.DevAuth)
  end

  pipeline :product_auth do
    plug(OpalCoreWeb.Plugs.ProductAuth)
  end

  scope "/", OpalCoreWeb do
    pipe_through(:api)
    get("/health", HealthController, :show)
  end

  # DEV/TEST ONLY — runtime provenance (no secrets, no DevAuth header).
  # Compile-excluded from production releases.
  if Mix.env() in [:dev, :test] do
    scope "/api/dev", OpalCoreWeb do
      pipe_through(:api)
      get("/runtime-authority", RuntimeAuthorityController, :show)
    end
  end

  # Product surface (SF15) — session-backed. Synthetic SMS provider only.
  scope "/api/v1/product", OpalCoreWeb do
    pipe_through(:api)

    post("/activation/challenges", ActivationController, :start_challenge)
    post("/activation/verify", ActivationController, :verify)
    # Bounded invite preview by opaque share token (no session, no phone in URL).
    get("/invitations/share/:token", InvitationController, :preview_share)
  end

  scope "/api/v1/product", OpalCoreWeb do
    pipe_through([:api, :product_auth])

    get("/session", SessionController, :show)
    delete("/session", SessionController, :delete)
    patch("/session/profile", SessionController, :update_profile)
    get("/preferences/messaging", SessionController, :messaging_preferences)
    patch("/preferences/messaging", SessionController, :update_messaging_preferences)
    get("/preferences/assist", SessionController, :assist_preference)
    patch("/preferences/assist", SessionController, :update_assist_preference)
    post("/socket-ticket", SessionController, :socket_ticket)

    # Pass 27 — thin durable FollowGraph product surface (FOLLOW ≠ FRIEND)
    get("/follows", FollowController, :index)
    get("/follows/status", FollowController, :status)
    post("/follows", FollowController, :create)
    delete("/follows/:creator_user_id", FollowController, :delete)

    post("/contacts/resolve", ContactController, :resolve)

    post("/invitations", InvitationController, :create)
    get("/invitations/incoming", InvitationController, :incoming)
    get("/invitations/outgoing", InvitationController, :outgoing)
    get("/people", InvitationController, :people)
    # Resume invite after activation via short-lived continuation (not raw share token).
    post("/invitations/continue", InvitationController, :continue)
    get("/invitations/:id", InvitationController, :show)
    post("/invitations/:id/accept", InvitationController, :accept)
    post("/invitations/:id/decline", InvitationController, :decline)

    post(
      "/conversations/:id/alignment/private",
      ConversationController,
      :private_participation
    )

    # Additive availability alignment (Find a time) — does not replace messaging/Set.
    get("/availability/windows", AvailabilityController, :index_windows)
    post("/availability/windows", AvailabilityController, :create_window)
    patch("/availability/windows/:window_id", AvailabilityController, :update_window)
    delete("/availability/windows/:window_id", AvailabilityController, :delete_window)

    post("/conversations/:id/availability/share", AvailabilityController, :share)

    post(
      "/conversations/:id/availability/shares/:share_id/revoke",
      AvailabilityController,
      :revoke
    )

    get("/conversations/:id/availability/shared", AvailabilityController, :list_shared)

    get(
      "/conversations/:id/availability/mine",
      AvailabilityController,
      :list_mine_in_conversation
    )

    get("/conversations/:id/availability/overlap", AvailabilityController, :overlap)

    get(
      "/conversations/:id/availability/intervention",
      AvailabilityController,
      :intervention
    )

    post(
      "/conversations/:id/availability/correct",
      AvailabilityController,
      :correct
    )

    # Real-world connectors — status/OAuth only; no provider chrome UI.
    get("/connectors", ConnectorController, :index)
    get("/connectors/google_calendar", ConnectorController, :google_status)
    post("/connectors/google_calendar/start", ConnectorController, :google_start)
    post("/connectors/google_calendar/callback", ConnectorController, :google_callback)
    post("/connectors/google_calendar/revoke", ConnectorController, :google_revoke)
    post("/connectors/google_calendar/simulate", ConnectorController, :google_simulate)

    get("/conversations", ConversationController, :index)
    post("/conversations/direct", ConversationController, :ensure_direct)
    post("/conversations/group", ConversationController, :create_group)
    post("/conversations/:id/read", ConversationController, :mark_read)
    post("/conversations/:id/notifications", ConversationController, :set_notifications)

    # Founder-review opt-in only — never production default. Existing Messages owner.
    post(
      "/dev/founder-communication-seed",
      FounderSeedController,
      :ensure_communication
    )
    post(
      "/dev/founder-graph-commitment-seed",
      FounderSeedController,
      :ensure_graph_commitment
    )
    get("/conversations/:id/messages", ConversationController, :messages)
    post("/conversations/:id/messages", ConversationController, :create_message)
    # Phase 11A — tentative SharedPlan from curated conversation option
    post("/conversations/:id/plans", ConversationController, :create_plan)
    get("/conversations/:id/alignment", ConversationController, :alignment)
    get("/conversations/:id/outcomes", ConversationController, :outcomes)
    post("/conversations/:id/alignment/confirm", ConversationController, :confirm_alignment)
    post("/conversations/:id/alignment/activity", ConversationController, :set_alignment_activity)
    post("/conversations/:id/alignment/place/confirm", ConversationController, :confirm_alignment_place)
    post("/conversations/:id/alignment/place/decline", ConversationController, :decline_alignment_place)
    post("/conversations/:id/alignment/place/reopen", ConversationController, :reopen_alignment_place)
    post("/conversations/:id/alignment/place", ConversationController, :nominate_alignment_place)
    post("/conversations/:id/alignment/reservation/authorize", ConversationController, :authorize_alignment_reservation)
    post("/conversations/:id/alignment/change/accept", ConversationController, :accept_alignment_change)
    post("/conversations/:id/alignment/change/keep", ConversationController, :keep_alignment_plan)
    post("/conversations/:id/alignment/change/datetime", ConversationController, :propose_alignment_datetime)
    post("/conversations/:id/alignment/change", ConversationController, :propose_alignment_change)
    post("/conversations/:id/members", ConversationController, :add_member)
    post("/conversations/:id/block", ConversationController, :block_peer)

    # R3-early — 1:1 call signaling (WebRTC media on client; BEAM owns session)
    get("/calls", CallController, :index)
    post("/calls", CallController, :create)
    get("/calls/:id", CallController, :show)
    get("/calls/:id/outcomes", CallController, :outcomes)
    post("/calls/:id/connected", CallController, :mark_connected)
    post("/calls/:id/answer", CallController, :answer)
    post("/calls/:id/decline", CallController, :decline)
    post("/calls/:id/cancel", CallController, :cancel)
    post("/calls/:id/hangup", CallController, :hangup)
    get("/calls/:id/assist", CallController, :assist)
    post("/calls/:id/assist", CallController, :set_assist)
    post("/calls/:id/transcription/grant", CallController, :transcription_grant)
    post("/calls/:id/transcripts", CallController, :transcript)

    # Track A3 — SharedPlan execution readiness (LIVE booking NOT claimed)
    get("/plans/:id/execution", PlanExecutionController, :show)
    post("/plans/:id/execution/authorize", PlanExecutionController, :authorize)
    post("/plans/:id/execution", PlanExecutionController, :execute)

    # Track A6.1 — Attention Center projection (AttentionAuthority → bell)
    get("/attention", AttentionCenterController, :show)
    post("/attention/ingest", AttentionCenterController, :ingest)
    post("/attention/resolve", AttentionCenterController, :resolve)
    post("/attention/seen", AttentionCenterController, :seen)

    # Phase 2A — device push tokens (upsert / soft-disable)
    post("/devices/tokens", DeviceTokenController, :create)
    delete("/devices/tokens", DeviceTokenController, :delete)

    # Pass 19–20 — Reservation execution (synthetic; LIVE NOT CLAIMED)
    get("/reservations/status", ReservationExecutionController, :status)
    post("/reservations/availability", ReservationExecutionController, :check_availability)
    post("/reservations/authorize", ReservationExecutionController, :authorize)
    post("/reservations", ReservationExecutionController, :request_booking)
    get("/reservations/:id", ReservationExecutionController, :show)
    post("/reservations/:id/reconcile", ReservationExecutionController, :reconcile)
    post("/reservations/:id/cancel", ReservationExecutionController, :cancel)
    post("/reservations/:id/drift", ReservationExecutionController, :drift)

    # Pass 17–23 — Social Moment publishing (LOCAL_DEV media; no public CDN claim)
    # Home production hydration + engagement (Memory = SocialMoment projection)
    get("/home/feed", SocialMomentController, :home_feed)
    get("/stories", SocialMomentController, :list_stories)
    post("/stories", SocialMomentController, :create_story)
    delete("/stories/:id", SocialMomentController, :delete_story)

    # Graph → Journey authority (SharedPlan lineage)
    post("/journeys/activate", JourneyController, :activate)
    get("/journeys/:id", JourneyController, :show)
    post("/journeys/:id/accept-going", JourneyController, :accept_going)
    post("/journeys/:id/cant-make-it", JourneyController, :cant_make_it)
    post("/journeys/:id/material-change", JourneyController, :material_change)
    post("/journeys/:id/reconfirm", JourneyController, :reconfirm)
    post("/journeys/:id/add-people", JourneyController, :add_people)
    post("/journeys/:id/assign-co-lead", JourneyController, :assign_co_lead)
    post("/journeys/:id/handoff-lead", JourneyController, :handoff_lead)

    # Phase 4C — trip HTTP API (shared social adventure; not outing Journey)
    post("/trips", TripController, :create)
    get("/trips", TripController, :index)
    get("/trips/:id", TripController, :show)
    patch("/trips/:id", TripController, :update)
    post("/trips/:id/legs", TripController, :add_leg)
    patch("/trips/:id/legs/reorder", TripController, :reorder_legs)
    delete("/trips/:id/legs/:leg_id", TripController, :remove_leg)
    post("/trips/:id/legs/:leg_id/link-plan", TripController, :link_plan)
    post("/trips/:id/legs/:leg_id/create-plan", TripController, :create_plan)
    post("/trips/:id/curate", TripController, :curate)

    # Phase 1D — act-on-behalf consent management (grant/revoke/list)
    get("/consents", ConsentController, :index)
    post("/consents", ConsentController, :create)
    delete("/consents/:id", ConsentController, :delete)

    # Phase 7A — memory transparency ("What Opal remembers")
    get("/memory/facts", MemoryController, :index_facts)
    delete("/memory/facts/:id", MemoryController, :delete_fact)

    # Phase 10A — celebrations (birthday / anniversary)
    get("/celebrations", CelebrationController, :index)
    post("/celebrations", CelebrationController, :create)
    delete("/celebrations/:id", CelebrationController, :delete)

    get("/social-moments/media-status", SocialMomentController, :media_status)
    post("/social-moments/media", SocialMomentController, :upload_media)
    get("/social-moments/media/:media_id", SocialMomentController, :media)
    post("/social-moments/audience-preview", SocialMomentController, :audience_preview)
    get("/social-moments", SocialMomentController, :index)
    post("/social-moments", SocialMomentController, :create)
    get("/social-moments/:id", SocialMomentController, :show)
    patch("/social-moments/:id", SocialMomentController, :update)
    delete("/social-moments/:id", SocialMomentController, :delete)
    post("/social-moments/:id/hide", SocialMomentController, :hide)
    post("/social-moments/:id/report", SocialMomentController, :report)
    put("/social-moments/:id/like", SocialMomentController, :like)
    delete("/social-moments/:id/like", SocialMomentController, :unlike)
    get("/social-moments/:id/comments", SocialMomentController, :comments)
    post("/social-moments/:id/comments", SocialMomentController, :create_comment)
    put("/social-moments/:id/repost", SocialMomentController, :repost)
    delete("/social-moments/:id/repost", SocialMomentController, :unrepost)
    put("/social-moments/:id/save", SocialMomentController, :save)
    delete("/social-moments/:id/save", SocialMomentController, :unsave)

    # Dynamic Social Intelligence Phase 2 — conversation-scoped experience moments.
    get("/conversations/:id/opportunity", OpportunityController, :show)
    post("/conversations/:id/opportunity/evaluate", OpportunityController, :evaluate)
    post("/conversations/:id/opportunity/participation", OpportunityController, :participation)
    post("/conversations/:id/opportunity/correction", OpportunityController, :correction)
    post("/conversations/:id/opportunity/dismiss", OpportunityController, :dismiss)
    post("/conversations/:id/opportunity/complete", OpportunityController, :complete)
    post("/conversations/:id/opportunity/reflection", OpportunityController, :reflection)

    post(
      "/conversations/:id/opportunity/reflection/respond",
      OpportunityController,
      :reflection_respond
    )

    # P4.6 — Decision Intelligence cold-start product path (Nearby now → DI + OSM)
    post("/decisions/resolve", DecisionIntelligenceController, :resolve)
    post("/decisions/:id/answer_question", DecisionIntelligenceController, :answer_question)
    post("/decisions/:id/resolve_tradeoff", DecisionIntelligenceController, :resolve_tradeoff)

    # Phase 1C — curate-plans: pick people → ranked shortlist (commits nothing)
    post("/recommendations/curate", RecommendationController, :curate)
  end

  # Legacy/dev routes (DevAuth) — not product login
  scope "/api/v1", OpalCoreWeb do
    pipe_through([:api, :dev_auth])

    post("/messages", MessageController, :create)
    post("/messages/:message_id/ai-jobs", MessageController, :create_ai_job)
    get("/ai-jobs/:job_id", AiJobController, :show)

    get("/dev/events", DevProbeController, :events)
    post("/dev/events/reset", DevProbeController, :reset_events)
    get("/dev/client-info", DevProbeController, :client_info)
  end
end
