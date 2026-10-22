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
    plug(OpalCoreWeb.Plugs.ApiRateLimit)
  end

  scope "/", OpalCoreWeb do
    pipe_through(:api)
    get("/health", HealthController, :show)

    # Phase 1.5 — Twilio status callbacks (signature-validated; no product auth)
    post("/webhooks/twilio/verify", TwilioWebhookController, :verify)

    # Paste G Phase 7 — Stripe Checkout webhook (signature when STRIPE_WEBHOOK_SECRET set)
    post("/webhooks/stripe", StripeWebhookController, :webhook)

    # Phase 3 — invite landing (HTML; PUBLIC_BASE_URL aware)
    get("/invite/:code", InviteLandingController, :show)
    get("/invite", InviteLandingController, :missing)

    # Paste G Phase 9 — shareable artifact HTML (opaque expiring token; noindex)
    get("/share/artifacts/:token", ArtifactController, :show_share)
    # Paste G Phase 10 — signed TTS audio
    get("/share/voice-audio/:token", VoiceController, :show_audio)
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
    # Phase 3.1 — refresh does not require a live access token.
    post("/session/refresh", SessionController, :refresh)
    # Bounded invite preview by opaque share token (no session, no phone in URL).
    get("/invitations/share/:token", InvitationController, :preview_share)
    # Phase NE-1 — public invite code validate (join funnel)
    get("/invites/:code/validate", ProductInviteController, :validate)
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

    # Phase 3.3 — user report queue (admin UI later)
    post("/safety/reports", SafetyController, :create_report)

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
    # Google browser redirect is GET ?code=&state= — callback MUST accept GET
    # (default redirect_uri is connectors/.../callback). Cookie auth covers
    # same-origin return; POST remains for FE code-exchange.
    get("/settings/connections", ConnectorController, :settings_connections)
    post("/support/reports", SupportController, :create_report)
    get("/support/reports/:reference", SupportController, :show_report)
    # Adoption wave 2 (4.C6): support-path deletion - identical
    # AccountDeletion semantics to the self-serve route below.
    post("/support/account-deletion", SupportController, :account_deletion)

    # Adoption wave 2 - account/settings cluster (4.C2/4.C3/SF-A/4.C6)
    get("/settings/devices", SettingsAccountController, :devices_index)
    post("/settings/devices/:id/revoke", SettingsAccountController, :devices_revoke)
    get("/settings/saved-logins", SettingsAccountController, :saved_logins_index)
    post("/settings/saved-logins", SettingsAccountController, :saved_logins_create)
    delete("/settings/saved-logins/:id", SettingsAccountController, :saved_logins_delete)
    get("/settings/activity", SettingsAccountController, :activity_index)
    get("/settings/hears", SettingsAccountController, :hears_index)
    post("/settings/hears/retry", SettingsAccountController, :hears_retry)
    post("/settings/delete", SettingsAccountController, :delete_execute)
    get("/connectors", ConnectorController, :index)
    get("/connectors/google_calendar", ConnectorController, :google_status)
    post("/connectors/google_calendar/start", ConnectorController, :google_start)
    get("/connectors/google_calendar/callback", ConnectorController, :google_callback)
    post("/connectors/google_calendar/callback", ConnectorController, :google_callback)
    post("/connectors/google_calendar/revoke", ConnectorController, :google_revoke)
    post("/connectors/google_calendar/simulate", ConnectorController, :google_simulate)

    # Paste G — product OAuth aliases (calendar.readonly + gmail.readonly consent).
    get("/oauth/google/start", ConnectorController, :oauth_google_start)
    get("/oauth/google/callback", ConnectorController, :oauth_google_callback)
    post("/oauth/google/start", ConnectorController, :oauth_google_start)
    post("/oauth/google/callback", ConnectorController, :oauth_google_callback)

    # Paste W6 Phase 5 — Center now-strip day window (titles on-demand).
    get("/calendar/today", CalendarController, :today)

    get("/conversations", ConversationController, :index)
    post("/conversations/direct", ConversationController, :ensure_direct)
    # Repair #20 (F-8b) — start/find a chat by phone number.
    post("/conversations/by-phone", ConversationController, :ensure_direct_by_phone)
    # Repair #20 (F-6/F-8) — the one resolved people projection.
    get("/people/projection", PeopleController, :index)
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
    post("/presence/heartbeat", PresenceController, :heartbeat)
    post("/conversations/:id/voice_messages", ConversationController, :create_voice_message)
    post("/conversations/:id/voice_notes", ConversationController, :create_voice_note)

    patch(
      "/conversations/:id/voice_notes/:message_id/transcript",
      ConversationController,
      :correct_voice_note_transcript
    )

    # Phase 11A — tentative SharedPlan from curated conversation option
    post("/conversations/:id/plans", ConversationController, :create_plan)
    get("/conversations/:id/alignment", ConversationController, :alignment)
    get("/conversations/:id/outcomes", ConversationController, :outcomes)
    post("/conversations/:id/alignment/confirm", ConversationController, :confirm_alignment)
    post("/conversations/:id/alignment/activity", ConversationController, :set_alignment_activity)

    post(
      "/conversations/:id/alignment/place/confirm",
      ConversationController,
      :confirm_alignment_place
    )

    post(
      "/conversations/:id/alignment/place/decline",
      ConversationController,
      :decline_alignment_place
    )

    post(
      "/conversations/:id/alignment/place/reopen",
      ConversationController,
      :reopen_alignment_place
    )

    post("/conversations/:id/alignment/place", ConversationController, :nominate_alignment_place)

    post(
      "/conversations/:id/alignment/reservation/authorize",
      ConversationController,
      :authorize_alignment_reservation
    )

    post(
      "/conversations/:id/alignment/change/accept",
      ConversationController,
      :accept_alignment_change
    )

    post("/conversations/:id/alignment/change/keep", ConversationController, :keep_alignment_plan)

    post(
      "/conversations/:id/alignment/change/datetime",
      ConversationController,
      :propose_alignment_datetime
    )

    post("/conversations/:id/alignment/change", ConversationController, :propose_alignment_change)
    post("/conversations/:id/members", ConversationController, :add_member)
    get("/conversations/:id/membership", ConversationController, :membership)
    delete("/conversations/:id/members/:user_id", ConversationController, :remove_member)
    post("/conversations/:id/block", ConversationController, :block_peer)

    # R3-early — 1:1 call signaling (WebRTC media on client; BEAM owns session)
    get("/calls", CallController, :index)
    post("/calls", CallController, :create)
    get("/calls/:id", CallController, :show)
    get("/calls/:id/outcomes", CallController, :outcomes)
    post("/calls/:id/turn-credentials", CallController, :turn_credentials)
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

    # Repair #18 (B2) — at-home food step: compose a group order list +
    # per-person honest handoff. Never places an order (see FoodHandoff).
    get("/opal/food/capability", FoodStepController, :capability)
    get("/opal/plans/:id/food", FoodStepController, :show)
    post("/opal/plans/:id/food/items", FoodStepController, :items)
    post("/opal/plans/:id/food/household", FoodStepController, :household)
    post("/opal/plans/:id/food/handoff", FoodStepController, :handoff)
    post("/opal/plans/:id/food/self-confirm", FoodStepController, :self_confirm)
    post("/opal/plans/:id/food/not-ordering", FoodStepController, :not_ordering)
    post("/opal/plans/:id/food/could-not-deliver", FoodStepController, :could_not_deliver)
    post("/opal/plans/:id/food/restaurant", FoodStepController, :restaurant)
    post("/opal/plans/:id/food/composed", FoodStepController, :composed)
    post("/opal/plans/:id/food/answer-ask", FoodStepController, :answer_ask)

    # Track A6.1 — Attention Center projection (AttentionAuthority → bell)
    get("/attention", AttentionCenterController, :show)
    post("/attention/ingest", AttentionCenterController, :ingest)
    post("/attention/resolve", AttentionCenterController, :resolve)
    post("/attention/seen", AttentionCenterController, :seen)

    # Repair #18 DIR-4 - proactive reveal presentation (one derivation)
    get("/reveals", RevealController, :index)
    post("/reveals/dismiss", RevealController, :dismiss)

    # Phase X — timezone-only travel ingest (GPS rejected server-side)
    post("/travel/ingest", TravelController, :ingest)
    get("/travel/home_timezone", TravelController, :show_home_timezone)
    patch("/travel/home_timezone", TravelController, :update_home_timezone)

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
    # Repair #18 Division B (B1) - place-type conversion + revision respond
    post("/journeys/:id/convert-place-type", JourneyController, :convert_place_type)
    post("/journeys/:id/revisions/:revision_id/respond", JourneyController, :respond_revision)

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
    post("/trips/:id/curate_experience", TripController, :curate_experience)
    post("/trips/:id/convoy/opt_in", TripController, :convoy_opt_in)
    post("/trips/:id/convoy/opt_out", TripController, :convoy_opt_out)
    post("/trips/:id/convoy/ping", TripController, :convoy_ping)
    get("/trips/:id/convoy", TripController, :convoy_roster)
    # Experience curation canvas — Trip → Day → TimeBlock → Activity + RSVPs
    post("/trips/:id/days", TripController, :add_day)
    post("/trips/:id/days/:day_id/blocks", TripController, :add_time_block)
    post("/trips/:id/blocks/:block_id/activities", TripController, :add_activity)
    put("/trips/:id/activities/:activity_id/response", TripController, :set_activity_response)
    get("/trips/:id/vibe_profiles", TripController, :vibe_profiles)
    # F-12: fixture seed — gated in the controller on the founder-seed
    # flag (dev/test); not a product action, no client wiring ships.
    post("/trips/:id/seed_mexico_city_canvas", TripController, :seed_mexico_city_canvas)

    # Phase 1D — act-on-behalf consent management (grant/revoke/list)
    get("/consents", ConsentController, :index)
    post("/consents", ConsentController, :create)
    delete("/consents/:id", ConsentController, :delete)

    # Phase 7A — memory transparency ("What Opal remembers")
    get("/memory/facts", MemoryController, :index_facts)
    delete("/memory/facts/:id", MemoryController, :delete_fact)

    # Repair #18 SM scoped build — Soul + Memory wallet (W-GAP-01/02/31):
    # the wallet record, the soul over the real assistance-preference
    # truth, and capsules through the one mediated facade.
    get("/memory-wallet", SoulMemoryController, :show)
    patch("/memory-wallet/soul", SoulMemoryController, :update_soul)
    post("/memory-wallet/capsules", SoulMemoryController, :create_capsule)
    delete("/memory-wallet/capsules/:id", SoulMemoryController, :forget_capsule)

    # Paste F — intelligence product surfaces (person memory / mediation / briefings)
    post(
      "/intelligence/onboarding/copy",
      IntelligenceProductController,
      :onboarding_copy
    )

    get("/intelligence/people/:person_id/memory", IntelligenceProductController, :person_memory)

    patch(
      "/intelligence/people/:person_id/facts/:key",
      IntelligenceProductController,
      :patch_fact
    )

    delete(
      "/intelligence/people/:person_id/facts/:key",
      IntelligenceProductController,
      :delete_fact
    )

    post(
      "/intelligence/people/:person_id/facts/:key/confirm",
      IntelligenceProductController,
      :confirm_fact
    )

    get("/intelligence/mediation", IntelligenceProductController, :list_mediation)
    get("/intelligence/mediation/:id", IntelligenceProductController, :show_mediation)

    get(
      "/intelligence/groups/:conversation_id/mediation",
      IntelligenceProductController,
      :show_group_mediation
    )

    post("/intelligence/mediation/:id/send", IntelligenceProductController, :send_mediation)
    post("/intelligence/mediation/:id/dismiss", IntelligenceProductController, :dismiss_mediation)

    post(
      "/intelligence/mediation/:id/create_plan",
      IntelligenceProductController,
      :create_plan_mediation
    )

    get("/intelligence/briefings", IntelligenceProductController, :list_briefings)
    get("/intelligence/briefings/:id", IntelligenceProductController, :show_briefing)
    post("/intelligence/briefings/:id/dismiss", IntelligenceProductController, :dismiss_briefing)

    # Repair #21 (W-9 expanded) - Opal Trivia: the game's own
    # provenance-tagged guess records + subject-only validation.
    get("/trivia/guesses", TriviaController, :index)
    post("/trivia/guesses", TriviaController, :create_guess)
    post("/trivia/guesses/:id/validate", TriviaController, :validate)
    post("/trivia/guesses/:id/correct", TriviaController, :correct)

    # Phase 10A / D-2 — celebrations (birthday / anniversary) + curation
    get("/celebrations", CelebrationController, :index)
    post("/celebrations", CelebrationController, :create)
    get("/celebrations/:id/curate", CelebrationController, :curate)
    delete("/celebrations/:id", CelebrationController, :delete)

    # Repair #16 W3 — progressive profile ask surface (Repair #15 B6):
    # owner-scoped assess/answer/skip for ProfileGap facts (birthday first).
    post("/profile-gaps/assess", ProfileGapController, :assess)
    post("/profile-gaps/answer", ProfileGapController, :answer)
    post("/profile-gaps/skip", ProfileGapController, :skip)

    # Repair #18 B3 — circle check-in sweep: session-scoped create /
    # read / respond / close / withdraw + in-context suggestion surface.
    post("/checkins", CheckinController, :create)
    get("/checkins/for-source", CheckinController, :for_source)
    post("/checkins/suggest-dismiss", CheckinController, :dismiss_suggestion)
    get("/checkins/:id", CheckinController, :show)
    post("/checkins/:id/respond", CheckinController, :respond)
    post("/checkins/:id/close", CheckinController, :close)
    post("/checkins/:id/withdraw", CheckinController, :withdraw)

    # Phase RU-1 — relationship types (how you know each person)
    get("/relationships", RelationshipController, :index)
    put("/relationships/:contact_user_id", RelationshipController, :upsert)

    # Relationship Access Model — standing Graphing + multi-dim grants (Pass 2 locked)
    get("/relationship-access/graphing", RelationshipAccessController, :graphing_show)
    patch("/relationship-access/graphing", RelationshipAccessController, :graphing_update)
    post("/relationship-access/graphing/decide", RelationshipAccessController, :graphing_decide)
    get("/relationship-access/grants", RelationshipAccessController, :grants_index)
    post("/relationship-access/grants", RelationshipAccessController, :grants_upsert)
    delete("/relationship-access/grants/:id", RelationshipAccessController, :grants_revoke)
    post("/relationship-access/templates/apply", RelationshipAccessController, :apply_template)
    post("/relationship-access/templates/diff", RelationshipAccessController, :type_change_diff)
    post("/relationship-access/authorize", RelationshipAccessController, :authorize)

    # Phase RU-2 — progressive trust tiers
    get("/trust/tier", TrustController, :show)
    post("/trust/tier/grant", TrustController, :grant)
    post("/trust/tier/revoke", TrustController, :revoke)

    # Phase RU-3 — financial comfort (trusted+)
    get("/financial/profile", FinancialController, :show)
    put("/financial/profile", FinancialController, :upsert)
    delete("/financial/profile", FinancialController, :delete)

    # Phase 4 — bookings (Duffel / OpenTable; disabled without keys)
    post("/bookings/search", BookingController, :search)
    post("/bookings/confirm", BookingController, :confirm)
    post("/bookings/:id/cancel", BookingController, :cancel)
    get("/bookings/:id", BookingController, :show)

    # Phase 5 / Paste G Phase 7 — stored-value wallet (loads disabled without Stripe)
    get("/wallet", WalletController, :show)
    get("/wallet/transactions", WalletController, :transactions)
    post("/wallet/load", WalletController, :load)
    post("/wallet/checkout", WalletController, :checkout)
    patch("/wallet", WalletController, :update_threshold)

    # Paste G Phase 5 — contact birthday/anniversary sync (selected contacts only)
    post("/contacts/celebration-sync", ContactCelebrationController, :sync)

    # Paste G Phase 8 — user-command reminders (NOT AttentionBudget-gated)
    get("/reminders", ReminderController, :index)
    post("/reminders", ReminderController, :create)
    post("/reminders/:id/cancel", ReminderController, :cancel)

    # Repair #18 Division B (B4) — care rotation primitive
    get("/care-rotations", CareRotationController, :index)
    post("/care-rotations", CareRotationController, :create)
    get("/care-rotations/:id", CareRotationController, :show)
    post("/care-rotations/:id/accept", CareRotationController, :accept)
    post("/care-rotations/:id/decline", CareRotationController, :decline)
    post("/care-rotations/:id/members/:user_id/remove", CareRotationController, :remove_member)
    post("/care-rotations/:id/pause", CareRotationController, :pause)
    post("/care-rotations/:id/resume", CareRotationController, :resume)
    post("/care-rotations/:id/end", CareRotationController, :end_rotation)
    post("/care-rotations/:id/subject-link", CareRotationController, :propose_subject_link)
    post("/care-rotations/:id/subject-link/accept", CareRotationController, :accept_subject_link)
    post("/care-rotations/:id/subject-visible", CareRotationController, :set_subject_visible)

    post(
      "/care-rotations/:id/check-ins/:occurrence_key/complete",
      CareRotationController,
      :complete_check_in
    )

    post(
      "/care-rotations/:id/check-ins/:occurrence_key/pass",
      CareRotationController,
      :pass_check_in
    )

    # Repair #18 Division B (B5) — household pod + planning contexts
    get("/households", HouseholdController, :index)
    post("/households", HouseholdController, :create)
    get("/households/:id", HouseholdController, :show)
    post("/households/:id/accept", HouseholdController, :accept)
    post("/households/:id/decline", HouseholdController, :decline)
    post("/households/:id/leave", HouseholdController, :leave)
    post("/households/:id/primary", HouseholdController, :primary)
    post("/households/:id/supply-plan/accept", HouseholdController, :accept_supply)
    post("/households/:id/supply-plan/dismiss", HouseholdController, :dismiss_supply)
    post("/plans/from-context", HouseholdController, :create_plan_from_context)
    get("/context", HouseholdController, :context)
    get("/context/suggestion-order", HouseholdController, :suggestion_order)
    post("/context/proactive-opt-in", HouseholdController, :proactive_opt_in)

    # Paste G Phase 9 — shareable plan/trip HTML artifacts
    post("/artifacts", ArtifactController, :create)
    get("/artifacts", ArtifactController, :index)
    delete("/artifacts/:id", ArtifactController, :delete)

    # Paste G Phase 10 — cloud TTS voice notes + listen honesty
    post("/voice/speak", VoiceController, :speak)
    get("/voice/listen", VoiceController, :listen)
    get("/voice/status", VoiceController, :status)

    # Phase NE-1 — invite friends to join Opal
    get("/invites", ProductInviteController, :index)
    post("/invites", ProductInviteController, :create)
    # Adoption wave 2 (4.C4): personal invite codes + redemption.
    get("/invites/personal-code", ProductInviteController, :personal_code)
    post("/invites/redeem", ProductInviteController, :redeem_personal)
    post("/invites/:code/join", ProductInviteController, :join)

    # Phase OC-1 — Opal Center conversational shell (one conversation per user)
    get("/opal/conversation", OpalConversationController, :show)
    post("/opal/conversation/messages", OpalConversationController, :create_message)
    post("/opal/conversation/new", OpalConversationController, :new_chat)
    post("/opal/conversation/clear", OpalConversationController, :clear_conversation)
    # Repair #17 (W4-7) — Opal chat sessions: list + switch (owner-scoped).
    get("/opal/conversations", OpalConversationController, :list_sessions)
    # Repair #19 (W14 + Orbits) — scoped birth, anchor write, orbit
    # privacy flag, and real removal. Declared BEFORE the :id routes
    # so "scoped"/"orbit-private" are never captured as an id.
    post("/opal/conversations/scoped", OpalConversationController, :create_scoped_session)
    post("/opal/conversations/orbit-private", OpalConversationController, :set_orbit_private)
    # Repair #19 FIX-A (BS-02) — orbit unlock verification (the W7
    # graph-lock passcode, scoped to the caller's own orbits).
    post("/opal/conversations/orbit-verify", OpalConversationController, :verify_orbit_unlock)
    post("/opal/conversations/:id/anchor", OpalConversationController, :set_anchor)
    post("/opal/conversations/:id/remove", OpalConversationController, :remove_session)
    post("/opal/conversations/:id/pin", OpalConversationController, :set_pinned)
    post("/opal/conversations/:id/archive", OpalConversationController, :set_archived)
    post("/opal/conversations/:id/switch", OpalConversationController, :switch_session)
    # Repair #18 (G-IA3) - rename one of the caller's own Opal sessions.
    patch("/opal/conversations/:id", OpalConversationController, :rename_session)
    # Paste J Phase 1 — Center "Go with this" → durable solo SharedPlan
    post("/opal/plans", OpalConversationController, :create_plan)
    # F12-06/F12-07 — owner-scoped plan listing (incl. conversation-less Center
    # plans) for Graphs/Timeline projections.
    get("/opal/plans", OpalConversationController, :list_plans)
    # Repair #18 (Walk #4, W4-04) - edit one plan's title / core details
    # (lead-only, through the PlanTransition :edit gate).
    patch("/opal/plans/:id", OpalConversationController, :edit_plan)
    # Repair #18 fix wave - cancel one plan (lead/co_lead, creator
    # fallback, through the PlanTransition :cancel gate). This is the
    # HTTP route the C2 shell's "Drop it" intent was built against;
    # until now cancellation existed only at the gate / in Center chat.
    post("/opal/plans/:id/cancel", OpalConversationController, :cancel_plan)
    # I2 etiquette wiring - the P13/P14 write doors: set a creator
    # response window (relationship-gated in the machinery) and answer
    # a fork / escalation. Both answer with the one plan contract,
    # whose per-viewer etiquette projection carries the new truth.
    post("/opal/plans/:id/response-window", OpalConversationController, :set_response_window)
    post("/opal/plans/:id/etiquette/respond", OpalConversationController, :respond_etiquette)
    # Repair #16 (W1) — durable GraphCreateFlow completion (non-post graph
    # drafts) through the same SharedPlan authority as Center plans.
    post("/opal/plans/graph-create", OpalConversationController, :create_graph_plan)

    # Repair #18 adoption wave 1 - graph/people cluster (ST-A intentions,
    # ST-B ideas shelf, ST-G plan history, 4.C10 goals, 4.C1 holding).
    # Every action renders the one GraphPeople / PlanHistory projection.
    get("/graph/intentions", GraphPeopleController, :list_intentions)
    post("/graph/intentions", GraphPeopleController, :create_intention)
    delete("/graph/intentions/:id", GraphPeopleController, :delete_intention)
    post("/graph/intentions/:id/surfaced", GraphPeopleController, :surfaced_intention)
    get("/graph/goals", GraphPeopleController, :list_goals)
    post("/graph/goals", GraphPeopleController, :create_goal)
    delete("/graph/goals/:id", GraphPeopleController, :delete_goal)
    post("/graph/goals/:id/link", GraphPeopleController, :link_goal)
    post("/graph/goals/:id/unlink", GraphPeopleController, :unlink_goal)
    get("/graph/shelf", GraphPeopleController, :shelf)
    post("/graph/shelf/:plan_id/promote", GraphPeopleController, :promote_spark)
    get("/opal/plans/:id/history", GraphPeopleController, :plan_history)
    get("/opal/holding", GraphPeopleController, :holding)
    # Repair #19 W7 - private graphs + living detail backbone.
    post("/opal/plans/:id/private", GraphPeopleController, :set_plan_private)
    post("/opal/plans/:id/location-share", GraphPeopleController, :share_plan_location)
    delete("/opal/plans/:id/location-share", GraphPeopleController, :stop_plan_location)
    get("/opal/graph-lock", GraphPeopleController, :graph_lock_status)
    post("/opal/graph-lock", GraphPeopleController, :set_graph_lock)
    post("/opal/graph-lock/verify", GraphPeopleController, :verify_graph_lock)
    post("/opal/graph-lock/biometric", GraphPeopleController, :set_graph_lock_biometric)

    # Repair #12 (F12-11c) — Center coarse device coords (user-granted), for
    # venue ranking / near-me. Separate from the travel-mode 422 privacy law.
    post("/opal/location", CenterLocationController, :update)

    get("/social-moments/media-status", SocialMomentController, :media_status)
    post("/social-moments/media", SocialMomentController, :upload_media)
    get("/social-moments/media/:media_id", SocialMomentController, :media)
    post("/social-moments/audience-preview", SocialMomentController, :audience_preview)
    get("/social-moments/mine", SocialMomentController, :mine)
    get("/social-moments", SocialMomentController, :index)
    post("/social-moments", SocialMomentController, :create)
    get("/social-moments/:id", SocialMomentController, :show)
    patch("/social-moments/:id", SocialMomentController, :update)
    delete("/social-moments/:id", SocialMomentController, :delete)
    post("/social-moments/:id/hide", SocialMomentController, :hide)
    post("/social-moments/:id/report", SocialMomentController, :report)
    put("/social-moments/:id/like", SocialMomentController, :like)
    delete("/social-moments/:id/like", SocialMomentController, :unlike)
    get("/social-moments/:id/light", SocialMomentController, :light)
    get("/social-moments/:id/comments", SocialMomentController, :comments)
    post("/social-moments/:id/comments", SocialMomentController, :create_comment)
    put("/social-moments/:id/repost", SocialMomentController, :repost)
    delete("/social-moments/:id/repost", SocialMomentController, :unrepost)
    put("/social-moments/:id/save", SocialMomentController, :save)
    delete("/social-moments/:id/save", SocialMomentController, :unsave)
    get("/saved", SocialMomentController, :list_saved)

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

    # Paste K — Lives (placed-only) · stickers · venue verification · Opal Pay
    get("/lives/go-live-copy", LivesController, :go_live_copy)
    get("/lives/stickers", LivesController, :catalog)
    get("/lives/venue-search", LivesController, :venue_search)
    get("/lives/visible", LivesController, :visible)
    get("/lives/mine", LivesController, :mine)
    post("/lives/go-live", LivesController, :go_live)
    get("/lives/:id", LivesController, :show)
    post("/lives/:id/end", LivesController, :end_live)
    post("/lives/:id/report-presence", LivesController, :report_presence)
    post("/lives/:id/stickers", LivesController, :send_sticker)
    get("/venues/:id", LivesController, :venue_show)
    get("/venues/:id/qr", LivesController, :venue_qr)
    get("/venues/:id/contributors", LivesController, :contributors)
    post("/venues/:id/rewards", LivesController, :reward)
    post("/venues/pay", LivesController, :venue_pay)
    post("/venues/presence-scan", LivesController, :scan_presence)
    get("/me/venue-streaks", LivesController, :streaks)
  end

  # Legacy/dev routes (DevAuth) — not product login
  scope "/api/v1", OpalCoreWeb do
    pipe_through([:api, :dev_auth])

    post("/messages/preview", MessageController, :preview)
    post("/messages", MessageController, :create)
    post("/messages/:message_id/ai-jobs", MessageController, :create_ai_job)
    get("/ai-jobs/:job_id", AiJobController, :show)

    get("/dev/events", DevProbeController, :events)
    post("/dev/events/reset", DevProbeController, :reset_events)
    get("/dev/client-info", DevProbeController, :client_info)
    # Repair #18 staging seams (dev_auth only)
    post("/dev/clock", DevProbeController, :set_clock)
    post("/dev/temporal-tick", DevProbeController, :temporal_tick)
    post("/dev/context-sweep", DevProbeController, :context_sweep)
    post("/dev/maturity", DevProbeController, :set_maturity)
  end
end
