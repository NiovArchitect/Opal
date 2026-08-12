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
    post("/socket-ticket", SessionController, :socket_ticket)

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
    post("/conversations/group", ConversationController, :create_group)
    get("/conversations/:id/messages", ConversationController, :messages)
    post("/conversations/:id/messages", ConversationController, :create_message)
    post("/conversations/:id/members", ConversationController, :add_member)
    post("/conversations/:id/block", ConversationController, :block_peer)

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
