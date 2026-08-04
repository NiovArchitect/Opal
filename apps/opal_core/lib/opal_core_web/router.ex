defmodule OpalCoreWeb.Router do
  use OpalCoreWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :dev_auth do
    plug OpalCoreWeb.Plugs.DevAuth
  end

  pipeline :product_auth do
    plug OpalCoreWeb.Plugs.ProductAuth
  end

  scope "/", OpalCoreWeb do
    pipe_through :api
    get "/health", HealthController, :show
  end

  # Product surface (SF15) — session-backed. Synthetic SMS provider only.
  scope "/api/v1/product", OpalCoreWeb do
    pipe_through :api

    post "/activation/challenges", ActivationController, :start_challenge
    post "/activation/verify", ActivationController, :verify
    # Bounded invite preview by opaque share token (no session, no phone in URL).
    get "/invitations/share/:token", InvitationController, :preview_share
  end

  scope "/api/v1/product", OpalCoreWeb do
    pipe_through [:api, :product_auth]

    get "/session", SessionController, :show
    delete "/session", SessionController, :delete
    post "/socket-ticket", SessionController, :socket_ticket

    post "/contacts/resolve", ContactController, :resolve

    post "/invitations", InvitationController, :create
    get "/invitations/incoming", InvitationController, :incoming
    get "/invitations/outgoing", InvitationController, :outgoing
    get "/people", InvitationController, :people
    get "/invitations/:id", InvitationController, :show
    post "/invitations/:id/accept", InvitationController, :accept
    post "/invitations/:id/decline", InvitationController, :decline

    get "/conversations", ConversationController, :index
    get "/conversations/:id/messages", ConversationController, :messages
    post "/conversations/:id/messages", ConversationController, :create_message
    post "/conversations/:id/block", ConversationController, :block_peer
  end

  # Legacy/dev routes (DevAuth) — not product login
  scope "/api/v1", OpalCoreWeb do
    pipe_through [:api, :dev_auth]

    post "/messages", MessageController, :create
    post "/messages/:message_id/ai-jobs", MessageController, :create_ai_job
    get "/ai-jobs/:job_id", AiJobController, :show

    get "/dev/events", DevProbeController, :events
    post "/dev/events/reset", DevProbeController, :reset_events
    get "/dev/client-info", DevProbeController, :client_info
  end
end
