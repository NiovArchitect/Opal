defmodule OpalCoreWeb.HealthController do
  use OpalCoreWeb, :controller

  def show(conn, _params) do
    json(conn, %{
      "status" => "ok",
      "service" => "opal_core",
      "schema_version" => "0.1.0"
    })
  end
end
