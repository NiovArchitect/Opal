defmodule OpalCoreWeb.PresenceController do
  use OpalCoreWeb, :controller

  alias OpalCore.Push.NotificationIntelligence

  @doc "FE heartbeat — marks user active in-app so normal pushes stay in-app only."
  def heartbeat(conn, _params) do
    user_id = conn.assigns.current_user_id
    _ = NotificationIntelligence.touch_active(user_id)
    json(conn, %{"ok" => true, "active" => true})
  end
end
