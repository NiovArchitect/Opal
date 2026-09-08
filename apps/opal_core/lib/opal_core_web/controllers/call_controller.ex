defmodule OpalCoreWeb.CallController do
  use OpalCoreWeb, :controller

  alias OpalCore.Calls

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case Calls.invite(user_id, params) do
      {:ok, session} ->
        conn
        |> put_status(201)
        |> json(%{"call" => public(session)})

      {:error, :invalid_callee} ->
        error(conn, 422, "invalid_callee", "Choose someone to call")

      {:error, :cannot_call_self} ->
        error(conn, 422, "cannot_call_self", "You can’t call yourself")

      {:error, reason} ->
        error(conn, 422, "call_failed", to_string(reason))
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Calls.get(id, user_id) do
      {:ok, session} -> json(conn, %{"call" => public(session)})
      {:error, :not_found} -> error(conn, 404, "not_found", "Call not found")
      {:error, :forbidden} -> error(conn, 403, "forbidden", "Not a participant")
    end
  end

  def answer(conn, %{"id" => id}) do
    transition(conn, id, &Calls.answer/2)
  end

  def decline(conn, %{"id" => id}) do
    transition(conn, id, &Calls.decline/2)
  end

  def cancel(conn, %{"id" => id}) do
    transition(conn, id, &Calls.cancel/2)
  end

  def hangup(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    reason = params["reason"] || "hangup"

    case Calls.end_call_session(id, user_id, reason) do
      {:ok, session} -> json(conn, %{"call" => public(session)})
      {:error, :not_found} -> error(conn, 404, "not_found", "Call not found")
      {:error, :forbidden} -> error(conn, 403, "forbidden", "Not a participant")
      {:error, :invalid_state} -> error(conn, 409, "invalid_state", "Call can’t be ended from this state")
      {:error, reason} -> error(conn, 422, "call_failed", to_string(reason))
    end
  end

  defp transition(conn, id, fun) do
    user_id = conn.assigns.current_user_id

    case fun.(id, user_id) do
      {:ok, session} -> json(conn, %{"call" => public(session)})
      {:error, :not_found} -> error(conn, 404, "not_found", "Call not found")
      {:error, :forbidden} -> error(conn, 403, "forbidden", "Not allowed")
      {:error, :invalid_state} -> error(conn, 409, "invalid_state", "Call state doesn’t allow that")
      {:error, reason} -> error(conn, 422, "call_failed", to_string(reason))
    end
  end

  defp public(s) do
    %{
      "id" => s.id,
      "caller_user_id" => s.caller_user_id,
      "callee_user_id" => s.callee_user_id,
      "conversation_id" => s.conversation_id,
      "status" => s.status,
      "ended_reason" => s.ended_reason,
      "correlation_id" => s.correlation_id,
      "ringing_at" => s.ringing_at,
      "answered_at" => s.answered_at,
      "ended_at" => s.ended_at
    }
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error" => %{"code" => code, "message" => message}})
  end
end
