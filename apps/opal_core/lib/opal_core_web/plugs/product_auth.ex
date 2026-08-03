defmodule OpalCoreWeb.Plugs.ProductAuth do
  @moduledoc """
  Authenticates product API via HttpOnly cookie or Bearer token.
  When cookie auth is used, CSRF is required for unsafe methods.
  """

  import Plug.Conn

  alias OpalCore.Auth.ProductSession

  @unsafe ~w(POST PUT PATCH DELETE)

  def init(opts), do: opts

  def call(conn, _opts) do
    case extract_token(conn) do
      {nil, _} ->
        unauthorized(conn, "auth_required", "Sign in required")

      {token, :cookie} ->
        if csrf_ok?(conn) do
          authenticate(conn, token, :cookie)
        else
          unauthorized(conn, "csrf_invalid", "CSRF token missing or invalid")
        end

      {token, :bearer} ->
        authenticate(conn, token, :bearer)
    end
  end

  def extract_token(conn) do
    case bearer_token(conn) do
      token when is_binary(token) and token != "" ->
        {token, :bearer}

      _ ->
        case conn.req_cookies[ProductSession.cookie_name()] do
          token when is_binary(token) and token != "" -> {token, :cookie}
          _ -> {nil, :none}
        end
    end
  end

  defp authenticate(conn, token, mode) do
    case ProductSession.authenticate(token) do
      {:ok, %{user_id: user_id, user: user, session: session}} ->
        conn
        |> assign(:current_user_id, user_id)
        |> assign(:current_user, user)
        |> assign(:current_session, session)
        |> assign(:access_token, token)
        |> assign(:auth_mode, mode)

      {:error, reason} ->
        unauthorized(conn, to_string(reason), "Session is not valid")
    end
  end

  def bearer_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> String.trim(token)
      _ -> nil
    end
  end

  defp csrf_ok?(conn) do
    if conn.method in @unsafe do
      header = conn |> get_req_header("x-csrf-token") |> List.first()
      cookie = conn.req_cookies[ProductSession.csrf_cookie_name()]
      is_binary(header) and is_binary(cookie) and header != "" and header == cookie
    else
      true
    end
  end

  defp unauthorized(conn, code, message) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, Jason.encode!(%{"error_code" => code, "message" => message}))
    |> halt()
  end
end
