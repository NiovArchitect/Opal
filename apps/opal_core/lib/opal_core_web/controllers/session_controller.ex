defmodule OpalCoreWeb.SessionController do
  use OpalCoreWeb, :controller

  alias OpalCore.Auth.ProductSession
  alias OpalCoreWeb.Plugs.SessionCookie

  def show(conn, _params) do
    user = conn.assigns.current_user
    session = conn.assigns.current_session

    json(conn, %{
      "user" => ProductSession.public_user(user),
      "session" => %{
        "id" => session.id,
        "device_label" => session.device_label,
        "platform" => session.platform,
        "status" => session.status
      },
      "provider" => "synthetic_development",
      "auth_mode" => to_string(conn.assigns[:auth_mode] || :unknown)
    })
  end

  def delete(conn, _params) do
    user_id = conn.assigns.current_user_id
    session = conn.assigns.current_session

    case ProductSession.revoke_by_ids(user_id, session.id) do
      {:ok, _} ->
        conn
        |> SessionCookie.clear_session_cookies()
        |> json(%{"signed_out" => true})

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "sign_out_failed", "message" => inspect(reason)})
    end
  end

  def socket_ticket(conn, _params) do
    session = conn.assigns.current_session

    case ProductSession.issue_socket_ticket(session) do
      {:ok, ticket} ->
        json(conn, %{
          "ticket" => ticket.ticket,
          "expires_in" => ticket.expires_in
        })

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "ticket_failed", "message" => inspect(reason)})
    end
  end
end
