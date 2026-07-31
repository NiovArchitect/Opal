defmodule OpalCoreWeb.DevProbeController do
  use OpalCoreWeb, :controller

  alias OpalCore.AI.EventProbe
  alias OpalCore.Fixtures

  def events(conn, _params) do
    if EventProbe.enabled?() do
      # Ensure probe is subscribed to seeded synthetic user topics.
      EventProbe.subscribe_user(Fixtures.user_alex_id())
      EventProbe.subscribe_user(Fixtures.user_jordan_id())
      EventProbe.subscribe_user(Fixtures.user_taylor_id())

      json(conn, %{
        "enabled" => true,
        "events" => EventProbe.events(),
        "ai_client" => inspect(Application.get_env(:opal_core, :ai_client))
      })
    else
      conn
      |> put_status(404)
      |> json(%{"error_code" => "not_found", "message" => "event probe disabled"})
    end
  end

  def reset_events(conn, _params) do
    if EventProbe.enabled?() do
      EventProbe.reset()
      json(conn, %{"ok" => true})
    else
      conn
      |> put_status(404)
      |> json(%{"error_code" => "not_found", "message" => "event probe disabled"})
    end
  end

  def client_info(conn, _params) do
    json(conn, %{
      "ai_client" => inspect(Application.get_env(:opal_core, :ai_client)),
      "ai_service_url" => Application.get_env(:opal_core, :ai_service_url),
      "dev_auth_enabled" => Application.get_env(:opal_core, :dev_auth_enabled, false),
      "event_probe_enabled" => Application.get_env(:opal_core, :event_probe_enabled, false)
    })
  end
end
