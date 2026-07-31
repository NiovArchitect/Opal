defmodule OpalCoreWeb.Router do
  use OpalCoreWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :dev_auth do
    plug OpalCoreWeb.Plugs.DevAuth
  end

  scope "/", OpalCoreWeb do
    pipe_through :api
    get "/health", HealthController, :show
  end

  scope "/api/v1", OpalCoreWeb do
    pipe_through [:api, :dev_auth]

    post "/messages", MessageController, :create
    post "/messages/:message_id/ai-jobs", MessageController, :create_ai_job
    get "/ai-jobs/:job_id", AiJobController, :show
  end
end
