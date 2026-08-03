defmodule OpalCoreWeb.Plugs.ProductAuth do
  @moduledoc """
  Authenticates product API requests via Bearer session token.
  """

  import Plug.Conn

  alias OpalCore.Auth.ProductSession

  def init(opts), do: opts

  def call(conn, _opts) do
    case bearer_token(conn) do
      nil ->
        unauthorized(conn, "auth_required", "Sign in required")

      token ->
        case ProductSession.authenticate(token) do
          {:ok, %{user_id: user_id, user: user, session: session}} ->
            conn
            |> assign(:current_user_id, user_id)
            |> assign(:current_user, user)
            |> assign(:current_session, session)
            |> assign(:access_token, token)

          {:error, reason} ->
            unauthorized(conn, to_string(reason), "Session is not valid")
        end
    end
  end

  def bearer_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> String.trim(token)
      _ -> nil
    end
  end

  defp unauthorized(conn, code, message) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, Jason.encode!(%{"error_code" => code, "message" => message}))
    |> halt()
  end
end
