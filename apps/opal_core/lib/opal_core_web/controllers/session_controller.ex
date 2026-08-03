defmodule OpalCoreWeb.SessionController do
  use OpalCoreWeb, :controller

  alias OpalCore.Auth.ProductSession

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
      "provider" => "synthetic_development"
    })
  end

  def delete(conn, _params) do
    user_id = conn.assigns.current_user_id
    session = conn.assigns.current_session

    case ProductSession.revoke_by_ids(user_id, session.id) do
      {:ok, _} ->
        json(conn, %{"signed_out" => true})

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "sign_out_failed", "message" => inspect(reason)})
    end
  end
end
