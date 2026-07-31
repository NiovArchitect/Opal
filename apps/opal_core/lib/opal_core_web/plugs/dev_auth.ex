defmodule OpalCoreWeb.Plugs.DevAuth do
  @moduledoc """
  Synthetic development authentication.

  Enabled only when `:dev_auth_enabled` is true (dev/test).
  Production config must leave this disabled.
  """

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    if Application.get_env(:opal_core, :dev_auth_enabled, false) do
      case get_req_header(conn, "x-opal-dev-user-id") do
        [user_id] when byte_size(user_id) > 0 ->
          assign(conn, :current_user_id, user_id)

        _ ->
          conn
          |> put_resp_content_type("application/json")
          |> send_resp(
            401,
            Jason.encode!(%{
              "error_code" => "dev_auth_required",
              "message" => "X-Opal-Dev-User-Id header required in development"
            })
          )
          |> halt()
      end
    else
      conn
      |> put_resp_content_type("application/json")
      |> send_resp(
        401,
        Jason.encode!(%{"error_code" => "auth_required", "message" => "Unauthorized"})
      )
      |> halt()
    end
  end
end
