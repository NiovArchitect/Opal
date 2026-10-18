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
      # Repair #18 BS-5: configured? only means a DSN string exists.
      # sentry_reporting is the delivery truth ("not_configured" |
      # "not_wired" | "delivering") so a set DSN can no longer read
      # as healthy while reports go nowhere.
      "sentry_reporting" => to_string(OpalCore.Observability.Sentry.reporting_status()),
      "phone_verify_mode" =>
        to_string(OpalCore.SocialFlow.PhoneVerification.Provider.mode())
    })
  end
end
