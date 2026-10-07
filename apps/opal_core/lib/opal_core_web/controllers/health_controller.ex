defmodule OpalCoreWeb.HealthController do
  use OpalCoreWeb, :controller

  def show(conn, _params) do
    db_ok? =
      try do
        Ecto.Adapters.SQL.query!(OpalCore.Repo, "SELECT 1", [])
        true
      rescue
        _ -> false
      end

    status = if db_ok?, do: "ok", else: "degraded"
    code = if db_ok?, do: 200, else: 503

    conn
    |> put_status(code)
    |> json(%{
      "status" => status,
      "service" => "opal_core",
      "schema_version" => "0.1.0",
      "db" => if(db_ok?, do: "up", else: "down"),
      "sentry_configured" => OpalCore.Observability.Sentry.configured?(),
      "phone_verify_mode" =>
        to_string(OpalCore.SocialFlow.PhoneVerification.Provider.mode())
    })
  end
end
